/**
 * zimeiti-kb — 自媒体知识库检索引擎（纯 Node，无依赖）。
 *
 * 语料三层：
 *   distilled/  蒸馏后的作战手册（方法论主体，检索优先命中）
 *   videos/     视频解析笔记（每集一份）
 *   raw/        原始课件抽取稿（细节与原文金句的最后一道防线）
 *
 * 只做三件事：列目录、搜片段、读全文。没有向量库、没有外部服务，
 * 因为这套语料的检索特征是「中文专有名词 + 结构化小标题」，
 * 子串/二元组加权打分已经足够，且零部署成本。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** 知识库根目录：默认取插件同级的上两级 kb/，可用环境变量覆盖。 */
export const KB_ROOT = process.env.ZIMEITI_KB_DIR
  ? path.resolve(process.env.ZIMEITI_KB_DIR)
  : path.resolve(HERE, '..', '..', 'kb')

export const CORPORA = {
  playbook: { dir: 'distilled', label: '蒸馏作战手册' },
  video: { dir: 'videos', label: '视频解析笔记' },
  raw: { dir: 'raw', label: '原始课件抽取稿' },
}

const CACHE = new Map() // absPath -> { mtimeMs, text }
const MAX_RAW_BYTES = 4 * 1024 * 1024

function statSafe(p) {
  try {
    return fs.statSync(p)
  } catch {
    return null
  }
}

function readCached(abs) {
  const st = statSafe(abs)
  if (!st) return null
  const hit = CACHE.get(abs)
  if (hit && hit.mtimeMs === st.mtimeMs) return hit.text
  if (st.size > MAX_RAW_BYTES) return null
  const text = fs.readFileSync(abs, 'utf8')
  CACHE.set(abs, { mtimeMs: st.mtimeMs, text })
  return text
}

/** 列出某个语料下所有 md 文件（rel 用 '/' 分隔，便于跨平台引用）。 */
export function listCorpus(corpus) {
  const spec = CORPORA[corpus]
  if (!spec) throw new Error(`未知语料：${corpus}（可选：${Object.keys(CORPORA).join(' / ')}）`)
  const root = path.join(KB_ROOT, spec.dir)
  const out = []
  const walk = (dir, prefix) => {
    let ents
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of ents) {
      const abs = path.join(dir, ent.name)
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name
      if (ent.isDirectory()) walk(abs, rel)
      else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
        const st = statSafe(abs)
        out.push({ corpus, rel, abs, bytes: st ? st.size : 0, mtimeMs: st ? st.mtimeMs : 0 })
      }
    }
  }
  walk(root, '')
  out.sort((a, b) => a.rel.localeCompare(b.rel, 'zh'))
  return out
}

export function listAll() {
  const all = []
  for (const key of Object.keys(CORPORA)) all.push(...listCorpus(key))
  return all
}

function firstHeading(text, fallback) {
  const m = /^#\s+(.+)$/m.exec(text)
  if (m) return m[1].trim()
  // 原始抽取稿没有 H1：取第一行既非空、非注释、非页码标记的正文当标题
  for (const raw of text.split('\n').slice(0, 40)) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('<!--') || line.startsWith('#')) continue
    if (/^\[p\d+\]$/.test(line)) continue
    return line.length > 40 ? `${line.slice(0, 40)}…` : line
  }
  return path.basename(fallback, '.md')
}

/** 目录视图：每个文件一行 —— 标题、字数、二级标题若干。 */
export function catalog({ corpus, maxPerCorpus = 120 } = {}) {
  const keys = corpus ? [corpus] : Object.keys(CORPORA)
  const lines = []
  for (const key of keys) {
    const files = listCorpus(key)
    lines.push(`## ${CORPORA[key].label}（${CORPORA[key].dir}/，${files.length} 个文件）`)
    if (files.length === 0) {
      lines.push('（空）')
      continue
    }
    for (const f of files.slice(0, maxPerCorpus)) {
      const text = readCached(f.abs) ?? ''
      const title = firstHeading(text, path.basename(f.rel, '.md'))
      const heads = [...text.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim()).slice(0, 6)
      const kb = (Buffer.byteLength(text, 'utf8') / 1024).toFixed(1)
      lines.push(`- \`${key}:${f.rel}\` — ${title}（${kb}KB）`)
      if (heads.length) lines.push(`    小标题：${heads.join(' / ')}`)
    }
    if (files.length > maxPerCorpus) {
      lines.push(`（另有 ${files.length - maxPerCorpus} 个文件未列出——这些用 zimeiti_kb_search 检索，别靠翻目录。）`)
    }
  }
  return lines.join('\n')
}

/** 中文友好的分词：连续汉字切成 2-3 字滑窗，ASCII 切成按空白/标点分割的词。 */
export function terms(query) {
  const q = String(query || '').toLowerCase().trim()
  if (!q) return []
  const out = new Set()
  for (const chunk of q.split(/[\s,，。、；;:：/|()+]+/)) {
    if (!chunk) continue
    if (/^[\x00-\x7f]+$/.test(chunk)) {
      if (chunk.length >= 2) out.add(chunk)
      continue
    }
    if (chunk.length <= 3) out.add(chunk)
    else {
      for (let i = 0; i + 2 <= chunk.length; i += 1) out.add(chunk.slice(i, i + 2))
    }
  }
  return [...out].filter((t) => t.length >= 2 || /^[\x00-\x7f]+$/.test(t))
}

function snippetAround(text, pos, term, width = 170) {
  let start = Math.max(0, pos - Math.floor(width / 2))
  let end = Math.min(text.length, start + width * 2)
  // 尽量对齐到换行，避免从半个句子开始
  const nl = text.lastIndexOf('\n', pos)
  if (nl >= 0 && pos - nl < 90) start = nl + 1
  const nl2 = text.indexOf('\n', end)
  if (nl2 >= 0 && nl2 - end < 120) end = nl2
  let s = text.slice(start, end).replace(/\s+/g, ' ').trim()
  // 抽稿文件开头带 `<!-- source: … -->` 元信息注释，别让它占掉片段开头
  s = s.replace(/^<!--[\s\S]*?-->\s*/, '').trim()
  if (s.length > width * 2) s = `${s.slice(0, width * 2)}…`
  return { text: s, line: text.slice(0, pos).split('\n').length }
}

function nearestHeading(text, pos) {
  const before = text.slice(0, pos)
  const ms = [...before.matchAll(/^#{1,4}\s+(.+)$/gm)]
  return ms.length ? ms[ms.length - 1][1].trim() : ''
}

/** 按标题把一篇切开：检索以「小节」为单位，一整本 15k 字的手册不会把某个 500 字的干货点淹掉。 */
function buildSections(text) {
  const lines = text.split('\n')
  const secs = []
  let cur = { title: '', startLine: 1, parts: [] }
  const flush = () => {
    if (!cur.parts.length) return
    const body = cur.parts.join('\n')
    if (body.trim()) secs.push({ title: cur.title, startLine: cur.startLine, text: body })
  }
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^(#{1,4})\s+(.+)$/.exec(lines[i])
    if (m) {
      flush()
      cur = { title: m[2].trim(), startLine: i + 1, parts: [] }
    }
    cur.parts.push(lines[i])
  }
  flush()
  // 原始抽稿（.doc/.pdf 抽出来的纯文本）往往一个标题都没有——整篇会变成一个巨大的"文件开头"小节，
  // 命中位置永远落在第 1 行。这种就按空行切成 ~1400 字的伪小节，标题取块首那句，片段才能落在真的地方。
  if (secs.length === 1 && !secs[0].title && secs[0].text.length > 2500) return chunkPlain(secs[0].text)
  return secs
}

function chunkPlain(text, target = 1400) {
  const lines = text.split('\n')
  const out = []
  let parts = []
  let startLine = 1
  let len = 0
  const flush = () => {
    const body = parts.join('\n')
    if (!body.trim()) return
    // 扫描件/教材里常有整页只有"扫码加微信领资料"这种页脚灌水，字数少、重复度高，
    // 命中了也只会把真正的干货挤下去——直接丢掉这一块。
    const compact = body.replace(/\s+/g, '')
    if (compact.length < 60) return
    const bodyLines = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (bodyLines.length >= 4 && new Set(bodyLines).size / bodyLines.length < 0.35) return
    if (new Set(compact).size / compact.length < 0.12) return
    const clean = (l) =>
      String(l || '')
        .replace(/^\[p\d+\]\s*/, '')
        .replace(/^#+\s*/, '')
        .trim()
    // 伪小节标题要选一句「像正文」的话：页脚、"o"这类项目符号、纯数字都不算
    const usable = (t) =>
      t.length >= 6 &&
      !/^(o|·|•|-|–|—|>|\d+)[\s:：]*$/i.test(t) &&
      !/扫码|加微信|加好友|领取《|第[①-⑩]时间|微信[:：]\s*\d{5,}/.test(t) &&
      /[\u4e00-\u9fff]{4,}|[A-Za-z]{4,}/.test(t)
    const first = parts.map(clean).find(usable) || parts.map(clean).find((l) => l.length >= 2) || parts[0]
    const title = clean(first).slice(0, 36)
    out.push({ title: title || '（片段）', startLine, text: body })
  }
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i]
    if (len === 0 && !l.trim()) {
      startLine = i + 2
      continue
    }
    if (len > target && !l.trim()) {
      flush()
      parts = []
      len = 0
      startLine = i + 2
      continue
    }
    parts.push(l)
    len += l.length
  }
  flush()
  return out
}

const SECTIONS = new Map() // abs -> { mtimeMs, secs }

function sectionsOf(abs, text) {
  const st = statSafe(abs)
  const mt = st ? st.mtimeMs : 0
  const hit = SECTIONS.get(abs)
  if (hit && hit.mtimeMs === mt) return hit.secs
  const secs = buildSections(text)
  SECTIONS.set(abs, { mtimeMs: mt, secs })
  return secs
}

/**
 * 检索。以小节为单位打分：词频 × IDF × 词长权重 / 小节长度归一，
 * 标题命中额外加分（问「晒过程」时，标题写着"晒过程"的那节应该上）。长词命中权重更高。
 * 蒸馏手册与视频笔记按 1.8/1.4 加权，原始稿按 1.0（细节兜底）。
 */
export function search(query, { corpus, limit = 6, perFile = 2 } = {}) {
  const ts = terms(query)
  if (ts.length === 0) return { query, terms: [], hits: [], note: '查询词太短，至少给 2 个汉字或 1 个英文词。' }
  const weight = { playbook: 1.8, video: 1.4, raw: 1.0 }
  const files = corpus ? listCorpus(corpus) : listAll()

  const pool = []
  const df = new Map()
  for (const f of files) {
    const text = readCached(f.abs)
    if (!text) continue
    for (const sec of sectionsOf(f.abs, text)) {
      const lower = sec.text.toLowerCase()
      const counts = new Map()
      const positions = []
      for (const t of ts) {
        let idx = lower.indexOf(t)
        let count = 0
        while (idx !== -1 && count < 25) {
          count += 1
          if (positions.length < 200) positions.push(idx)
          idx = lower.indexOf(t, idx + t.length)
        }
        if (count > 0) {
          counts.set(t, count)
          df.set(t, (df.get(t) || 0) + 1)
        }
      }
      if (counts.size > 0) pool.push({ file: f, sec, counts, positions: positions.sort((a, b) => a - b) })
    }
  }

  const N = Math.max(pool.length, 1)
  const scored = pool.map((p) => {
    let score = 0
    const title = String(p.sec.title || '').toLowerCase()
    for (const [t, count] of p.counts) {
      const idf = Math.log(1 + N / (1 + (df.get(t) || 1)))
      score += count * idf * (1 + Math.min(t.length, 6) / 3)
      if (title.includes(t)) score += 2.5 * idf
    }
    // 长度归一：小节越长越吃亏，但别把长小节打得太狠
    const norm = Math.sqrt(p.sec.text.length / 300 + 1)
    return { ...p, score: (score / norm) * (weight[p.file.corpus] ?? 1) }
  })
  scored.sort((a, b) => b.score - a.score)

  // 分层配额：先给蒸馏手册（那是"怎么想/怎么做"），再给视频笔记，最后原始稿兜底。
  // 不分层的话，532 个原始稿会把 7 本手册挤没——量差两个数量级。
  const buckets = { playbook: [], video: [], raw: [] }
  for (const s of scored) buckets[s.file.corpus]?.push(s)

  const seen = new Set()
  const perFileCount = new Map()
  const collect = (list, quota) => {
    const out = []
    for (const s of list) {
      if (out.length >= quota) break
      const key = `${s.file.corpus}:${s.file.rel}`
      const used = perFileCount.get(key) || 0
      if (used >= perFile) continue
      if (!s.positions.length) continue
      const sn = snippetAround(s.sec.text, s.positions[0], query)
      const id = `${key}#${s.sec.startLine}`
      if (seen.has(id)) continue
      seen.add(id)
      perFileCount.set(key, used + 1)
      out.push({
        corpus: s.file.corpus,
        ref: key,
        doc: firstHeading(s.sec.text, path.basename(s.file.rel, '.md')) || path.basename(s.file.rel, '.md'),
        section: s.sec.title || '（文件开头）',
        line: s.sec.startLine + sn.line - 1,
        snippet: sn.text,
        score: Number(s.score.toFixed(1)),
      })
    }
    return out
  }

  const hits = []
  const qPlay = Math.max(2, Math.ceil(limit / 2))
  const qVideo = Math.max(1, Math.ceil(limit / 4))
  hits.push(...collect(buckets.playbook, qPlay))
  hits.push(...collect(buckets.video, qVideo))
  if (hits.length < limit) hits.push(...collect(buckets.raw, limit - hits.length))
  if (hits.length < limit) hits.push(...collect(buckets.playbook, limit - hits.length))
  if (hits.length < limit) hits.push(...collect(buckets.raw, limit - hits.length))
  return { query, terms: ts, hits: hits.slice(0, limit) }
}

function resolveRef(ref) {
  const raw = String(ref || '').trim()
  if (!raw) throw new Error('缺少 path。用 `playbook:01-薛辉….md` 或 `raw:xxx.doc.md` 这样的 ref，先调 catalog 看有哪些。')
  const m = /^([a-z]+):(.+)$/i.exec(raw)
  if (m && CORPORA[m[1].toLowerCase()]) {
    const corpus = m[1].toLowerCase()
    const rel = m[2].replace(/\\/g, '/')
    const abs = path.join(KB_ROOT, CORPORA[corpus].dir, rel)
    if (statSafe(abs)) return { corpus, rel, abs }
    // 允许只给文件名后缀
    const cand = listCorpus(corpus).filter((f) => f.rel.endsWith(rel) || f.rel.includes(rel))
    if (cand.length === 1) return { corpus, rel: cand[0].rel, abs: cand[0].abs }
    throw new Error(`找不到 ${raw}${cand.length > 1 ? `（有 ${cand.length} 个候选，请写全一点）` : ''}`)
  }
  // 未带语料前缀：按文件名在所有语料里找唯一匹配
  const rel = raw.replace(/\\/g, '/')
  const cand = listAll().filter((f) => f.rel === rel || f.rel.endsWith(`/${rel}`) || f.rel.includes(rel))
  if (cand.length === 1) return cand[0]
  if (cand.length === 0) throw new Error(`找不到 ${raw}。先调 catalog 看有哪些文件。`)
  throw new Error(`"${raw}" 匹配到 ${cand.length} 个文件：${cand.slice(0, 6).map((c) => `${c.corpus}:${c.rel}`).join('、')}。请写更具体。`)
}

/** 读全文（带行号），或只读一段。 */
export function readDoc(ref, { offset = 1, limit = 200 } = {}) {
  const f = resolveRef(ref)
  const text = readCached(f.abs)
  if (text == null) throw new Error(`读不到 ${f.corpus}:${f.rel}（文件过大或不存在）`)
  const lines = text.split('\n')
  const from = Math.max(1, Number(offset) || 1)
  const to = Math.min(lines.length, from + Math.max(1, Number(limit) || 200) - 1)
  const body = lines
    .slice(from - 1, to)
    .map((l, i) => `${String(from + i).padStart(4)}| ${l}`)
    .join('\n')
  return {
    ref: `${f.corpus}:${f.rel}`,
    totalLines: lines.length,
    shown: `${from}-${to}`,
    body,
  }
}

/** 大纲：所有标题 + 行号 + 层级，用来决定读哪一段。 */
export function outline(ref) {
  const f = resolveRef(ref)
  const text = readCached(f.abs) ?? ''
  const lines = text.split('\n')
  const heads = []
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^(#{1,4})\s+(.+)$/.exec(lines[i])
    if (m) heads.push(`${i + 1}| ${m[1]} ${m[2].trim()}`)
  }
  return {
    ref: `${f.corpus}:${f.rel}`,
    chars: text.length,
    headings: heads,
  }
}

export const stats = () => ({
  root: KB_ROOT,
  corpora: Object.fromEntries(Object.keys(CORPORA).map((k) => [k, listCorpus(k).length])),
})
