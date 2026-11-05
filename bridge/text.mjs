/* 文本生成：文案/思考走 DeepSeek（有 key 时），没有就退回豆包（ARK）。都支持流式。
   - key 解析顺序：DEBAO_TEXT_PROVIDER 显式指定 → DEEPSEEK_API_KEY / DEEPSEEK_KEY / DS_API_KEY
     → bridge/data/deepseek.key → 注册表 HKCU\Environment → 都没有则回豆包。
   - 视觉/音频仍然走豆包（见 analyze.mjs），这里只管文本。 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveKey as resolveArkKey } from './analyze.mjs'
/* 本机「自媒体知识库」（plugins/zimeiti-kb）：每次生成前按简报检索 3 段方法论拼进 system。
   桌面版里知识库被复制到 plugin/bridge/kb，所以两条路都试；都没有就自动降级（不影响生成）。 */
let kbSearch = null
for (const rel of ['../../zimeiti-kb/kb.js', './kb/kb.js']) {
  try {
    const mod = await import(new URL(rel, import.meta.url).href)
    if (typeof mod.search === 'function') {
      kbSearch = mod.search
      break
    }
  } catch {
    /* 换下一条 */
  }
}

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DS_KEY_FILE = process.env.DEBAO_DATA_DIR
  ? path.join(path.resolve(process.env.DEBAO_DATA_DIR), 'deepseek.key')
  : path.join(HERE, 'data', 'deepseek.key')

const ARK_BASE = process.env.DEBAO_ARK_BASE || 'https://ark.cn-beijing.volces.com/api/v3'
export const TEXT_MODEL = process.env.DEBAO_TEXT_MODEL || 'doubao-seed-2-1-lite-260915'

const DS_BASE = process.env.DEBAO_DEEPSEEK_BASE || 'https://api.deepseek.com'
export const DS_MODEL = process.env.DEBAO_DEEPSEEK_MODEL || 'deepseek-chat'

/* ---------- DSH 环境内的模型（走插件 host 半注册的 /debao/gen，不需要 key） ---------- */
export function hostBaseOf(opt = {}) {
  const raw = String(opt.hostBase || process.env.DEBAO_HOST_BASE || '').trim()
  return raw ? raw.replace(/\/+$/, '') : ''
}

async function hostAlive(base) {
  if (!base) return false
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 2500)
    const res = await fetch(base + '/debao/gen/status', { signal: ctl.signal })
    clearTimeout(timer)
    if (!res.ok) return false
    const j = await res.json()
    return !!(j && j.ok)
  } catch {
    return false
  }
}

/* 走 host 半的流式生成。onDelta 为空时也返回完整文本。 */
async function hostGenerate(base, prompt, opt, kbBlock, onDelta) {
  const system = (opt.system || SYSTEM) + kbBlock
  const payload = { prompt, system }
  if (opt.maxTokens) payload.maxTokens = opt.maxTokens
  if (typeof opt.temperature === 'number') payload.temperature = opt.temperature
  const t0 = Date.now()
  const res = await fetch(base + '/debao/gen', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    throw new Error('环境内模型返回 ' + res.status + ' ' + String(raw).slice(0, 160))
  }
  let full = ''
  let usage = null
  let model = 'deepseek-flash'
  let provider = 'deepseek-account'
  let failure = ''
  let buf = ''
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  const handle = (payload) => {
    let j = null
    try {
      j = JSON.parse(payload)
    } catch {
      return
    }
    if (j.error) failure = String(j.error)
    if (j.model) model = j.model
    if (j.provider) provider = j.provider
    if (j.usage) usage = j.usage
    if (j.delta) {
      full += j.delta
      if (onDelta) onDelta(j.delta, full)
    }
  }
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '')
      buf = buf.slice(idx + 1)
      if (!line.startsWith('data:')) continue
      handle(line.slice(5).trim())
    }
  }
  if (failure) throw new Error('环境内模型报错：' + failure)
  return { text: full.trim(), usage, ms: Date.now() - t0, model, provider, viaHost: true }
}

/* ---------- DeepSeek key ---------- */
function resolveDeepseekKey() {
  for (const k of ['DEBAO_DEEPSEEK_KEY', 'DEEPSEEK_API_KEY', 'DEEPSEEK_KEY', 'DS_API_KEY']) {
    const v = (process.env[k] || '').trim()
    if (v) return { key: v, from: 'env' }
  }
  try {
    if (existsSync(DS_KEY_FILE)) {
      const v = readFileSync(DS_KEY_FILE, 'utf8').split('\n')[0].trim()
      if (v) return { key: v, from: 'file' }
    }
  } catch {
    /* ignore */
  }
  for (const n of ['DEEPSEEK_API_KEY', 'DEEPSEEK_KEY', 'DS_API_KEY']) {
    try {
      const out = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', n], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 4000,
      })
      const m = /REG_(?:SZ|EXPAND_SZ)\s+(.+)/.exec(out)
      if (m && m[1].trim()) return { key: m[1].trim(), from: 'user-env' }
    } catch {
      /* ignore */
    }
  }
  return { key: '', from: '' }
}

/* 当前用哪个模型写文本 */
export function textProvider() {
  const forced = (process.env.DEBAO_TEXT_PROVIDER || '').toLowerCase()
  const ds = resolveDeepseekKey()
  if (forced === 'ark') {
    const a = resolveArkKey()
    return { provider: 'ark', model: TEXT_MODEL, key: a.key || '', from: a.from || '' }
  }
  if (ds.key) return { provider: 'deepseek', model: DS_MODEL, key: ds.key, from: ds.from }
  const a = resolveArkKey()
  return { provider: 'ark', model: TEXT_MODEL, key: a.key || '', from: a.from || '' }
}

const SYSTEM = [
  '你是德饱的资深内容编导，服务一个中文自媒体创作者（小红书 + 抖音，摄影师 / 摄影教学方向）。',
  '',
  '你的判断必须走下面这套方法论（来自 IMA 知识库「人类最强编导」课程体系 + 本机自媒体知识库），不要用泛泛的"爆款技巧"：',
  '',
  '【A 三条命题】内容是用户任务的解法；自媒体是"他媒体"，从用户任务出发而不是从表达欲出发；视频是产品，要有用户、需求、形式、交付、反馈闭环。',
  '',
  '【B 爆款四必要条件】低理解成本、大群体链接、满足核心需求（情绪或信息）、产生互动动机。判断时逐条给「成立 / 偏弱 / 不成立」并说证据，不要一律打高分。',
  '',
  '【C 三种内容路径】',
  '- 万古同悲：调用共享情感记忆。脚本＝具体场景→说不出口的感受→共同处境→意义转折→行动出口。强度来自准确命名，不来自煽情词。',
  '- 惊世骇俗：稀缺硬素材（事件本身的规模、风险、反常）。靠证据和边界立住，不夸大。',
  '- 打破节奏：快中慢 / 繁中简 / 闹中静。一次只选一个反差维度，而且必须服务信息；形式差异不能掩盖价值不足。',
  '',
  '【D 选题公式】用户任务 ∩ 自身资源 ∩ 平台消费场景 ∩ 可持续供给。用户任务要写成：当【情境】时，【谁】想从【原状态】到【目标状态】，但被【阻碍】卡住。',
  '',
  '【E 生产】先有任务单：目标用户与情境、看完的变化、首要目标（播放/关注/信任/转化）、平台入口、主要路径、核心主张、证据状态、系列归属、本次唯一变量。结构按类型选：',
  '- 知识口播：用户问题→核心判断→2-4 个理由或步骤→证据/例子→反例与边界→下一步。',
  '- 案例复盘：结果与口径→起点与约束→关键选择→执行过程→数据→替代解释→可复用与不可复制。',
  '- 人物/VLOG：目标→阻碍→选择→关系→变化→余波。',
  '',
  '【F 复盘】沿行为链找第一个明显弱点：曝光→进入→观看→互动→主页→关注→转化。每个现象至少给两个替代解释，下一轮只改一个变量。',
  '',
  '【G 证据纪律】区分「原文主张 / 外部验证 / 分析推论」。数字必须带口径（总体、分母、时间、来源）；不确定就写"未核实"，绝不为顺口编数据。',
  '',
  '输出纪律：直接给成品，不要"好的/以下是"开场；严格按简报的章节与顺序，标题用 Markdown 的 ## / ###；需要表格时用 Markdown 表格；具体到能照着做（给句子、给秒数、给替换清单）；中文标点，不堆 emoji，不用"赋能/闭环/抓手"这类词；简报要求 JSON 就只输出 JSON；信息不足时先用一行写「缺什么」，再按现有信息给最可用的版本。',
].join('\n')

function headers(key) {
  return { 'content-type': 'application/json', authorization: 'Bearer ' + key }
}

/* 从知识库检索与本次简报最相关的 3 段方法论。 */
function kbParts(prompt, limit = 3, noKb = false) {
  if (noKb || process.env.DEBAO_KB === '0' || !kbSearch) return { block: '', hits: [] }
  try {
    const q = String(prompt || '').replace(/\s+/g, ' ').slice(0, 320)
    if (!q.trim()) return { block: '', hits: [] }
    const { hits } = kbSearch(q, { corpus: 'playbook', limit })
    if (!hits.length) return { block: '', hits: [] }
    const blockBody = hits
      .map((h) => `- 【${h.doc}${h.section ? ' › ' + h.section : ''}】${h.snippet}`)
      .join('\n')
    return {
      block:
        '\n\n【本机知识库检索到的相关方法论（从过往课程蒸馏，结构与口径优先照它写；与上文冲突时以上文为准）】\n' +
        blockBody,
      hits: hits.map((h) => ({
        file: String(h.ref || '').split(':').slice(1).join(':').replace(/\.md$/, ''),
        doc: h.doc,
        section: h.section || '',
        snippet: String(h.snippet || '').slice(0, 160),
        score: h.score || 0,
      })),
    }
  } catch {
    return { block: '', hits: [] }
  }
}

function endpoint(provider) {
  return provider === 'deepseek' ? DS_BASE + '/chat/completions' : ARK_BASE + '/chat/completions'
}

function body(prompt, opt, tp) {
  const payload = {
    model: opt.model || tp.model,
    messages: [
      { role: 'system', content: (opt.system || SYSTEM) + (opt.kbBlock || '') },
      { role: 'user', content: prompt },
    ],
    temperature: typeof opt.temperature === 'number' ? opt.temperature : 0.7,
    max_tokens: opt.maxTokens || 3000,
    stream: !!opt.stream,
  }
  /* 豆包 2-1 默认「思考模式」，写文案会先烧 1-2k 推理 token（20-40 秒）。
     关掉之后同一句话 2 秒出结果、便宜 1/50。要开回来：DEBAO_TEXT_THINK=1 */
  if (tp.provider === 'ark' && !process.env.DEBAO_TEXT_THINK) payload.thinking = { type: 'disabled' }
  return JSON.stringify(payload)
}

function errHint(provider, status, model) {
  const who = provider === 'deepseek' ? 'DeepSeek' : '豆包'
  let hint = ''
  if (status === 401 || status === 403) hint = '（key 不对或没开这个模型）'
  if (status === 404) hint = '（模型名不对：' + model + '）'
  if (status === 402) hint = '（余额不足，去充值）'
  if (status === 429) hint = '（超频或余额不足）'
  return who + '返回 ' + status + ' ' + hint
}

/* 一次性返回 */
export async function generate(prompt, opt = {}) {
  const kb = kbParts(prompt, opt.kbLimit || 3, !!opt.noKb)
  /* 优先用 DSH 环境内的模型（插件 host 半 /debao/gen），不需要任何 key */
  const base = hostBaseOf(opt)
  if (base && (await hostAlive(base))) {
    const r = await hostGenerate(base, prompt, opt, kb.block, null)
    return Object.assign({}, r, { kb: kb.hits })
  }
  const tp = textProvider()
  if (!tp.key) {
    throw new Error(
      '没有可用的文本模型 key：设 DEEPSEEK_API_KEY（推荐，文案更稳）或 ARK_API_KEY 后重启采集桥。',
    )
  }
  const t0 = Date.now()
  const res = await fetch(endpoint(tp.provider), {
    method: 'POST',
    headers: headers(tp.key),
    body: body(prompt, Object.assign({}, opt, { kbBlock: kb.block }), tp),
  })
  const raw = await res.text()
  let j = null
  try {
    j = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg = (j && j.error && (j.error.message || j.error.code)) || raw.slice(0, 200)
    throw new Error(errHint(tp.provider, res.status, opt.model || tp.model) + ' ' + msg)
  }
  const text = (
    (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) ||
    ''
  ).trim()
  return {
    text,
    usage: (j && j.usage) || null,
    ms: Date.now() - t0,
    model: (j && j.model) || opt.model || tp.model,
    provider: tp.provider,
    kb: kb.hits,
  }
}

/* 流式：每来一段增量调 onDelta(delta, fullText) */
export async function generateStream(prompt, opt = {}, onDelta) {
  const kb = kbParts(prompt, opt.kbLimit || 3, !!opt.noKb)
  const base = hostBaseOf(opt)
  if (base && (await hostAlive(base))) {
    const r = await hostGenerate(base, prompt, opt, kb.block, onDelta)
    return Object.assign({}, r, { kb: kb.hits })
  }
  const tp = textProvider()
  if (!tp.key) {
    throw new Error(
      '没有可用的文本模型 key：设 DEEPSEEK_API_KEY（推荐，文案更稳）或 ARK_API_KEY 后重启采集桥。',
    )
  }
  const t0 = Date.now()
  const res = await fetch(endpoint(tp.provider), {
    method: 'POST',
    headers: headers(tp.key),
    body: body(prompt, Object.assign({}, opt, { stream: true, kbBlock: kb.block }), tp),
  })
  if (!res.ok) {
    const raw = await res.text()
    let j = null
    try {
      j = JSON.parse(raw)
    } catch {
      /* ignore */
    }
    const msg = (j && j.error && (j.error.message || j.error.code)) || raw.slice(0, 200)
    throw new Error(errHint(tp.provider, res.status, opt.model || tp.model) + ' ' + msg)
  }

  let full = ''
  let usage = null
  let model = opt.model || tp.model
  let buf = ''
  const reader = res.body.getReader()
  const dec = new TextDecoder()

  const handle = (payload) => {
    if (payload === '[DONE]') return
    let j = null
    try {
      j = JSON.parse(payload)
    } catch {
      return
    }
    if (j.model) model = j.model
    if (j.usage) usage = j.usage
    const d = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content
    if (d) {
      full += d
      if (onDelta) onDelta(d, full)
    }
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '')
      buf = buf.slice(idx + 1)
      if (!line.startsWith('data:')) continue
      handle(line.slice(5).trim())
    }
  }
  if (buf.trim().startsWith('data:')) handle(buf.trim().slice(5).trim())

  return { text: full.trim(), usage, ms: Date.now() - t0, model, provider: tp.provider, kb: kb.hits }
}
