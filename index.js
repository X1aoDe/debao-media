/**
 * @local/debao-media — Host half.
 *
 * 界面与业务逻辑都在 client.js（浏览器端）。这里只做一件事：
 * 把「文案生成」接到 DSH 自己的模型服务上（ctx.llm），用的是当前环境里
 * 已登录/已配置的那个模型（deepseek-account / deepseek-flash），
 * 所以用户不需要再单独填 DeepSeek 的 API key。
 *
 * 注册两条本机路由（由 DSH 自己的 web 服务托管，和界面同源）：
 *   GET  /debao/gen/status  → { ok, llm, provider, model }
 *   POST /debao/gen         → text/event-stream：data: {"delta":"…"} … data: {"done":true}
 *
 * 桥（bridge/text.mjs）发现这条路由可用时，文案就走它；不可用则回落到
 * ARK（豆包）或用户自己填的 DeepSeek key。视频画面解析始终走 ARK。
 */
import { appendFileSync } from 'node:fs'

export const name = 'dsh-debao-media'

/** 需要 llm（模型）与 webServer（挂路由）两个服务。 */
export const inject = ['llm', 'webServer']

const ROUTE_STATUS = '/debao/gen/status'
const ROUTE_GEN = '/debao/gen'
const LOG = process.env.DEBAO_HOST_LOG || ''

function log(msg) {
  if (!LOG) return
  try {
    appendFileSync(LOG, '[' + new Date().toISOString() + '] ' + msg + '\n')
  } catch {
    /* 日志失败不影响功能 */
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 4 * 1024 * 1024) {
        reject(new Error('请求体太大'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (!text.trim()) return resolve({})
      try {
        resolve(JSON.parse(text))
      } catch (e) {
        reject(new Error('invalid json: ' + e.message))
      }
    })
    req.on('error', reject)
  })
}

/** 把 ctx.llm.stream 的事件压平成纯文本增量（推理块丢掉）。 */
function textOf(ev) {
  if (!ev || typeof ev !== 'object') return ''
  if (typeof ev.text !== 'string') return ''
  if (ev.type === 'text-delta') return ev.text
  if (ev.type === 'content-delta') return ev.text
  if (ev.type === 'block-delta' && ev.blockType === 'text') return ev.text
  return ''
}

export function apply(ctx) {
  const llm = ctx.llm
  const ws = ctx.webServer
  if (!ws || typeof ws.register !== 'function') {
    log('no webServer.register — skip routes')
    return
  }

  const disposers = []
  const hasLlm = !!llm && typeof llm.stream === 'function'

  try {
    disposers.push(
      ws.register({
        method: 'GET',
        path: ROUTE_STATUS,
        handler: (req, res) => {
          res.statusCode = 200
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          res.end(
            JSON.stringify({
              ok: hasLlm,
              llm: hasLlm,
              provider: 'deepseek-account',
              model: 'deepseek-flash',
            }),
          )
        },
      }),
    )
    log('registered ' + ROUTE_STATUS + ' (llm=' + hasLlm + ')')
  } catch (e) {
    log('status route failed: ' + (e && e.message))
  }

  if (hasLlm) {
    try {
      disposers.push(
        ws.register({
          method: 'POST',
          path: ROUTE_GEN,
          handler: async (req, res) => {
            let body = {}
            try {
              body = await readBody(req)
            } catch (e) {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: false, error: e.message }))
              return
            }

            res.statusCode = 200
            res.setHeader('content-type', 'text/event-stream; charset=utf-8')
            res.setHeader('cache-control', 'no-cache, no-transform')
            res.setHeader('connection', 'keep-alive')
            res.setHeader('x-accel-buffering', 'no')
            if (typeof res.flushHeaders === 'function') res.flushHeaders()

            const send = (obj) => {
              try {
                res.write('data: ' + JSON.stringify(obj) + '\n\n')
              } catch {
                /* 客户端已断开 */
              }
            }

            const messages = []
            if (body.system) messages.push({ role: 'system', content: [{ type: 'text', text: String(body.system) }] })
            messages.push({ role: 'user', content: [{ type: 'text', text: String(body.prompt || '') }] })

            const request = {
              provider: 'deepseek-account',
              model: 'deepseek-flash',
              messages,
            }
            if (body.maxTokens) request.maxTokens = Math.max(64, Math.min(Number(body.maxTokens) || 0, 8000))
            if (typeof body.temperature === 'number') request.temperature = body.temperature

            send({ open: true, provider: request.provider, model: request.model })
            const t0 = Date.now()
            let full = ''
            let usage = null
            let closed = false
            req.on('close', () => {
              closed = true
            })

            try {
              for await (const ev of llm.stream(request)) {
                if (closed) break
                if (ev && ev.type === 'finish') {
                  if (ev.usage) usage = ev.usage
                  const reason = ev.reason || {}
                  if (reason.kind === 'error') {
                    send({ error: (reason.failure && reason.failure.message) || 'model error' })
                  }
                  continue
                }
                const delta = textOf(ev)
                if (delta) {
                  full += delta
                  send({ delta })
                }
              }
              if (!closed) {
                send({
                  done: true,
                  text: full,
                  usage,
                  ms: Date.now() - t0,
                  provider: request.provider,
                  model: request.model,
                })
              }
            } catch (e) {
              if (!closed) send({ error: (e && (e.message || String(e))) || 'unknown error' })
            } finally {
              try {
                res.end()
              } catch {
                /* ignore */
              }
            }
          },
        }),
      )
      log('registered ' + ROUTE_GEN)
    } catch (e) {
      log('gen route failed: ' + (e && e.message))
    }
  }

  if (typeof ctx.on === 'function' && disposers.length) {
    ctx.on('dispose', () => {
      for (const d of disposers) {
        try {
          if (typeof d === 'function') d()
        } catch {
          /* ignore */
        }
      }
    })
  }
}
