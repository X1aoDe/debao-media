/* 知识库加载器（kbstore）
 *
 * 语料不进仓库、不进安装包：由用户自己在「设置 → 知识库」里指一个本机文件夹，
 * 或者接云端（IMA）。这里只负责「去哪儿读、怎么切段、怎么按关键词找」。
 *
 * settings.json 里的形状：
 *   kb: {
 *     source: 'off' | 'local' | 'bundled' | 'ima',
 *     dir: 'D:\\我自己的知识库',
 *     ima: { clientId, apiKey, kbId },
 *     limit: 3            // 每次生成最多塞几段
 *   }
 */
import fs from 'node:fs'
import path from 'node:path'

const MD_EXT = /\.(md|markdown|txt)$/i
const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_FILES = 400
const MAX_DEPTH = 4

const GROUP_LABEL = {
  distilled: '手册',
  videos: '笔记',
  raw: '素材',
  _root: '全部',
}

let cache = { key: '', docs: [], at: 0 }

function safeRead(file, limit) {
  try {
    const st = fs.statSync(file)
    if (!st.isFile() || st.size > MAX_FILE_BYTES) return ''
    return fs.readFileSync(file, 'utf8').slice(0, limit || MAX_FILE_BYTES)
  } catch (e) {
    return ''
  }
}

function walk(dir, depth, out) {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES) return
  let names = []
  try {
    names = fs.readdirSync(dir, { withFileTypes: true })
  } catch (e) {
    return
  }
  for (const d of names) {
    if (out.length >= MAX_FILES) return
    if (d.name.startsWith('.')) continue
    const full = path.join(dir, d.name)
    if (d.isDirectory()) {
      if (d.name === 'node_modules' || d.name === 'data') continue
      walk(full, depth + 1, out)
    } else if (MD_EXT.test(d.name)) {
      out.push(full)
    }
  }
}

function titleOf(file, text) {
  const base = path.basename(file).replace(MD_EXT, '')
  const m = text.match(/^#\s+(.+)$/m)
  return (m && m[1].trim()) || base
}

/* 按标题把一篇 md 切成段：每段带所在小标题 */
function sectionsOf(text, rel) {
  const lines = text.split(/\r?\n/)
  const out = []
  let head = ''
  let buf = []
  const flush = () => {
    const body = buf.join('\n').trim()
    if (body) out.push({ heading: head, text: body })
    buf = []
  }
  for (const line of lines) {
    const m = line.match(/^(#{1,4})\s+(.+)$/)
    if (m) {
      flush()
      head = m[2].trim()
      continue
    }
    buf.push(line)
  }
  flush()
  if (!out.length) out.push({ heading: '', text: text.trim() })
  return out.map((s) => ({ rel, heading: s.heading, text: s.text.slice(0, 4000) }))
}

/* ---------- 本机 / 自带：扫描文件夹 ---------- */

function scanDir(root) {
  const files = []
  walk(root, 0, files)
  const docs = []
  for (const full of files) {
    const text = safeRead(full, 120000)
    if (!text.trim()) continue
    const rel = path.relative(root, full).split(path.sep).join('/')
    const group = rel.includes('/') ? rel.split('/')[0] : '_root'
    docs.push({
      ref: 'file:' + rel,
      name: path.basename(full).replace(MD_EXT, ''),
      title: titleOf(full, text),
      group,
      rel,
      size: text.length,
      headings: (text.match(/^#{1,3}\s+(.+)$/gm) || []).slice(0, 6).map((h) => h.replace(/^#{1,3}\s+/, '').trim()),
      sections: sectionsOf(text, rel),
    })
  }
  return docs
}

function loadDocs(root) {
  const key = root + '|' + (fs.existsSync(root) ? fs.statSync(root).mtimeMs : 0)
  if (cache.key === key) return cache.docs
  const docs = fs.existsSync(root) ? scanDir(root) : []
  cache = { key, docs, at: Date.now() }
  return docs
}

/* ---------- 检索（中文按二字组，英文按词） ---------- */

function tokens(q) {
  const s = String(q || '').toLowerCase()
  const out = new Set()
  for (const w of s.match(/[a-z0-9]{2,}/g) || []) out.add(w)
  const cjk = s.replace(/[^\u4e00-\u9fa5]/g, '')
  for (let i = 0; i < cjk.length - 1; i++) out.add(cjk.slice(i, i + 2))
  if (cjk.length === 1) out.add(cjk)
  return [...out]
}

function scoreText(tk, text, heading) {
  let score = 0
  const low = text.toLowerCase()
  for (const t of tk) {
    let idx = low.indexOf(t)
    let hits = 0
    while (idx >= 0 && hits < 40) {
      hits++
      idx = low.indexOf(t, idx + t.length)
    }
    if (hits) score += hits * (t.length >= 2 ? 3 : 1)
  }
  if (heading) {
    const h = heading.toLowerCase()
    for (const t of tk) if (h.includes(t)) score += 8
  }
  return score
}

function snippetAround(text, tk, span) {
  const low = text.toLowerCase()
  let at = -1
  for (const t of tk) {
    const i = low.indexOf(t)
    if (i >= 0 && (at < 0 || i < at)) at = i
  }
  if (at < 0) at = 0
  const n = span || 160
  const start = Math.max(0, at - Math.floor(n / 3))
  const s = text.slice(start, start + n).replace(/\s+/g, ' ').trim()
  return (start > 0 ? '…' : '') + s + (start + n < text.length ? '…' : '')
}

/* ---------- IMA 云端 ---------- */

const IMA_BASE = 'https://ima.qq.com'

function imaCreds(cfg) {
  const ima = (cfg && cfg.ima) || {}
  const clientId = ima.clientId || process.env.IMA_OPENAPI_CLIENTID || process.env.IMA_CLIENT_ID || ''
  const apiKey = ima.apiKey || process.env.IMA_OPENAPI_APIKEY || process.env.IMA_API_KEY || ''
  return { clientId, apiKey, kbId: ima.kbId || '' }
}

async function imaCall(apiPath, body, creds) {
  const res = await fetch(IMA_BASE + '/openapi/wiki/v1/' + apiPath, {
    method: 'POST',
    headers: {
      'ima-openapi-clientid': creds.clientId,
      'ima-openapi-apikey': creds.apiKey,
      'ima-openapi-ctx': 'skill_version=debao-bridge',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch (e) {
    throw new Error('IMA 返回的不是 JSON：' + text.slice(0, 120))
  }
  if (json && json.code !== 0) throw new Error(json.msg || ('IMA 错误 ' + json.code))
  return json && json.data
}

async function imaSearch(query, limit, creds) {
  if (!creds.clientId || !creds.apiKey) throw new Error('没填 IMA 的 client_id / api_key')
  if (!creds.kbId) throw new Error('没填 IMA 知识库 ID（在知识库网址里能看到）')
  const data = await imaCall('search_knowledge', { query: String(query || '').slice(0, 200), knowledge_base_id: creds.kbId, cursor: '' }, creds)
  const list = (data && (data.knowledge_list || data.list || data.items)) || []
  const hits = list.slice(0, limit || 8).map((it, i) => ({
    ref: 'ima:' + (it.media_id || it.knowledge_id || i),
    doc: it.title || it.name || ('IMA 结果 ' + (i + 1)),
    section: it.folder_name || '',
    snippet: String(it.highlight || it.content || it.snippet || '').slice(0, 240),
    score: 100 - i * 5,
  }))
  return hits
}

/* ---------- 对外 ---------- */

export function kbStatus(cfg) {
  const kb = (cfg || {}).kb || {}
  const source = kb.source || 'auto'
  if (source === 'off') return { source: 'off', ready: false, note: '已关闭，生成时不带知识库' }
  if (source === 'ima') {
    const c = imaCreds(kb)
    return {
      source: 'ima',
      ready: !!(c.clientId && c.apiKey && c.kbId),
      note: c.clientId && c.apiKey ? (c.kbId ? '云端 IMA 已配置' : '还差知识库 ID') : '还没填 IMA 凭证',
    }
  }
  if (source === 'local' || source === 'auto') {
    const dir = kb.dir || ''
    if (!dir) return { source, ready: false, note: source === 'auto' ? '没指定文件夹（生成时不带知识库）' : '还没选文件夹' }
    const ok = fs.existsSync(dir)
    const docs = ok ? loadDocs(dir) : []
    return { source, ready: ok && docs.length > 0, dir, docs: docs.length, note: ok ? (docs.length ? '本机文件夹 ' + docs.length + ' 篇' : '文件夹里没找到 .md / .txt') : '文件夹不存在' }
  }
  return { source, ready: false, note: '未知来源' }
}

export function kbCatalog(cfg, bundledRoot) {
  const kb = (cfg || {}).kb || {}
  const source = kb.source || 'auto'
  if (source === 'ima') {
    const c = imaCreds(kb)
    return {
      source: 'ima',
      root: '',
      groups: [],
      total: 0,
      search: !!(c.clientId && c.apiKey && c.kbId),
      note: c.kbId ? '云端 IMA 知识库（内容在云端，这里不列文件）' : '填了知识库 ID 才会检索',
      imaKbId: c.kbId || '',
    }
  }
  const dir = source === 'bundled' ? bundledRoot : kb.dir || ''
  const docs = dir && fs.existsSync(dir) ? loadDocs(dir) : []
  const map = new Map()
  for (const d of docs) {
    const key = d.group
    if (!map.has(key)) map.set(key, { key, label: GROUP_LABEL[key] || key, docs: [] })
    map.get(key).docs.push({ ref: d.ref, name: d.name, title: d.title, size: d.size, headings: d.headings })
  }
  const groups = [...map.values()].sort((a, b) => b.docs.length - a.docs.length)
  return {
    source,
    root: dir || '',
    groups,
    total: docs.length,
    search: docs.length > 0,
    note: docs.length ? '' : dir ? '这个文件夹里没有 .md / .txt' : '还没指定文件夹',
  }
}

export function kbDoc(cfg, ref, limit, bundledRoot) {
  const s = String(ref || '')
  if (s.startsWith('ima:')) return { ref: s, name: 'IMA', text: '（IMA 的内容在云端，直接用搜索看摘录）' }
  if (!s.startsWith('file:')) return null
  const kb = (cfg || {}).kb || {}
  const source = kb.source || 'auto'
  const dir = source === 'bundled' ? bundledRoot : kb.dir || ''
  if (!dir) return null
  const rel = s.slice(5)
  if (rel.includes('..')) return null
  const full = path.join(dir, rel)
  const text = safeRead(full, 400000)
  if (!text) return null
  return { ref: s, name: path.basename(full).replace(MD_EXT, ''), size: text.length, text: text.slice(0, limit || 24000) }
}

export async function searchKb(cfg, query, limit, bundledRoot) {
  const kb = (cfg || {}).kb || {}
  const source = kb.source || 'auto'
  if (source === 'off') return { hits: [], note: '知识库已关闭' }
  if (source === 'ima') {
    try {
      const hits = await imaSearch(query, limit || 8, imaCreds(kb))
      return { hits, total: hits.length }
    } catch (e) {
      return { hits: [], error: e.message }
    }
  }
  const dir = source === 'bundled' ? bundledRoot : kb.dir || ''
  if (!dir) return { hits: [], note: '还没指定知识库文件夹' }
  const docs = loadDocs(dir)
  const tk = tokens(query)
  if (!tk.length) return { hits: [], total: 0 }
  const hits = []
  for (const d of docs) {
    for (const sec of d.sections) {
      const score = scoreText(tk, sec.text, (sec.heading || '') + ' ' + d.title)
      if (score <= 0) continue
      hits.push({
        ref: d.ref,
        doc: d.title,
        section: sec.heading || '',
        snippet: snippetAround(sec.text, tk),
        score,
      })
    }
  }
  hits.sort((a, b) => b.score - a.score)
  const top = hits.slice(0, limit || 8)
  return { hits: top, total: hits.length, scanned: docs.length }
}

export async function kbBlock(cfg, prompt, limit, bundledRoot) {
  const r = await searchKb(cfg, prompt, limit || 3, bundledRoot)
  if (!r.hits || !r.hits.length) return { block: '', hits: [], note: r.note || r.error || '' }
  const body = r.hits
    .map((h, i) => '【' + (i + 1) + '】《' + h.doc + '》' + (h.section ? ' · ' + h.section : '') + '\n' + h.snippet)
    .join('\n\n')
  return {
    block:
      '\n\n【可以参考的本机资料（用户自己整理，不一定普适；能用就用，不能用就忽略）】\n' +
      body +
      '\n\n引用时只在正文里说「按你资料里的做法」，不要编造资料里没有的数字或案例。',
    hits: r.hits,
    note: '',
  }
}
