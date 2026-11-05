/**
 * 德饱 · 真·一键解析（analyze.mjs）
 *
 * 插件里点「开始解析」→ 这里在本地跑完整条流水线，不用把指令复制来复制去：
 *   取文件（队列直链 / 本地路径）→ ffprobe → 均匀抽帧 → 豆包视觉模型（ARK）→ 结论落盘
 *
 * 需要 ARK_API_KEY（豆包 / 火山方舟）。取值顺序：
 *   1. 进程环境变量 ARK_API_KEY / DEBAO_ARK_KEY
 *   2. bridge\ark.key（一行，你自己填）
 *   3. Windows 用户环境变量（HKCU\Environment），这样即使桥不是从带变量的终端启动也能用
 *
 * 只用本机 ffmpeg/ffprobe + 一次视觉模型调用，不上传原视频，只把抽出来的几帧发出去。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(HERE, 'data')
const MEDIA = path.join(DATA, 'media')
const FRAMES = path.join(DATA, 'frames')
const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_MODEL = process.env.DEBAO_VISION_MODEL || 'doubao-seed-2-1-lite-260915'
const MAX_BYTES = 400 * 1024 * 1024

fs.mkdirSync(MEDIA, { recursive: true })
fs.mkdirSync(FRAMES, { recursive: true })

/* ------------------------------ 工具：外部命令 ------------------------------ */

function firstExisting(list) {
  for (const p of list) {
    try {
      if (p && fs.existsSync(p)) return p
    } catch (e) {
      /* ignore */
    }
  }
  return null
}

function ffmpegBin(name) {
  const home = process.env.USERPROFILE || process.env.HOME || ''
  const exe = process.platform === 'win32' ? name + '.exe' : name
  const candidates = [
    process.env.DEBAO_FFMPEG_DIR && path.join(process.env.DEBAO_FFMPEG_DIR, exe),
    path.join(home, '.dsh', 'tools', 'ffmpeg', 'bin', exe),
    path.join('C:\\ffmpeg', 'bin', exe),
  ]
  const found = firstExisting(candidates)
  return found || name // 兜底靠 PATH
}

const FFMPEG = ffmpegBin('ffmpeg')
const FFPROBE = ffmpegBin('ffprobe')

/* ------------------------------ 工具：密钥 ------------------------------ */

function keyFromRegistry() {
  if (process.platform !== 'win32') return ''
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', 'ARK_API_KEY'], { encoding: 'utf8', windowsHide: true })
    const m = out.match(/ARK_API_KEY\s+REG_[A-Z_]+\s+(.+)/)
    return m ? m[1].trim() : ''
  } catch (e) {
    return ''
  }
}

export function resolveKey() {
  const direct = process.env.ARK_API_KEY || process.env.DEBAO_ARK_KEY
  if (direct && String(direct).trim()) return { key: String(direct).trim(), from: 'env' }
  const dataDir = process.env.DEBAO_DATA_DIR ? path.resolve(process.env.DEBAO_DATA_DIR) : path.join(HERE, 'data')
  const file = path.join(dataDir, 'ark.key')
  try {
    if (fs.existsSync(file)) {
      const k = fs.readFileSync(file, 'utf8').split(/\r?\n/)[0].trim()
      if (k) return { key: k, from: 'ark.key' }
    }
  } catch (e) {
    /* ignore */
  }
  const reg = keyFromRegistry()
  if (reg) return { key: reg, from: 'user-env' }
  return { key: '', from: 'none' }
}

export function keyStatus() {
  const r = resolveKey()
  return { ok: !!r.key, from: r.from, model: ARK_MODEL }
}

/* ------------------------------ 步骤 1：拿到文件 ------------------------------ */

function safeName(s) {
  return String(s || 'item').replace(/[^\w.-]/g, '_').slice(0, 60)
}

async function download(url, name) {
  const dest = path.join(MEDIA, safeName(name) + '.mp4')
  try {
    const st = fs.statSync(dest)
    if (st.size > 1024) return { file: dest, cached: true }
  } catch (e) {
    /* not cached */
  }
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  const res = await fetch(url, {
    headers: { 'User-Agent': ua, Accept: '*/*', Referer: refererOf(url) },
  })
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}（直链有时效，回页面重新采一次）`)
  const type = String(res.headers.get('content-type') || '')
  if (/text\/html|application\/json/.test(type)) {
    throw new Error('这个链接是网页不是视频文件（直链过期或被拦）——在笔记页重新点一次采集，拿新直链')
  }
  const { Readable } = await import('node:stream')
  const { pipeline } = await import('node:stream/promises')
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest))
  const size = fs.statSync(dest).size
  if (size < 1024) throw new Error('下下来的文件太小（可能被拦），换一次链接再试')
  return { file: dest, cached: false, size }
}

async function resolveSource(input, queue) {
  const raw = String((input && (input.path || input.link)) || '').trim()
  const looksUrl = /^https?:\/\//i.test(raw)
  const local = raw && !looksUrl ? raw : ''
  if (local && fs.existsSync(local)) {
    const size = fs.statSync(local).size
    if (size > MAX_BYTES) throw new Error('文件太大（>400MB），先剪一段再解析')
    return { file: local, kind: 'local', size }
  }
  if (local) throw new Error('这个路径不存在：' + local)
  let item = null
  if (input && input.id) item = (queue || []).find((x) => x.id === input.id) || null
  /* 扩展已经把视频存到本机了（最稳的一条：不受直链过期影响） */
  if (!local && item && item.localFile && fs.existsSync(item.localFile)) {
    const size = fs.statSync(item.localFile).size
    return { file: item.localFile, kind: 'local', size, cached: true, item: item.id }
  }
  let url = String((input && input.url) || (looksUrl ? raw : '') || (item && item.videoUrl) || '').trim()
  if (!item && !url) {
    /* 什么都没给：优先挑「已存到本机」的，其次才是「有直链」的 */
    item =
      (queue || []).find((x) => x && x.localFile && fs.existsSync(x.localFile)) ||
      (queue || []).find((x) => x && x.videoUrl) ||
      null
    url = (item && item.videoUrl) || ''
    if (item && item.localFile && fs.existsSync(item.localFile)) {
      return { file: item.localFile, kind: 'local', size: fs.statSync(item.localFile).size, cached: true, item: item.id }
    }
  }
  if (url && /^https?:/i.test(url)) {
    /* HLS 不下载，直接让 ffmpeg 读网络流 */
    if (/\.m3u8(\?|$)/i.test(url)) return { file: url, kind: 'hls', size: 0 }
    const name = safeName((item && item.id) || (input && input.id) || 'u_' + Date.now())
    let got
    try {
      got = await download(url, name)
    } catch (e) {
      const msg = String((e && e.message) || e)
      if (/40[34]/.test(msg)) {
        throw new Error(
          '直链打不开（' +
            msg.replace(/^下载失败\s*/, '') +
            '）—— 小红书/抖音的直链几分钟就过期。回这条笔记，按一下播放，再点「采集到自媒体库」（这次会把视频直接存到本机），然后点「解析视频」。',
        )
      }
      throw e
    }
    return { file: got.file, kind: 'url', size: got.size || 0, cached: !!got.cached }
  }
  if (item && !url)
    throw new Error(
      '这条采集没有视频直链（多半是图文，或者采集时还没开始播）——回浏览器打开这条视频、按下播放，再点一次「采集到德饱」，然后回来点「开始解析」',
    )
  throw new Error(
    '队列里还没有带视频直链的素材：先在浏览器打开小红书/抖音的视频笔记，按播放后点「采集到德饱」，再回来点「开始解析」；也可以在「文件或链接」里填本地视频路径',
  )
}

/* ------------------------------ 步骤 2：ffprobe ------------------------------ */

function rate(str) {
  const s = String(str || '')
  const m = s.match(/^(\d+)\/(\d+)$/)
  if (m) return Math.round((Number(m[1]) / Number(m[2])) * 10) / 10
  const n = Number(s)
  return isFinite(n) ? Math.round(n * 10) / 10 : 0
}

async function probe(src) {
  const file = src && src.file ? src.file : String(src || '')
  try {
    const { stdout } = await run(
      FFPROBE,
      [
        '-v', 'error',
        ...netArgs(src),
        '-show_entries', 'format=duration,size:stream=codec_type,width,height,r_frame_rate',
        '-of', 'json',
        file,
      ],
      { maxBuffer: 8 * 1024 * 1024, windowsHide: true },
    )
    const j = JSON.parse(stdout)
    const streams = j.streams || []
    const v = streams.find((s) => s.codec_type === 'video') || {}
    const a = streams.find((s) => s.codec_type === 'audio')
    const duration = Number((j.format && j.format.duration) || 0)
    return {
      duration: Math.round(duration * 10) / 10,
      width: v.width || 0,
      height: v.height || 0,
      fps: rate(v.r_frame_rate),
      hasAudio: !!a,
      size: Number((j.format && j.format.size) || 0),
    }
  } catch (e) {
    throw new Error('ffprobe 读不了这个文件：' + (e && e.message ? e.message.split('\n')[0] : '未知错误'))
  }
}

/* ------------------------------ 步骤 3：抽帧 ------------------------------ */

/* 远程流（尤其 HLS）必须带 UA 和 Referer，否则 xhscdn / douyinvod 会 403 */
const NET_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/* 只有「真的要读网络流」时才带 HTTP 头：
   下到本机的文件再加 -user_agent/-headers，ffmpeg 会直接报
   "Option user_agent not found / Error opening input file"。 */
function refererOf(file) {
  /* 抖音的 CDN 只认自己的 Referer，带小红书的会 403，反之亦然 */
  return /douyin|douyinvod|douyinpic|bytecdn|bytecdntp|zjcdn|amemv/i.test(String(file || ''))
    ? 'https://www.douyin.com/'
    : 'https://www.xiaohongshu.com/'
}

function netArgs(src) {
  const file = src && src.file ? String(src.file) : String(src || '')
  if (!/^https?:\/\//i.test(file)) return []
  return ['-user_agent', NET_UA, '-headers', 'Referer: ' + refererOf(file) + '\r\n']
}

async function extractFrames(src, duration, dir, count) {
  const file = src && src.file ? src.file : String(src || '')
  const net = netArgs(src)
  fs.mkdirSync(dir, { recursive: true })
  const n = Math.max(3, Math.min(32, count || 8))
  const out = []
  const errs = []
  for (let i = 0; i < n; i++) {
    const t = duration > 0 ? (duration * (i + 0.5)) / n : i
    const dest = path.join(dir, 'f' + String(i + 1).padStart(2, '0') + '.jpg')
    await run(
      FFMPEG,
      ['-y', '-ss', String(Math.max(0, t).toFixed(2)), ...net, '-i', file, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', dest],
      { maxBuffer: 16 * 1024 * 1024, windowsHide: true },
    ).catch((e) => {
      /* 个别时间点抽不到就跳过；把原因留下来，全失败时好定位 */
      errs.push(String((e && (e.stderr || e.message)) || e).replace(/\s+/g, ' ').slice(0, 300))
    })
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      out.push({ t: Math.round(t * 10) / 10, file: dest })
    }
  }
  if (!out.length) {
    const why = errs[0] ? '｜ffmpeg: ' + errs[0].slice(0, 220) : ''
    throw new Error('一帧都没抽出来（文件是音频？或解码失败）' + why)
  }
  return out
}

/* ------------------------------ 步骤 4：视觉模型 ------------------------------ */

const PROMPT = (meta) =>
  [
    '你是短视频拆解员。下面按时间顺序给你若干帧，每帧前面的文字标了它的秒数。',
    `素材信息：时长 ${meta.duration}s，${meta.width}x${meta.height}，${meta.fps}fps，${meta.hasAudio ? '有声音' : '无音轨'}。`,
    '已知信息（可能为空）：' + (meta.desc || '（无）'),
    '',
    '只输出 JSON，不要 markdown 代码块，不要解释。schema：',
    '{"summary":"一句话：它靠什么留住人","hook":"前3秒在做什么、说什么、字卡上是什么",',
    '"timeline":[{"t":0,"shot":"画面里有什么","card":"画面上的字","what":"这一帧在推进什么"}],',
    '"structure":[{"name":"钩子|铺垫|展开|转折|收尾","from":0,"to":3,"what":"这一段干了什么"}],',
    '"peakSec":0,"reusable":["步骤1","步骤2"],"emotion":"情绪","gap":"给观众留的信息缺口","tags":["类型标签"]}',
    '',
    '要求：t 用我给的真实秒数；timeline 每帧一条；structure 用五段法切，秒数要对得上；reusable 是能直接照做的填空模板，3-5 条。',
  ].join('\n')

function stripFence(s) {
  let t = String(s || '').trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (m) t = m[1].trim()
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a >= 0 && b > a) t = t.slice(a, b + 1)
  return t
}

const VIDEO_MAX_BYTES = Number(process.env.DEBAO_VIDEO_MAX_MB || 45) * 1024 * 1024

/* 长视频不再只靠抽帧：把整段视频喂给豆包，让它看到完整节奏 */
const PROMPT_VIDEO = (meta) =>
  [
    '你是短视频拆解员。下面是一段完整视频，请把它当成一条作品整体看，不要只描述某几帧。',
    `素材信息：时长 ${meta.duration}s，${meta.width}x${meta.height}，${meta.fps}fps，${meta.hasAudio ? '有声音' : '无音轨'}。`,
    '已知信息（可能为空）：' + (meta.desc || '（无）'),
    '',
    '只输出 JSON，不要 markdown 代码块，不要解释。schema：',
    '{"summary":"一句话：它靠什么留住人","hook":"前3秒在做什么、说什么、字卡上是什么",',
    '"timeline":[{"t":0,"shot":"画面里有什么","card":"画面上的字","what":"这一段在推进什么"}],',
    '"structure":[{"name":"钩子|铺垫|展开|转折|收尾","from":0,"to":3,"what":"这一段干了什么"}],',
    '"peakSec":0,"reusable":["步骤1","步骤2"],"emotion":"情绪","gap":"给观众留的信息缺口","tags":["类型标签"]}',
    '',
    '要求：t / from / to 用真实秒数；timeline 按时间顺序给 8-16 条（覆盖全片，不要挤在开头）；structure 用五段法切，秒数要对得上；reusable 是能直接照做的填空模板，3-5 条。',
  ].join('\n')

/* 视频太大就把整段压成小样：模型照样看完整段，只是分辨率低一点 */
async function compactForVideo(file, info) {
  const bin = ffmpegBin('ffmpeg')
  const out = path.join(FRAMES, '_compact_' + Date.now().toString(36) + '.mp4')
  const rounds = [
    { w: 720, r: 15, crf: 30 },
    { w: 480, r: 12, crf: 34 },
    { w: 360, r: 10, crf: 38 },
  ]
  for (const q of rounds) {
    const args = [
      '-y', '-i', file,
      '-vf', 'scale=min(' + q.w + '\\,iw):-2',
      '-r', String(q.r),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(q.crf),
      '-c:a', 'aac', '-b:a', '64k',
      '-movflags', '+faststart',
      out,
    ]
    try {
      await run(bin, args, { maxBuffer: 8 * 1024 * 1024, timeout: 600000 })
    } catch (e) {
      if (fs.existsSync(out)) fs.rmSync(out, { force: true })
      return ''
    }
    if (fs.existsSync(out) && fs.statSync(out).size <= VIDEO_MAX_BYTES) return out
  }
  if (fs.existsSync(out)) fs.rmSync(out, { force: true })
  return ''
}

async function callVideo(key, file, meta) {
  const size = fs.statSync(file).size
  if (size > VIDEO_MAX_BYTES) throw new Error('视频 ' + Math.round(size / 1048576) + 'MB，超过整段理解上限 ' + Math.round(VIDEO_MAX_BYTES / 1048576) + 'MB；这一条改用抽帧')
  const b64 = fs.readFileSync(file).toString('base64')
  const content = [
    { type: 'video_url', video_url: { url: 'data:video/mp4;base64,' + b64 } },
    { type: 'text', text: PROMPT_VIDEO(meta) },
  ]
  const t0 = Date.now()
  const res = await fetch(ARK_BASE + '/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: ARK_MODEL,
      messages: [{ role: 'user', content }],
      temperature: 0.2,
      max_tokens: 3000,
    }),
    signal: AbortSignal.timeout(600000),
  })
  const text = await res.text()
  if (!res.ok) {
    let hint = ''
    if (res.status === 401 || res.status === 403) hint = '（key 无效或没权限：去火山方舟控制台确认这个 key 开通了豆包视觉模型）'
    if (res.status === 404) hint = '（模型名不对：' + ARK_MODEL + '）'
    if (res.status === 413 || /too large|exceed/i.test(text)) hint = '（视频太大，改用抽帧）'
    throw new Error('豆包视频接口 ' + res.status + ' ' + hint + ' ' + text.slice(0, 200))
  }
  const j = JSON.parse(text)
  const msg = (j.choices && j.choices[0] && j.choices[0].message) || {}
  const raw = msg.content || ''
  let parsed = null
  try {
    parsed = JSON.parse(stripFence(raw))
  } catch (e) {
    parsed = null
  }
  return { parsed, raw, ms: Date.now() - t0, model: j.model || ARK_MODEL, usage: j.usage || null }
}

async function callVision(key, frames, meta) {
  const content = [{ type: 'text', text: PROMPT(meta) }]
  for (const f of frames) {
    content.push({ type: 'text', text: 't=' + f.t + 's' })
    const b64 = fs.readFileSync(f.file).toString('base64')
    content.push({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + b64 } })
  }
  const t0 = Date.now()
  const res = await fetch(ARK_BASE + '/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: ARK_MODEL,
      messages: [{ role: 'user', content }],
      temperature: 0.2,
      max_tokens: 2400,
    }),
    signal: AbortSignal.timeout(180000),
  })
  const text = await res.text()
  if (!res.ok) {
    let hint = ''
    if (res.status === 401 || res.status === 403) hint = '（key 无效或没权限：去火山方舟控制台确认这个 key 开通了豆包视觉模型）'
    if (res.status === 404) hint = '（模型名不对：' + ARK_MODEL + '）'
    throw new Error(`豆包接口 ${res.status} ${hint} ` + text.slice(0, 200))
  }
  const j = JSON.parse(text)
  const msg = (j.choices && j.choices[0] && j.choices[0].message) || {}
  const raw = msg.content || ''
  let parsed = null
  try {
    parsed = JSON.parse(stripFence(raw))
  } catch (e) {
    parsed = null
  }
  return { parsed, raw, ms: Date.now() - t0, model: j.model || ARK_MODEL, usage: j.usage || null }
}

/* ------------------------------ 主流程 ------------------------------ */

/* 帧数按片长自适应：短视频没必要多抽，长视频多抽几帧 */
function planFrames(duration, asked) {
  const n = Number(asked) || 0
  if (n >= 3) return Math.min(32, n)
  if (duration <= 60) return 8
  if (duration <= 180) return 16
  if (duration <= 600) return 24
  return 32
}

export async function runAnalysis(input, queue, onStage) {
  const stage = (msg, pct) => {
    try {
      if (onStage) onStage(msg, pct)
    } catch (e) {
      /* ignore */
    }
  }
  const started = Date.now()
  const id = 'an_' + Date.now().toString(36)

  stage('找素材', 5)
  const src = await resolveSource(input || {}, queue)

  stage('读参数（ffprobe）', 15)
  const info = await probe(src)

  const wantMode = String((input && input.mode) || 'auto')
  let localSize = 0
  try {
    /* hls / 远程流没法算体积；只要落在本机就算 */
    if (src.file && !/^https?:/i.test(src.file) && fs.existsSync(src.file)) localSize = fs.statSync(src.file).size
  } catch (e) {
    localSize = 0
  }

  /* 除了明确要抽帧，其余一律整段交给模型：短视频节奏快，逐帧反而看不出剪辑点 */
  const wantVideo = wantMode !== 'frames'
  let videoFile = src.file
  let compacted = ''
  if (wantVideo && localSize > VIDEO_MAX_BYTES) {
    stage('视频偏大，先压一份小样', 22)
    compacted = await compactForVideo(src.file, info).catch(() => '')
    if (compacted) {
      videoFile = compacted
      try { localSize = fs.statSync(compacted).size } catch (e) { localSize = 0 }
    }
  }
  const useVideo = wantVideo && localSize > 0 && localSize <= VIDEO_MAX_BYTES

  const meta = { duration: info.duration, width: info.width, height: info.height, fps: info.fps, hasAudio: info.hasAudio, desc: String((input && input.desc) || '').slice(0, 800) }

  const keyInfo = resolveKey()
  if (!keyInfo.key) {
    throw new Error(
      '没找到豆包 key：把一行 key 写进 ' + path.join(HERE, 'ark.key') + '，或设 ARK_API_KEY 环境变量后重启采集桥',
    )
  }

  let frames = []
  let vlm = null
  let analyzeMode = 'frames'

  if (useVideo) {
    analyzeMode = 'video'
    stage('整段交给豆包看（' + Math.round(info.duration) + ' 秒）', 30)
    /* 还是抽几张缩略图放在结果里，人一眼能看到这条视频长什么样 */
    frames = await extractFrames(src, info.duration, path.join(FRAMES, id), 6).catch(() => [])
    stage('豆包在看整段视频', 55)
    vlm = await callVideo(keyInfo.key, videoFile, meta)
  } else {
    const n = planFrames(info.duration, input && input.frames)
    stage('抽帧（' + n + ' 帧）', 30)
    frames = await extractFrames(src, info.duration, path.join(FRAMES, id), n)
    stage('豆包在画面里找结构', 55)
    vlm = await callVision(keyInfo.key, frames, meta)
  }

  if (compacted) { try { fs.rmSync(compacted, { force: true }) } catch (e) {} }
  stage('整理结论', 90)
  const r = vlm.parsed || {}
  /* 把这条素材的标题/作者/封面一起存下来：采集库以后即使删了条目，解析记录也还读得懂 */
  const srcItem = (queue || []).find((x) => String(x.id) === String((input && input.id) || '')) || null
  const st = (srcItem && srcItem.stats) || {}
  const result = {
    id,
    at: Date.now(),
    platform: String((input && input.platform) || (srcItem && srcItem.platform) || ''),
    ref: String((input && (input.id || input.url)) || src.file),
    mode: (input && input.mode) === 'music' ? 'music' : 'video',
    meta: {
      title: (srcItem && srcItem.title) || String((input && input.desc) || '').slice(0, 60) || '',
      author: (srcItem && srcItem.author) || '',
      cover: (srcItem && srcItem.coverUrl) || '',
      url: (srcItem && srcItem.url) || String((input && input.link) || ''),
      likes: Number(st.likes) || 0,
      collects: Number(st.collects) || 0,
      comments: Number(st.comments) || 0,
      category: (srcItem && srcItem.category) || '',
    },
    source: { kind: src.kind, file: src.file, from: keyInfo.from, mode: analyzeMode },
    probe: info,
    frames: frames.map((f) => ({ t: f.t, file: path.relative(FRAMES, f.file).split(path.sep).join('/') })),
    usage: vlm.usage || null,

    result: {
      summary: r.summary || '',
      hook: r.hook || '',
      timeline: Array.isArray(r.timeline) ? r.timeline : [],
      structure: Array.isArray(r.structure) ? r.structure : [],
      peakSec: Number(r.peakSec) || 0,
      reusable: Array.isArray(r.reusable) ? r.reusable : [],
      emotion: r.emotion || '',
      gap: r.gap || '',
      tags: Array.isArray(r.tags) ? r.tags : [],
    },
    raw: vlm.parsed ? '' : String(vlm.raw || '').slice(0, 4000),
    model: vlm.model,
    ms: Date.now() - started,
  }
  stage('完成', 100)
  return result
}

export function framesDir() {
  return FRAMES
}
