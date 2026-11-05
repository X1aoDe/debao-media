/**
 * 德饱采集桥（debao bridge）
 *
 * 浏览器扩展在页面上点「采集」→ POST 到这里 → 存进 data/queue.json；
 * 采集创作者后台时，另外把后台接口的原始快照存进 data/account.json。
 * 德饱自媒体助手插件（DSH 侧栏）读这些文件，把数据填进拆解/仿写/视频解析/账号学习。
 *
 * 只监听 127.0.0.1，只读写本目录 data/*.json，不联网、不上传任何东西。
 *
 * 启动： node server.mjs  （或双击 start-bridge.bat）
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runAnalysis, keyStatus as analyzeKeyStatus, framesDir } from './analyze.mjs'
import { generateStream, textProvider, TEXT_MODEL } from './text.mjs'
import { hotBoard, keywordBoard, searchUsers, userProfile } from './social.mjs'
import { summarizeAccount } from './account.mjs'
import { createStore as createBackendStore, parseCsv, parseXlsx, normalizeRow, signatureOf, kbCatalog, kbDoc, searchKb } from './backend.mjs'
import { createStudy } from './study.mjs'
import {
  keyInfo as tkKeyInfo,
  fetchNote as tkFetchNote,
  fetchUserNotes as tkFetchUserNotes,
  searchNotes as tkSearchNotes,
  accountUsage as tkAccountUsage,
} from './tikhub.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// 桌面版（exe）用 DEBAO_DATA_DIR 指定数据目录；插件版默认放在 bridge/data
const DATA_DIR = process.env.DEBAO_DATA_DIR ? path.resolve(process.env.DEBAO_DATA_DIR) : path.join(HERE, 'data')
try {
  fs.mkdirSync(DATA_DIR, { recursive: true })
} catch (e) {}
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json')
const KB_FILE = path.join(DATA_DIR, 'kb.json')
const ANALYSES_FILE = path.join(DATA_DIR, 'analyses.json')
const GENERATIONS_FILE = path.join(DATA_DIR, 'generations.json')
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json')
const BLOGGER_FILE = path.join(DATA_DIR, 'bloggers.json')
const HOT_CACHE_FILE = path.join(DATA_DIR, 'hot_cache.json')
const ACCOUNT_FILE = path.join(DATA_DIR, 'account.json')
const PORT = Number(process.env.DEBAO_BRIDGE_PORT || process.env.MUSE_BRIDGE_PORT || 53210)
const MAX_ITEMS = 500
const MAX_ANALYSES = 300
const MAX_GENERATIONS = 300
/* 扩展把视频字节直接传过来的上限；超过就退回"只存直链"的老路 */
const MAX_UPLOAD_BYTES = Number(process.env.DEBAO_MAX_UPLOAD_MB || 200) * 1048576
const INSP_FILE = path.join(DATA_DIR, 'inspirations.json')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
const backendStore = createBackendStore(DATA_DIR)
const study = createStudy(DATA_DIR)
let accountCache = null /* /api/account/summary 按 updatedAt 缓存，避免每次重解析几百 KB */
const MAX_INSP = 800
const VERSION = '2.7.0'

fs.mkdirSync(DATA_DIR, { recursive: true })

/* ------------------------------- 存储 ------------------------------- */

function readJSON(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    const data = JSON.parse(raw)
    return data == null ? fallback : data
  } catch (e) {
    return fallback
  }
}

function writeJSON(file, value) {
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

function readQueue() {
  const arr = readJSON(QUEUE_FILE, [])
  return Array.isArray(arr) ? arr : []
}

function writeQueue(items) {
  writeJSON(QUEUE_FILE, items.slice(0, MAX_ITEMS))
}

let queue = readQueue()

/* 解析任务（内存里，进程重启就没了；结果本身会落进 analyses.json） */
const jobs = new Map()

/* ------------------------------- 归一化 ------------------------------ */

function num(v) {
  if (typeof v === 'number' && isFinite(v)) return v
  const s = String(v == null ? '' : v).trim()
  if (!s) return 0
  const m = s.match(/([\d.]+)\s*([万千wk])?/i)
  if (!m) return 0
  const base = parseFloat(m[1])
  if (isNaN(base)) return 0
  const unit = (m[2] || '').toLowerCase()
  if (unit === '万' || unit === 'w') return Math.round(base * 10000)
  if (unit === '千' || unit === 'k') return Math.round(base * 1000)
  return Math.round(base)
}

function platformOf(raw, url) {
  const p = String((raw && raw.platform) || '').toLowerCase()
  if (p === 'xhs' || p === 'xiaohongshu') return 'xhs'
  if (p === 'douyin' || p === 'dy') return 'douyin'
  return /douyin\.com/.test(String(url || '')) ? 'douyin' : 'xhs'
}

function pickMedia(raw, note) {
  const videoUrl = String(raw.videoUrl || raw.playUrl || (note && note.videoUrl) || '').trim()
  const images = raw.images || (note && note.imageList) || []
  const list = (Array.isArray(images) ? images : [])
    .map((x) => (typeof x === 'string' ? x : x && (x.url || x.urlDefault || x.masterUrl)))
    .filter(Boolean)
  const mediaType =
    raw.mediaType === 'video' || raw.mediaType === 'image'
      ? raw.mediaType
      : raw.type === 'video' || videoUrl
        ? 'video'
        : 'image'
  return { mediaType, videoUrl, images: list.slice(0, 18) }
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null
  const note = raw.note || {}
  const noteId = String(raw.noteId || note.noteId || raw.awemeId || '').trim()
  const url = String(raw.url || '').trim()
  if (!noteId && !url) return null

  const platform = platformOf(raw, url)
  const desc = String(raw.desc || note.desc || '').trim()
  const tagSource = raw.tags || raw.tagList || note.tagList || note.tags || []
  const tags = (Array.isArray(tagSource) ? tagSource : [])
    .map((t) => (typeof t === 'string' ? t : t && (t.name || t.tagName || t.tag_name)))
    .filter(Boolean)
    .map((t) => String(t).replace(/^#/, '').trim())
    .filter(Boolean)
  if (!tags.length && desc) {
    const found = desc.match(/#([^\s#\[\]]{1,30})/g) || []
    found.forEach((t) => tags.push(t.replace(/^#/, '')))
  }

  const stats = raw.stats || {}
  const author = raw.author || {}
  const media = pickMedia(raw, note)
  const id =
    noteId ? 'p_' + platform + '_' + noteId : 'u_' + platform + '_' + Buffer.from(url).toString('base64url').slice(0, 20)

  return {
    id: id,
    noteId: noteId,
    platform: platform,
    title: String(raw.title || note.title || raw.desc?.slice(0, 30) || '').trim(),
    desc: desc,
    tags: Array.from(new Set(tags)).slice(0, 30),
    coverUrl: String(raw.coverUrl || raw.cover || (media.images[0] || '')).trim(),
    type: media.mediaType === 'video' ? 'video' : 'image',
    mediaType: media.mediaType,
    videoUrl: media.videoUrl,
    videoUrlFrom: String(raw.videoUrlFrom || '').trim(),
    diag: raw._diag && typeof raw._diag === 'object' ? raw._diag : raw.diag && typeof raw.diag === 'object' ? raw.diag : undefined,
    localFile: String(raw.localFile || '').trim(),
    images: media.images,
    durationSec: num(raw.durationSec || raw.duration),
    musicTitle: String(raw.musicTitle || (note.music && note.music.title) || '').trim(),
    stats: {
      likes: num(stats.likes != null ? stats.likes : stats.likedCount != null ? stats.likedCount : stats.digg_count),
      collects: num(
        stats.collects != null ? stats.collects : stats.collectedCount != null ? stats.collectedCount : stats.collect_count,
      ),
      comments: num(
        stats.comments != null ? stats.comments : stats.commentCount != null ? stats.commentCount : stats.comment_count,
      ),
      shares: num(stats.shares != null ? stats.shares : stats.share_count),
    },
    author: {
      name: String(author.name || author.nickname || '').trim(),
      id: String(author.id || author.userid || author.sec_uid || '').trim(),
      avatar: String(author.avatar || '').trim(),
    },
    publishTime: String(raw.publishTime || raw.create_time || '').trim(),
    url: url,
    capturedAt: Number(raw.capturedAt) || Date.now(),
    source: String(raw.source || 'extension'),
    remark: String(raw.remark || '').trim(),
    category: String(raw.category || '').trim(),
    rating: num(raw.rating),
  }
}

function upsert(items) {
  const incoming = (Array.isArray(items) ? items : [items]).map(normalize).filter(Boolean)
  const ids = []
  for (const item of incoming) {
    const idx = queue.findIndex((x) => x.id === item.id)
    if (idx >= 0) {
      /* 重复采集时别把上一轮已经拿到的东西洗掉（直链/本地文件/时长） */
      const prev = queue[idx]
      const merged = Object.assign({}, prev, item, { capturedAt: Date.now() })
      ;['videoUrl', 'localFile', 'coverUrl', 'videoUrlFrom'].forEach((k) => {
        if (!item[k] && prev[k]) merged[k] = prev[k]
      })
      if (!item.durationSec && prev.durationSec) merged.durationSec = prev.durationSec
      queue[idx] = merged
    } else {
      queue.unshift(Object.assign({}, item, { capturedAt: Date.now() }))
    }
    ids.push(item.id)
  }
  queue = queue.slice(0, MAX_ITEMS)
  writeQueue(queue)
  return ids
}

/* ------------------------------- 统计 ------------------------------- */

function median(arr) {
  if (!arr.length) return 0
  const s = arr.slice().sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

function topCounts(list, limit) {
  const m = new Map()
  for (const x of list) {
    const k = String(x || '').trim()
    if (!k) continue
    m.set(k, (m.get(k) || 0) + 1)
  }
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || 8)
}

function buildStats() {
  const own = queue.filter((x) => x.source === 'creator')
  const ref = queue.filter((x) => x.source !== 'creator')
  const all = queue
  const byPlat = { xhs: 0, douyin: 0 }
  const byKind = { video: 0, image: 0 }
  for (const x of all) {
    byPlat[x.platform === 'douyin' ? 'douyin' : 'xhs'] += 1
    byKind[x.mediaType === 'video' ? 'video' : 'image'] += 1
  }
  const likes = all.map((x) => (x.stats && x.stats.likes) || 0)
  const collects = all.map((x) => (x.stats && x.stats.collects) || 0)
  const comments = all.map((x) => (x.stats && x.stats.comments) || 0)
  const ratio = all.map((x) => {
    const s = x.stats || {}
    return s.likes ? Math.round(((s.collects || 0) / s.likes) * 100) : 0
  })
  const tagList = []
  all.forEach((x) => (x.tags || []).forEach((t) => tagList.push(t)))
  const authors = all.map((x) => (x.author && x.author.name) || '')
  const recent = all.filter((x) => Date.now() - (x.capturedAt || 0) < 7 * 864e5)
  const best = all
    .slice()
    .sort((a, b) => ((b.stats && b.stats.likes) || 0) - ((a.stats && a.stats.likes) || 0))
    .slice(0, 5)

  const lines = []
  lines.push(`采集总数：${all.length} 条（小红书 ${byPlat.xhs} / 抖音 ${byPlat.douyin}；视频 ${byKind.video} / 图文 ${byKind.image}）`)
  lines.push(`其中我自己发的：${own.length} 条；对标参考：${ref.length} 条`)
  if (all.length) {
    lines.push(`平均互动：赞 ${Math.round(likes.reduce((a, b) => a + b, 0) / all.length)} / 藏 ${Math.round(collects.reduce((a, b) => a + b, 0) / all.length)} / 评 ${Math.round(comments.reduce((a, b) => a + b, 0) / all.length)}`)
    lines.push(`收藏率中位：${median(ratio.filter((x) => x > 0))}%（藏/赞）；点赞中位 ${median(likes)}`)
    lines.push(`最近 7 天新增：${recent.length} 条`)
  }
  const t = topCounts(tagList, 10)
  if (t.length) lines.push('高频标签：' + t.map((x) => `#${x[0]}(${x[1]})`).join(' '))
  const a = topCounts(authors, 6)
  if (a.length) lines.push('高频作者：' + a.map((x) => `${x[0]}(${x[1]})`).join(' '))
  if (best.length) {
    lines.push('最高互动的 5 条：')
    best.forEach((x, i) => {
      const s = x.stats || {}
      lines.push(`  ${i + 1}. [${x.platform === 'douyin' ? '抖音' : '小红书'}] ${x.title || '(无标题)'} — 赞 ${s.likes || 0} / 藏 ${s.collects || 0} / 评 ${s.comments || 0}`)
    })
  }
  if (own.length) {
    const ol = own.map((x) => (x.stats && x.stats.likes) || 0)
    lines.push(`我的作品平均赞：${Math.round(ol.reduce((a2, b) => a2 + b, 0) / own.length)}，中位 ${median(ol)}`)
  }
  const acc = readJSON(ACCOUNT_FILE, null)
  if (acc && acc.snapshot) {
    lines.push(`后台快照：${acc.snapshot.kind || '账号概览'}，更新于 ${new Date(acc.updatedAt || Date.now()).toLocaleString()}`)
  }
  if (!all.length) lines.push('（队列是空的，先在浏览器里点几下采集。）')

  return {
    ok: true,
    version: VERSION,
    text: lines.join('\n'),
    counts: { total: all.length, own: own.length, ref: ref.length, byPlat, byKind },
    topTags: t.map((x) => ({ tag: x[0], n: x[1] })),
    topAuthors: a.map((x) => ({ name: x[0], n: x[1] })),
  }
}

/* ------------------------------- HTTP ------------------------------- */

function send(res, code, body) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  const h = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  }
  /* 从 https 页面（小红书/抖音）打 127.0.0.1 时要过 Chrome 的 Private Network Access */
  if (res.__pna) h['Access-Control-Allow-Private-Network'] = 'true'
  res.writeHead(code, h)
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > 16 * 1024 * 1024) {
        reject(new Error('payload too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (!text) return resolve(null)
      try {
        resolve(JSON.parse(text))
      } catch (e) {
        reject(new Error('invalid json'))
      }
    })
    req.on('error', reject)
  })
}

function readRaw(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > (maxBytes || 16 * 1024 * 1024)) {
        reject(new Error('文件超过上限 ' + Math.round((maxBytes || 16777216) / 1048576) + 'MB'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const method = (req.method || 'GET').toUpperCase()
  const u = new URL(req.url || '/', 'http://127.0.0.1')
  const p = u.pathname

  if (method === 'OPTIONS') {
    res.__pna = String(req.headers['access-control-request-private-network'] || '') === 'true'
    return send(res, 204, '')
  }

  try {
    if (method === 'GET' && (p === '/health' || p === '/api/health')) {
      return send(res, 200, { ok: true, port: PORT, count: queue.length, version: VERSION })
    }

    if (method === 'GET' && p === '/api/queue') {
      const plat = u.searchParams.get('platform')
      const items = plat ? queue.filter((x) => x.platform === plat) : queue
      return send(res, 200, { ok: true, items: items, count: items.length, total: queue.length })
    }

    // 扩展采集（单个或数组）；/api/batch-save 兼容薯小智助手的旧路径
    if (method === 'POST' && (p === '/api/capture' || p === '/api/batch-save')) {
      const body = await readBody(req)
      if (!body) return send(res, 400, { ok: false, error: 'empty body' })
      // 旧扩展（薯小智助手）发的是 { notes: [...] } / { items: [...] }，也一并认
      const unwrapped =
        !Array.isArray(body) && body && typeof body === 'object' && (Array.isArray(body.notes) || Array.isArray(body.items) || Array.isArray(body.list))
          ? body.notes || body.items || body.list
          : body
      const ids = upsert(unwrapped)
      console.log(`[capture] +${ids.length} -> ${queue.length} 条`)
      return send(res, 200, { ok: true, ids: ids, count: queue.length })
    }

    if (method === 'DELETE' && p === '/api/item') {
      const id = u.searchParams.get('id')
      if (!id) return send(res, 400, { ok: false, error: 'id required' })
      const before = queue.length
      queue = queue.filter((x) => x.id !== id)
      writeQueue(queue)
      return send(res, 200, { ok: true, removed: before - queue.length, count: queue.length })
    }

    if (method === 'POST' && p === '/api/clear') {
      queue = []
      writeQueue(queue)
      return send(res, 200, { ok: true, count: 0 })
    }

    /* ---- 清理数据：桌面版「清除数据 / 恢复出厂」用 ----
     * scope: library 采集库 | works 作品库 | insp 灵感库 | analyses 解析记录
     *        accounts 我的账号 | bloggers 博主库 | all 全部
     */
    if (method === 'POST' && p === '/api/clear-data') {
      const body = (await readBody(req)) || {}
      const scope = String(body.scope || 'all')
      const want = (k) => scope === 'all' || scope === k
      const out = { ok: true, scope }
      const wipeDir = (name) => {
        const dir = path.join(DATA_DIR, name)
        try {
          fs.rmSync(dir, { recursive: true, force: true })
          fs.mkdirSync(dir, { recursive: true })
          return true
        } catch (e) {
          return false
        }
      }
      if (want('library')) {
        out.library = queue.length
        queue = []
        writeQueue(queue)
        wipeDir('media')
      }
      if (want('works')) {
        const gens = readJSON(GENERATIONS_FILE, [])
        out.works = Array.isArray(gens) ? gens.length : 0
        writeJSON(GENERATIONS_FILE, [])
      }
      if (want('insp')) {
        const ins = readJSON(INSP_FILE, [])
        out.insp = Array.isArray(ins) ? ins.length : 0
        writeJSON(INSP_FILE, [])
      }
      if (want('analyses')) {
        const an = readJSON(ANALYSES_FILE, [])
        out.analyses = Array.isArray(an) ? an.length : 0
        writeJSON(ANALYSES_FILE, [])
        wipeDir('frames')
      }
      if (want('accounts')) {
        const acc = readJSON(ACCOUNTS_FILE, [])
        out.accounts = Array.isArray(acc) ? acc.length : 0
        writeJSON(ACCOUNTS_FILE, [])
      }
      if (want('bloggers')) {
        const bg = readJSON(BLOGGER_FILE, [])
        out.bloggers = Array.isArray(bg) ? bg.length : 0
        writeJSON(BLOGGER_FILE, [])
      }
      if (scope === 'all') {
        writeJSON(KB_FILE, { profile: null, notes: [] })
        writeJSON(ACCOUNT_FILE, {})
        writeJSON(HOT_CACHE_FILE, {})
        out.ok = true
      }
      writeJSON(HOT_CACHE_FILE, {})
      return send(res, 200, out)
    }

    /* ---- 批量：勾选后删除 / 编辑（分类、对标评分、备注） ---- */
    if (method === 'POST' && (p === '/api/bulk-delete' || p === '/api/bulk-patch')) {
      const body = (await readBody(req)) || {}
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : []
      if (!ids.length) return send(res, 400, { ok: false, error: 'ids required' })
      const set = new Set(ids)
      if (p === '/api/bulk-delete') {
        const before = queue.length
        queue = queue.filter((x) => !set.has(x.id))
        writeQueue(queue)
        return send(res, 200, { ok: true, removed: before - queue.length, count: queue.length })
      }
      const patch = {}
      for (const k of ['remark', 'category', 'rating']) {
        if (body[k] !== undefined && body[k] !== null && body[k] !== '') patch[k] = body[k]
      }
      const clear = Array.isArray(body.clear) ? body.clear : []
      let n = 0
      queue = queue.map((x) => {
        if (!set.has(x.id)) return x
        n += 1
        const next = Object.assign({}, x, patch)
        clear.forEach((k) => {
          next[k] = k === 'rating' ? 0 : ''
        })
        return next
      })
      writeQueue(queue)
      return send(res, 200, { ok: true, updated: n, patch: patch, clear: clear })
    }

    if (method === 'PATCH' && p === '/api/item') {
      const body = await readBody(req)
      const id = body && body.id
      if (!id) return send(res, 400, { ok: false, error: 'id required' })
      const idx = queue.findIndex((x) => x.id === id)
      if (idx < 0) return send(res, 404, { ok: false, error: 'not found' })
      const patch = {}
      for (const k of ['remark', 'category', 'rating', 'title', 'desc', 'tags']) {
        if (body[k] !== undefined) patch[k] = body[k]
      }
      queue[idx] = Object.assign({}, queue[idx], patch)
      writeQueue(queue)
      return send(res, 200, { ok: true, item: queue[idx] })
    }

    /* ---- 统计：账号学习页「读本地统计」 ---- */
    if (method === 'GET' && p === '/api/stats') {
      return send(res, 200, buildStats())
    }

    /* ---- 账号画像 / 知识库 ---- */
    if (method === 'GET' && p === '/api/kb') {
      const kb = readJSON(KB_FILE, { profile: null, notes: [], updatedAt: 0 })
      const analyses = readJSON(ANALYSES_FILE, [])
      return send(res, 200, {
        ok: true,
        profile: kb.profile || null,
        notes: kb.notes || [],
        updatedAt: kb.updatedAt || 0,
        analyses: Array.isArray(analyses) ? analyses.length : 0,
      })
    }

    if (method === 'POST' && (p === '/api/kb' || p === '/api/kb/profile')) {
      const body = await readBody(req)
      if (!body) return send(res, 400, { ok: false, error: 'empty body' })
      const kb = readJSON(KB_FILE, { profile: null, notes: [], updatedAt: 0 })
      const profile = body.profile || body
      kb.profile = profile
      if (Array.isArray(body.notes)) kb.notes = body.notes
      kb.updatedAt = Date.now()
      writeJSON(KB_FILE, kb)
      return send(res, 200, { ok: true, updatedAt: kb.updatedAt })
    }

    /* ---- 视频 / 音乐解析结论 ---- */
    if (method === 'GET' && p === '/api/analyses') {
      const arr = readJSON(ANALYSES_FILE, [])
      return send(res, 200, { ok: true, items: Array.isArray(arr) ? arr : [] })
    }

    /* ---- token / 费用（本机桥调模型的用量 + TikHub 用量，可改价） ---- */
    if (method === 'GET' && p === '/api/usage') {
      const st = readJSON(SETTINGS_FILE, {}) || {}
      const priceIn = Number(st.priceIn != null ? st.priceIn : process.env.DEBAO_PRICE_IN || 0.3) /* 元 / 百万 token */
      const priceOut = Number(st.priceOut != null ? st.priceOut : process.env.DEBAO_PRICE_OUT || 0.6)
      const usdCny = Number(st.usdCny != null ? st.usdCny : process.env.DEBAO_USD_CNY || 7.2)

      const sum = (list, pickUsage) => {
        const o = { calls: 0, prompt: 0, completion: 0, total: 0, frames: 0, ms: 0 }
        for (const a of list) {
          const u = pickUsage(a)
          o.calls += 1
          if (u) {
            o.prompt += Number(u.prompt_tokens || 0)
            o.completion += Number(u.completion_tokens || 0)
            o.total += Number(u.total_tokens || 0)
          }
          o.frames += Array.isArray(a && a.frames) ? a.frames.length : 0
          o.ms += Number((a && a.ms) || 0)
        }
        o.cost = (o.prompt / 1e6) * priceIn + (o.completion / 1e6) * priceOut
        return o
      }

      const analyses = readJSON(ANALYSES_FILE, [])
      const gens = readJSON(GENERATIONS_FILE, [])
      const vision = sum(Array.isArray(analyses) ? analyses : [], (a) => a && a.usage)
      const text = sum(Array.isArray(gens) ? gens : [], (g) => g && g.usage)

      const byDay = {}
      const bump = (at, kind, u) => {
        const day = new Date(Number(at) || Date.now()).toISOString().slice(0, 10)
        const d = byDay[day] || (byDay[day] = { calls: 0, prompt: 0, completion: 0, total: 0, video: 0, text: 0 })
        d.calls += 1
        if (kind === 'video') d.video += 1
        else d.text += 1
        if (u) {
          d.prompt += Number(u.prompt_tokens || 0)
          d.completion += Number(u.completion_tokens || 0)
          d.total += Number(u.total_tokens || 0)
        }
      }
      for (const a of Array.isArray(analyses) ? analyses : []) bump(a && a.at, 'video', a && a.usage)
      for (const g of Array.isArray(gens) ? gens : []) bump(g && g.at, 'text', g && g.usage)

      const tok = { calls: 0, prompt: 0, completion: 0, total: 0, frames: 0, ms: 0, cost: 0 }
      for (const k of ['calls', 'prompt', 'completion', 'total', 'frames', 'ms', 'cost']) tok[k] = vision[k] + text[k]

      return send(res, 200, {
        ok: true,
        // 兼容旧字段（看板一直在用）
        calls: tok.calls,
        frames: vision.frames,
        promptTokens: tok.prompt,
        completionTokens: tok.completion,
        totalTokens: tok.total,
        avgPrompt: tok.calls ? Math.round(tok.prompt / tok.calls) : 0,
        avgCompletion: tok.calls ? Math.round(tok.completion / tok.calls) : 0,
        avgMs: tok.calls ? Math.round(tok.ms / tok.calls) : 0,
        priceIn,
        priceOut,
        usdCny,
        cost: Number(tok.cost.toFixed(4)),
        // 细分
        vision: {
          calls: vision.calls,
          frames: vision.frames,
          promptTokens: vision.prompt,
          completionTokens: vision.completion,
          totalTokens: vision.total,
          avgMs: vision.calls ? Math.round(vision.ms / vision.calls) : 0,
          cost: Number(vision.cost.toFixed(4)),
        },
        text: {
          calls: text.calls,
          promptTokens: text.prompt,
          completionTokens: text.completion,
          totalTokens: text.total,
          avgMs: text.calls ? Math.round(text.ms / text.calls) : 0,
          cost: Number(text.cost.toFixed(4)),
        },
        total: { calls: tok.calls, promptTokens: tok.prompt, completionTokens: tok.completion, totalTokens: tok.total, cost: Number(tok.cost.toFixed(4)) },
        byDay,
      })
    }

    /* ---- 设置（插件版设置中心用）：看 key 状态、改 key、改价 ---- */
    if (method === 'GET' && p === '/api/settings') {
      const st = readJSON(SETTINGS_FILE, {}) || {}
      const ark = { from: '', ok: false }
      try {
        const a = analyzeKeyStatus()
        ark.ok = !!a.ok
        ark.from = a.from || ''
        ark.model = a.model || ''
      } catch (e) {}
      const ds = textProvider()
      const tk = { ok: false, from: '', file: '' }
      try {
        const k = tkKeyInfo()
        tk.ok = !!k.ok
        tk.from = k.from || ''
        tk.file = k.file || ''
      } catch (e) {}
      return send(res, 200, {
        ok: true,
        version: VERSION,
        dataDir: DATA_DIR,
        port: PORT,
        ark,
        deepseek: { ok: ds.provider === 'deepseek', provider: ds.provider, model: ds.model, from: ds.from || '' },
        tikhub: tk,
        priceIn: Number(st.priceIn != null ? st.priceIn : process.env.DEBAO_PRICE_IN || 0.3),
        priceOut: Number(st.priceOut != null ? st.priceOut : process.env.DEBAO_PRICE_OUT || 0.6),
        usdCny: Number(st.usdCny != null ? st.usdCny : process.env.DEBAO_USD_CNY || 7.2),
        models: { vision: process.env.DEBAO_VISION_MODEL || 'doubao-seed-2-1-lite-260915', text: ds.model },
      })
    }

    if (method === 'POST' && p === '/api/settings') {
      const body = (await readBody(req)) || {}
      const st = readJSON(SETTINGS_FILE, {}) || {}
      const out = { ok: true, wrote: [] }
      const writeKey = (name, val) => {
        const f = path.join(DATA_DIR, name)
        try {
          if (val === null) {
            if (fs.existsSync(f)) fs.unlinkSync(f)
            out.wrote.push(name + ':removed')
          } else if (String(val).trim()) {
            fs.writeFileSync(f, String(val).trim(), 'utf8')
            out.wrote.push(name)
          }
        } catch (e) {
          out.ok = false
          out.error = e.message
        }
      }
      if ('arkKey' in body) writeKey('ark.key', body.arkKey)
      if ('deepseekKey' in body) writeKey('deepseek.key', body.deepseekKey)
      if ('tikhubKey' in body) writeKey('tikhub.key', body.tikhubKey)
      for (const k of ['priceIn', 'priceOut', 'usdCny']) {
        if (k in body && Number.isFinite(Number(body[k]))) st[k] = Number(body[k])
      }
      writeJSON(SETTINGS_FILE, st)
      return send(res, 200, out)
    }

    if (method === 'POST' && p === '/api/analysis') {
      const body = await readBody(req)
      if (!body) return send(res, 400, { ok: false, error: 'empty body' })
      const arr = readJSON(ANALYSES_FILE, [])
      const list = Array.isArray(arr) ? arr : []
      const rec = Object.assign({}, body, { at: Date.now(), id: 'a_' + Date.now() })
      list.unshift(rec)
      writeJSON(ANALYSES_FILE, list.slice(0, MAX_ANALYSES))
      return send(res, 200, { ok: true, id: rec.id, count: list.length })
    }

    /* ---- 后台数据：多账号（小红书 / 抖音分开存） ---- */
    if (method === 'GET' && p === '/api/account/list') {
      const list = backendStore.list(u.searchParams.get('platform') || '')
      return send(res, 200, { ok: true, items: list, count: list.length })
    }

    if (method === 'POST' && p === '/api/account') {
      const body = await readBody(req)
      if (!body) return send(res, 400, { ok: false, error: 'empty body' })
      let item
      try {
        item = backendStore.upsert(body)
      } catch (e) {
        return send(res, 500, { ok: false, error: '存后台快照失败：' + e.message })
      }
      if (!item) return send(res, 400, { ok: false, error: '快照是空的' })
      try {
        writeJSON(ACCOUNT_FILE, { snapshot: body, updatedAt: item.updatedAt })
      } catch (e) {
        /* 兼容旧的单账号文件，写失败不影响主流程 */
      }
      console.log('[account] 收到后台快照 ' + (item.platform || '') + ' / ' + (item.nickname || item.id))
      return send(res, 200, { ok: true, id: item.id, platform: item.platform, nickname: item.nickname, updatedAt: item.updatedAt })
    }

    if (method === 'PATCH' && p === '/api/account') {
      const body = await readBody(req)
      if (!body || !body.id) return send(res, 400, { ok: false, error: '缺 id' })
      const it = backendStore.rename(body.id, body.nickname)
      if (!it) return send(res, 404, { ok: false, error: '没找到这个账号' })
      return send(res, 200, { ok: true, id: it.id, nickname: it.nickname })
    }

    if (method === 'POST' && p === '/api/account/create') {
      const body = await readBody(req)
      const it = backendStore.create(body || {})
      if (!it) return send(res, 400, { ok: false, error: '给账号起个名字' })
      return send(res, 200, { ok: true, id: it.id, platform: it.platform, nickname: it.nickname })
    }

    if (method === 'DELETE' && p === '/api/account') {
      const id = u.searchParams.get('id')
      if (!id) return send(res, 400, { ok: false, error: '缺 id' })
      return send(res, 200, { ok: true, removed: backendStore.remove(id) })
    }

    if (method === 'GET' && p === '/api/account/summary') {
      const id = u.searchParams.get('id') || ''
      const one = backendStore.get(id)
      if (!one) {
        const list = backendStore.list('')
        if (!list.length) return send(res, 200, { ok: true, empty: true })
        return send(res, 200, { ok: true, empty: true, accounts: list })
      }
      return send(res, 200, Object.assign({ ok: true, accounts: backendStore.list(one.platform) }, one))
    }

    /* ---- 知识库可视化：目录 / 搜索 / 读单篇 ---- */
    if (method === 'GET' && p === '/api/kb/catalog') {
      try {
        return send(res, 200, Object.assign({ ok: true }, kbCatalog()))
      } catch (e) {
        return send(res, 500, { ok: false, error: '读知识库目录失败：' + e.message })
      }
    }

    if (method === 'POST' && p === '/api/kb/search') {
      const body = await readBody(req)
      const r = searchKb((body && body.q) || '', (body && body.limit) || 8)
      return send(res, 200, Object.assign({ ok: true }, r))
    }

    if (method === 'GET' && p === '/api/kb/doc') {
      const doc = kbDoc(u.searchParams.get('ref') || '', Number(u.searchParams.get('limit')) || 24000)
      if (!doc) return send(res, 404, { ok: false, error: '没有这篇' })
      return send(res, 200, Object.assign({ ok: true }, doc))
    }

    /* ---- 后台数据：本地上传表格 → 解析 → 去重 ---- */
    if (method === 'POST' && p === '/api/backend/upload') {
      const buf = await readRaw(req, 24 * 1024 * 1024)
      if (!buf || !buf.length) return send(res, 400, { ok: false, error: '文件是空的' })
      const name = String(u.searchParams.get('name') || 'upload.csv')
      const platform = String(u.searchParams.get('platform') || '')
      const accountId = String(u.searchParams.get('account') || '')
      const accountRec = accountId ? backendStore.get(accountId) : null
      if (accountId && !accountRec) return send(res, 400, { ok: false, error: '这个账号已经不在了，先刷新一下' })
      let rows = []
      let header = []
      try {
        const isXlsx = /\.xlsx$/i.test(name) || (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04)
        const looksZip = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b
        if (isXlsx && !/\.(zip|docx|pptx)$/i.test(name)) {
          const parsed = parseXlsx(buf)
          header = parsed.header
          rows = parsed.rows.map(normalizeRow)
        } else if (looksZip) {
          return send(res, 400, { ok: false, error: '这是压缩包或 Word/PPT，不是表格。请用 Excel 另存为 .xlsx，或导出 CSV 再传' })
        } else {
          const text = buf.toString('utf8')
          if (/\.json$/i.test(name) || text.trim().startsWith('[') || text.trim().startsWith('{')) {
            const j = JSON.parse(text)
            const arr = Array.isArray(j) ? j : j.items || j.data || j.list || []
            rows = arr.map((r) => (r && typeof r === 'object' ? normalizeRow(r) : null)).filter(Boolean)
            header = arr.length && arr[0] ? Object.keys(arr[0]).slice(0, 20) : []
          } else {
            const parsed = parseCsv(text)
            header = parsed.header
            rows = parsed.rows.map(normalizeRow)
          }
        }
      } catch (e) {
        return send(res, 400, { ok: false, error: '这个文件解析不了（支持 CSV / JSON / Excel .xlsx）：' + e.message })
      }
      if (!rows.length) return send(res, 400, { ok: false, error: '表里没读到数据行' })

      const store = backendStore.uploadsIndex()
      const seen = store.sigs || {}
      const scope = accountId || 'all'
      const sigs = {}
      let dropped = 0
      const kept = []
      for (const r of rows) {
        const sig = scope + '|' + signatureOf(r)
        if (seen[sig] || sigs[sig]) {
          dropped++
          continue
        }
        sigs[sig] = 1
        kept.push(Object.assign({}, r, { sig, dup: false }))
      }
      const id = 'up_' + Date.now().toString(36)
      fs.mkdirSync(backendStore.UPLOAD_DIR, { recursive: true })
      writeJSON(path.join(backendStore.UPLOAD_DIR, id + '.json'), { id, name, platform, account: accountId, at: Date.now(), header, rows: kept })
      store.sigs = Object.assign({}, seen, sigs)
      store.files = (store.files || []).concat([{ id, name, platform, account: accountId, at: Date.now(), rows: rows.length, kept: kept.length, dropped }]).slice(-100)
      backendStore.saveUpload(store)
      return send(res, 200, {
        ok: true,
        id,
        name,
        platform,
        total: rows.length,
        kept: kept.length,
        dropped,
        header,
        sample: kept.slice(0, 20),
      })
    }

    if (method === 'GET' && p === '/api/backend/uploads') {
      const store = backendStore.uploadsIndex()
      const want = String(u.searchParams.get('account') || '')
      const items = (store.files || []).filter((x) => !want || x.account === want)
      return send(res, 200, { ok: true, items: items.slice().reverse(), account: want })
    }

    if (method === 'GET' && p === '/api/backend/upload') {
      const id = u.searchParams.get('id') || ''
      if (!id || id.includes('..') || id.includes('/')) return send(res, 400, { ok: false, error: '缺 id' })
      const rec = readJSON(path.join(backendStore.UPLOAD_DIR, id + '.json'), null)
      if (!rec) return send(res, 404, { ok: false, error: '没有这次上传' })
      return send(res, 200, Object.assign({ ok: true }, rec))
    }

    /* ---- 真·一键解析：插件点按钮直接跑，不用复制指令 ---- */
    if (method === 'GET' && p === '/api/analyze/key') {
      return send(res, 200, Object.assign({ ok: true }, keyStatus()))
    }

    if (method === 'POST' && p === '/api/analyze') {
      const body = (await readBody(req)) || {}
      const jobId = 'job_' + Date.now().toString(36)
      jobs.set(jobId, { id: jobId, stage: '排队', pct: 2, done: false, error: null, result: null, at: Date.now(), ref: String(body.id || body.link || body.url || '') })
      const job = jobs.get(jobId)
      console.log('[analyze] 开始 ' + (body.id || body.url || body.path || '?'))
      runAnalysis(body, queue, (msg, pct) => {
        job.stage = msg
        job.pct = pct
      })
        .then((result) => {
          job.result = result
          job.stage = '完成'
          job.pct = 100
          job.done = true
          /* 这一次是「下载到本机再解析」的：把 localFile 写回队列，下次直接复用、卡片上也显示 本机 */
          try {
            const src = result.source || {}
            if (src.kind === 'url' && src.file && fs.existsSync(src.file)) {
              const it = queue.find((x) => x.id === (body.id || result.ref))
              if (it && it.localFile !== src.file) {
                it.localFile = src.file
                it.localSize = fs.statSync(src.file).size
                writeQueue(queue)
              }
            }
          } catch (e) {}
          const arr = readJSON(ANALYSES_FILE, [])
          const list = Array.isArray(arr) ? arr : []
          list.unshift(result)
          writeJSON(ANALYSES_FILE, list.slice(0, MAX_ANALYSES))
          console.log('[analyze] 完成 ' + result.id + ' ' + result.ms + 'ms 帧 ' + result.frames.length)
        })
        .catch((e) => {
          job.error = String((e && e.message) || e)
          job.done = true
          console.log('[analyze] 失败 ' + job.error)
        })
      return send(res, 200, { ok: true, id: jobId })
    }

    if (method === 'GET' && p === '/api/analyze/status') {
      const id = u.searchParams.get('id')
      const job = jobs.get(id)
      if (!job) return send(res, 404, { ok: false, error: 'job not found' })
      return send(res, 200, { ok: true, id: id, stage: job.stage, pct: job.pct, done: job.done, error: job.error, result: job.result })
    }

    /* 解析进度走 SSE：切页/切到别的窗口也不会断（浏览器只节流定时器，不掐事件流） */
    if (method === 'GET' && p === '/api/analyze/stream') {
      const id = u.searchParams.get('id')
      const job = jobs.get(id)
      if (!job) return send(res, 404, { ok: false, error: 'job not found' })
      const h = {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      }
      if (res.__pna) h['Access-Control-Allow-Private-Network'] = 'true'
      res.writeHead(200, h)
      const write = (event, data) => {
        try {
          res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n')
        } catch (e) {
          /* 客户端断开 */
        }
      }
      write('open', { id: id, at: job.at })
      let last = ''
      let closed = false
      const tick = setInterval(() => {
        if (closed) return
        const cur = job.stage + '|' + job.pct
        if (cur !== last) {
          last = cur
          write('stage', { stage: job.stage, pct: job.pct })
        }
        if (job.done) {
          closed = true
          clearInterval(tick)
          if (job.error) write('error', { error: job.error })
          else write('done', { result: job.result })
          try {
            res.end()
          } catch (e) {}
        }
      }, 400)
      req.on('close', () => {
        closed = true
        clearInterval(tick)
      })
      return
    }

    /* 页面重新打开时，把正在跑的解析接回来（不然切走再回来就看不到进度了） */
    if (method === 'GET' && p === '/api/analyze/active') {
      const items = []
      jobs.forEach(function (j) {
        if (j.done) return
        if (!/^job_/.test(String(j.id))) return
        items.push({ id: j.id, stage: j.stage, pct: j.pct, at: j.at, ref: j.ref || '' })
      })
      items.sort(function (a, b) { return b.at - a.at })
      return send(res, 200, { ok: true, items: items.slice(0, 5) })
    }

    /* ---------------- 一键生成（豆包直连 + 流式） ---------------- */

    if (method === 'GET' && (p === '/api/gen/key' || p === '/api/gen/models')) {
      const tp = textProvider()
      const hostBase = String(u.searchParams.get('hostBase') || process.env.DEBAO_HOST_BASE || '').replace(/\/+$/, '')
      let host = null
      if (hostBase) {
        try {
          const ctl = new AbortController()
          const timer = setTimeout(() => ctl.abort(), 2500)
          const r = await fetch(hostBase + '/debao/gen/status', { signal: ctl.signal })
          clearTimeout(timer)
          if (r.ok) host = await r.json()
        } catch {
          host = null
        }
      }
      return send(res, 200, {
        ok: true,
        key: !!tp.key,
        from: tp.from,
        provider: host && host.ok ? 'dsh-host' : tp.provider,
        textModel: host && host.ok ? host.model : tp.model,
        host: host && host.ok ? { provider: host.provider, model: host.model } : null,
      })
    }

    if (method === 'POST' && p === '/api/gen') {
      const b = (await readBody(req)) || {}
      const prompt = String(b.prompt || '').trim()
      if (!prompt) return send(res, 400, { ok: false, error: 'need prompt' })
      const id = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
      const job = {
        id: id,
        kind: String(b.kind || 'other'),
        platform: String(b.platform || 'xhs'),
        title: String(b.title || ''),
        prompt: prompt,
        text: '',
        done: false,
        error: '',
        usage: null,
        ms: 0,
        model: TEXT_MODEL,
        provider: '',
        library: String(b.library || (['original', 'topics', 'idea'].indexOf(String(b.kind || '')) >= 0 ? 'orig' : 'learn')),
        kb: [],
        at: Date.now(),
        startedAt: Date.now(),
      }
      jobs.set(id, job)
      generateStream(
        prompt,
        {
          maxTokens: Math.min(4000, Number(b.maxTokens) || 3200),
          temperature: Number.isFinite(Number(b.temperature)) ? Number(b.temperature) : 0.7,
          // 设置里可以关掉「生成前检索知识库」
          noKb: b.kb === false,
          // 插件界面会把自身 origin 带上来，桥用它去调 DSH 环境内的模型（不用 key）
          hostBase: String(b.hostBase || ''),
        },
        (d, full) => {
          job.text = full
        },
      )
        .then((r) => {
          job.text = r.text || job.text
          job.usage = r.usage
          job.ms = r.ms
          job.model = r.model
          job.kb = Array.isArray(r.kb) ? r.kb : []
          job.provider = r.provider || ''
          job.done = true
          const arr = readJSON(GENERATIONS_FILE, [])
          const list = Array.isArray(arr) ? arr : []
          list.unshift({
            id: id,
            at: job.at,
            kind: job.kind,
            library: job.library,
            provider: job.provider,
            platform: job.platform,
            title: job.title || job.text.split('\n')[0].replace(/^#+\s*/, '').slice(0, 40),
            text: job.text,
            usage: job.usage,
            ms: job.ms,
            model: job.model,
            kb: job.kb || [],
            adopted: false,
          })
          writeJSON(GENERATIONS_FILE, list.slice(0, MAX_GENERATIONS))
          console.log('[gen] 完成 ' + id + ' ' + job.kind + ' ' + job.text.length + ' 字 ' + job.ms + 'ms')
        })
        .catch((e) => {
          job.error = String((e && e.message) || e)
          job.done = true
          console.log('[gen] 失败 ' + id + ' ' + job.error)
        })
      return send(res, 200, { ok: true, id: id, model: TEXT_MODEL })
    }

    /* 流式回放：先补已生成的，再按 300ms 推增量 */
    if (method === 'GET' && p === '/api/gen/stream') {
      const id = u.searchParams.get('id')
      const job = jobs.get(id)
      if (!job) return send(res, 404, { ok: false, error: 'job not found' })
      const h = {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      }
      if (res.__pna) h['Access-Control-Allow-Private-Network'] = 'true'
      res.writeHead(200, h)
      const write = (event, data) => {
        try {
          res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n')
        } catch (e) {
          /* 客户端断开 */
        }
      }
      write('open', { id: id, model: job.model })
      let sent = 0
      let closed = false
      const tick = setInterval(() => {
        if (closed) return
        if (job.text.length > sent) {
          sent = job.text.length
          write('delta', { text: job.text })
        }
        if (job.done) {
          closed = true
          clearInterval(tick)
          if (job.error) write('error', { error: job.error })
          else write('done', { text: job.text, usage: job.usage, ms: job.ms, model: job.model, kb: job.kb || [] })
          try {
            res.end()
          } catch (e) {}
        }
      }, 300)
      req.on('close', () => {
        closed = true
        clearInterval(tick)
      })
      return
    }

    if (method === 'GET' && p === '/api/gen/status') {
      const id = u.searchParams.get('id')
      const job = jobs.get(id)
      if (!job) return send(res, 404, { ok: false, error: 'job not found' })
      return send(res, 200, { ok: true, id: id, done: job.done, error: job.error, text: job.text, usage: job.usage, ms: job.ms, model: job.model, kind: job.kind, kb: job.kb || [] })
    }

    /* 作品库：生成过的东西都在这里，可标记「采用」、改标题、删 */
    if (method === 'GET' && p === '/api/generations') {
      const arr = readJSON(GENERATIONS_FILE, [])
      const list = Array.isArray(arr) ? arr : []
      const kind = (u.searchParams.get('kind') || '').trim()
      const platform = (u.searchParams.get('platform') || '').trim()
      const library = (u.searchParams.get('library') || '').trim()
      const items = list.filter(function (x) {
        if (kind && x.kind !== kind) return false
        if (platform && x.platform !== platform) return false
        if (library && (x.library || 'learn') !== library) return false
        return true
      })
      const calls = list.length
      let tokens = 0
      list.forEach(function (x) {
        if (x.usage) tokens += Number(x.usage.total_tokens) || 0
      })
      return send(res, 200, { ok: true, items: items, count: items.length, total: list.length, calls: calls, tokens: tokens })
    }

    if (method === 'PATCH' && p === '/api/generation') {
      const b = (await readBody(req)) || {}
      const id = String(b.id || '')
      const arr = readJSON(GENERATIONS_FILE, [])
      const list = Array.isArray(arr) ? arr : []
      const it = list.find(function (x) {
        return x.id === id
      })
      if (!it) return send(res, 404, { ok: false, error: 'not found' })
      if (typeof b.adopted === 'boolean') it.adopted = b.adopted
      if (typeof b.title === 'string' && b.title) it.title = b.title
      if (typeof b.text === 'string' && b.text) it.text = b.text
      if (typeof b.library === 'string' && b.library) it.library = b.library
      it.updatedAt = Date.now()
      writeJSON(GENERATIONS_FILE, list)
      return send(res, 200, { ok: true, item: it })
    }

    if (method === 'DELETE' && p === '/api/generation') {
      const id = String(u.searchParams.get('id') || '')
      const arr = readJSON(GENERATIONS_FILE, [])
      const list = Array.isArray(arr) ? arr : []
      const next = list.filter(function (x) {
        return x.id !== id
      })
      writeJSON(GENERATIONS_FILE, next)
      return send(res, 200, { ok: true, removed: list.length - next.length })
    }

    /* ---------------- 学习库：拆解 / 仿写 / 视频解析 / 博主 统一成一张表 ---------------- */
    if (method === 'GET' && p === '/api/study') {
      const out = study.list({
        kind: u.searchParams.get('kind'),
        platform: u.searchParams.get('platform'),
        origin: u.searchParams.get('origin'),
        tag: u.searchParams.get('tag'),
        q: u.searchParams.get('q'),
        starred: u.searchParams.get('starred') === '1',
        limit: u.searchParams.get('limit'),
      })
      return send(res, 200, Object.assign({ ok: true }, out))
    }

    if (method === 'GET' && p === '/api/study/item') {
      const id = String(u.searchParams.get('id') || '')
      const it = study.get(id)
      if (!it) return send(res, 404, { ok: false, error: 'not found' })
      return send(res, 200, { ok: true, item: it })
    }

    if (method === 'POST' && p === '/api/study/sync') {
      study.sync(true)
      return send(res, 200, { ok: true, count: study.counts(), syncedAt: Date.now() })
    }

    if (method === 'POST' && p === '/api/study') {
      const b = (await readBody(req)) || {}
      const out = study.add(b.items || b, Date.now())
      if (!out.added.length && out.skipped.length) return send(res, 200, { ok: true, added: [], skipped: out.skipped, dup: true })
      return send(res, 200, { ok: true, added: out.added, skipped: out.skipped })
    }

    if (method === 'PATCH' && p === '/api/study') {
      const b = (await readBody(req)) || {}
      const it = study.patch(String(b.id || ''), b)
      if (!it) return send(res, 404, { ok: false, error: 'not found' })
      return send(res, 200, { ok: true, item: it })
    }

    if (method === 'DELETE' && p === '/api/study') {
      const id = String(u.searchParams.get('id') || '')
      const out = study.remove([id])
      return send(res, 200, { ok: true, removed: out.removed })
    }

    if (method === 'POST' && p === '/api/study/remove') {
      const b = (await readBody(req)) || {}
      const out = study.remove(Array.isArray(b.ids) ? b.ids : [])
      return send(res, 200, { ok: true, removed: out.removed })
    }

    if (method === 'POST' && p === '/api/study/dedupe') {
      const out = study.dedupe()
      return send(res, 200, { ok: true, removed: out.removed, left: out.left })
    }

    /* ---------------- 灵感记录库（原创库的弹药） ---------------- */
    if (method === 'GET' && p === '/api/inspirations') {
      const arr = readJSON(INSP_FILE, [])
      const list = Array.isArray(arr) ? arr : []
      const q = (u.searchParams.get('q') || '').trim().toLowerCase()
      const items = q
        ? list.filter(function (x) {
            return (String(x.text || '') + ' ' + String(x.tags || '')).toLowerCase().includes(q)
          })
        : list
      return send(res, 200, { ok: true, items: items, count: items.length, total: list.length })
    }

    if (method === 'POST' && p === '/api/inspirations') {
      const b = (await readBody(req)) || {}
      const raw = (Array.isArray(b.items) ? b.items : [b]).filter(function (x) {
        return x && String(x.text || '').trim()
      })
      if (!raw.length) return send(res, 400, { ok: false, error: 'need text' })
      const arr = readJSON(INSP_FILE, [])
      const list = Array.isArray(arr) ? arr : []
      const added = []
      raw.forEach(function (x) {
        const it = {
          id: 'i_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          at: Date.now(),
          text: String(x.text || '').slice(0, 2000),
          tags: String(x.tags || ''),
          platform: String(x.platform || ''),
          source: String(x.source || 'manual'),
          fromTitle: String(x.fromTitle || ''),
          done: false,
        }
        list.unshift(it)
        added.push(it)
      })
      writeJSON(INSP_FILE, list.slice(0, MAX_INSP))
      return send(res, 200, { ok: true, added: added.length, count: list.length })
    }

    if (method === 'PATCH' && p === '/api/inspiration') {
      const b = (await readBody(req)) || {}
      const arr = readJSON(INSP_FILE, [])
      const list = Array.isArray(arr) ? arr : []
      const it = list.find(function (x) {
        return x.id === String(b.id || '')
      })
      if (!it) return send(res, 404, { ok: false, error: 'not found' })
      if (typeof b.text === 'string' && b.text) it.text = b.text.slice(0, 2000)
      if (typeof b.tags === 'string') it.tags = b.tags
      if (typeof b.done === 'boolean') it.done = b.done
      writeJSON(INSP_FILE, list)
      return send(res, 200, { ok: true, item: it })
    }

    if (method === 'DELETE' && p === '/api/inspiration') {
      const id = String(u.searchParams.get('id') || '')
      const arr = readJSON(INSP_FILE, [])
      const list = Array.isArray(arr) ? arr : []
      const next = list.filter(function (x) {
        return x.id !== id
      })
      writeJSON(INSP_FILE, next)
      return send(res, 200, { ok: true, removed: list.length - next.length })
    }

    /* ---- TikHub 云端拉取：不用开浏览器，直接按链接/博主/关键词取数据 ----
       注意：每次调用都消耗 TikHub 额度（约 $0.001-0.002/次），所以只在用户点的时候走。 */
    if (method === 'GET' && p === '/api/tikhub/status') {
      const ki = tkKeyInfo()
      let usage = null
      if (u.searchParams.get('usage') === '1' && ki.ok) {
        try {
          usage = await tkAccountUsage()
        } catch (e) {
          usage = { error: String((e && e.message) || e) }
        }
      }
      return send(res, 200, { ok: true, key: ki, usage: usage })
    }

    if (method === 'POST' && (p === '/api/tikhub/fetch' || p === '/api/tikhub/user' || p === '/api/tikhub/search')) {
      const b = (await readBody(req)) || {}
      const platform = b.platform === 'douyin' ? 'douyin' : 'xhs'
      const save = b.save !== false
      const pages = Math.max(1, Math.min(5, Number(b.pages) || 1))
      try {
        let items = []
        if (p === '/api/tikhub/fetch') {
          const r = await tkFetchNote({ platform: platform, input: b.input || b.url || b.id })
          items = r && r.item ? [r.item] : []
        } else if (p === '/api/tikhub/user') {
          items = await tkFetchUserNotes({ platform: platform, input: b.input || b.url, pages: pages })
        } else {
          items = await tkSearchNotes({ platform: platform, keyword: b.keyword || b.kw, pages: pages })
        }
        let ids = []
        if (save && items.length) ids = upsert(items)
        console.log('[tikhub] ' + p + ' ' + platform + ' got ' + items.length + ' saved ' + ids.length)
        return send(res, 200, { ok: true, count: items.length, saved: ids.length, items: items })
      } catch (e) {
        const msg = String((e && e.message) || e)
        console.log('[tikhub] 失败 ' + p + ' ' + msg)
        return send(res, 502, { ok: false, error: msg })
      }
    }

    /* ---- 热榜 / 关键词榜单（抖音用官方 billboard，小红书用搜索结果按互动排序） ---- */
    if (method === 'GET' && p === '/api/hot') {
      const platform = u.searchParams.get('platform') === 'douyin' ? 'douyin' : 'xhs'
      const kind = String(u.searchParams.get('kind') || 'hot')
      const keyword = String(u.searchParams.get('keyword') || '').trim()
      const days = Math.max(1, Math.min(30, Number(u.searchParams.get('days')) || 1))
      const page = Math.max(1, Number(u.searchParams.get('page')) || 1)
      const fresh = u.searchParams.get('fresh') === '1'
      const cacheKey = [kind, platform, keyword, days, page].join('|')
      const cache = readJSON(HOT_CACHE_FILE, {}) || {}
      const hit = cache[cacheKey]
      if (!fresh && hit && Date.now() - Number(hit.at || 0) < 10 * 60 * 1000) {
        return send(res, 200, Object.assign({ ok: true, cached: true }, hit.data))
      }
      try {
        let data
        if (kind === 'keyword') {
          if (!keyword) return send(res, 400, { ok: false, error: '先给个关键词' })
          data = await keywordBoard({ platform: platform, keyword: keyword, days: days })
        } else if (platform === 'douyin') {
          data = await hotBoard({ page: page, pageSize: 30 })
        } else {
          return send(res, 400, {
            ok: false,
            error: '小红书没有公开热榜：切到「关键词榜单」，用关键词 + 时间窗生成当日榜',
          })
        }
        cache[cacheKey] = { at: Date.now(), data: data }
        writeJSON(HOT_CACHE_FILE, cache)
        console.log('[hot] ' + cacheKey + ' -> ' + (data.items || []).length)
        return send(res, 200, Object.assign({ ok: true, cached: false }, data))
      } catch (e) {
        const msg = String((e && e.message) || e)
        console.log('[hot] 失败 ' + msg)
        return send(res, 502, { ok: false, error: msg })
      }
    }

    /* ---- 找博主：搜人 + 抓画像/作品 ---- */
    if (method === 'POST' && p === '/api/bloggers/search') {
      const b = (await readBody(req)) || {}
      try {
        const r = await searchUsers({
          platform: b.platform === 'douyin' ? 'douyin' : 'xhs',
          keyword: b.keyword || b.kw,
          limit: Math.max(1, Math.min(50, Number(b.limit) || 20)),
        })
        return send(res, 200, Object.assign({ ok: true }, r))
      } catch (e) {
        return send(res, 502, { ok: false, error: String((e && e.message) || e) })
      }
    }

    if (method === 'POST' && p === '/api/blogger/fetch') {
      const b = (await readBody(req)) || {}
      const platform = b.platform === 'douyin' ? 'douyin' : 'xhs'
      try {
        const profile = await userProfile({ platform: platform, input: b.input || b.url || b.id })
        let items = []
        if (b.withPosts !== false) {
          try {
            items = await tkFetchUserNotes({ platform: platform, input: profile.url || profile.id, pages: Math.max(1, Math.min(5, Number(b.pages) || 1)) })
          } catch (e) {
            items = []
          }
        }
        let ids = []
        if (b.save !== false && items.length) ids = upsert(items)
        const cached = readJSON(BLOGGER_FILE, {}) || {}
        const key = platform + ':' + (profile.id || profile.secUid)
        cached[key] = Object.assign({}, profile, { posts: items.length, saved: ids.length, at: Date.now() })
        writeJSON(BLOGGER_FILE, cached)
        return send(res, 200, { ok: true, profile: profile, count: items.length, saved: ids.length, items: items })
      } catch (e) {
        return send(res, 502, { ok: false, error: String((e && e.message) || e) })
      }
    }

    /* ---- 我的账号：多账号 + 星标监控 + 每日快照 ---- */
    if (method === 'GET' && p === '/api/accounts') {
      const list = readJSON(ACCOUNTS_FILE, []) || []
      return send(res, 200, { ok: true, items: list, count: list.length })
    }

    if (method === 'POST' && p === '/api/accounts') {
      const b = (await readBody(req)) || {}
      const platform = b.platform === 'douyin' ? 'douyin' : 'xhs'
      const input = b.input || b.url || b.id
      if (!input) return send(res, 400, { ok: false, error: '贴账号主页链接或 id' })
      try {
        const profile = await userProfile({ platform: platform, input: input })
        const list = readJSON(ACCOUNTS_FILE, []) || []
        const uid = profile.id || profile.secUid || input
        const id = 'acc_' + platform + '_' + String(uid).replace(/[^A-Za-z0-9]/g, '').slice(-18)
        const prev = list.find(function (x) {
          return x.id === id
        })
        const snap = { at: Date.now(), followers: profile.followers || 0, likes: profile.likes || 0, notes: profile.notes || 0 }
        const snaps = ((prev && prev.snaps) || []).concat([snap]).slice(-120)
        const account = {
          id: id,
          platform: platform,
          uid: uid,
          name: b.name || profile.name || '',
          avatar: profile.avatar || '',
          desc: profile.desc || '',
          url: profile.url || '',
          isMine: true,
          star: b.star !== false,
          followers: profile.followers || 0,
          likes: profile.likes || 0,
          notes: profile.notes || 0,
          snaps: snaps,
          at: Date.now(),
        }
        const next = list.filter(function (x) {
          return x.id !== id
        })
        next.unshift(account)
        writeJSON(ACCOUNTS_FILE, next)
        return send(res, 200, { ok: true, account: account, count: next.length })
      } catch (e) {
        return send(res, 502, { ok: false, error: String((e && e.message) || e) })
      }
    }

    if (method === 'PATCH' && p === '/api/accounts') {
      const b = (await readBody(req)) || {}
      const list = readJSON(ACCOUNTS_FILE, []) || []
      const id = String(b.id || '')
      const idx = list.findIndex(function (x) {
        return x.id === id
      })
      if (idx < 0) return send(res, 404, { ok: false, error: '没有这个账号' })
      if (typeof b.star === 'boolean') list[idx].star = b.star
      if (b.name) list[idx].name = b.name
      writeJSON(ACCOUNTS_FILE, list)
      return send(res, 200, { ok: true, account: list[idx] })
    }

    if (method === 'DELETE' && p === '/api/accounts') {
      const id = String(u.searchParams.get('id') || '')
      const list = readJSON(ACCOUNTS_FILE, []) || []
      const next = list.filter(function (x) {
        return x.id !== id
      })
      writeJSON(ACCOUNTS_FILE, next)
      return send(res, 200, { ok: true, removed: list.length - next.length, count: next.length })
    }

    if (method === 'POST' && p === '/api/accounts/sync') {
      const list = readJSON(ACCOUNTS_FILE, []) || []
      if (!list.length) return send(res, 200, { ok: true, synced: 0, failed: 0 })
      const out = []
      let synced = 0
      let failed = 0
      for (const acc of list) {
        try {
          const profile = await userProfile({ platform: acc.platform, input: acc.url || acc.uid })
          const snap = { at: Date.now(), followers: profile.followers || 0, likes: profile.likes || 0, notes: profile.notes || 0 }
          const snaps = ((acc.snaps || []).concat([snap])).slice(-120)
          out.push(
            Object.assign({}, acc, {
              name: profile.name || acc.name,
              avatar: profile.avatar || acc.avatar,
              followers: profile.followers || 0,
              likes: profile.likes || 0,
              notes: profile.notes || 0,
              snaps: snaps,
              at: Date.now(),
            }),
          )
          synced++
        } catch (e) {
          out.push(acc)
          failed++
        }
        await new Promise(function (r) {
          setTimeout(r, 400)
        })
      }
      writeJSON(ACCOUNTS_FILE, out)
      return send(res, 200, { ok: true, synced: synced, failed: failed, items: out })
    }

    /* ---- 扩展把视频字节直接传过来（直链过期/需要 cookie 时的终极兜底） ---- */
    if (method === 'POST' && p === '/api/media/upload') {
      const id = String(u.searchParams.get('id') || '').trim()
      if (!id) return send(res, 400, { ok: false, error: 'need id' })
      const dir = path.join(DATA_DIR, 'media')
      fs.mkdirSync(dir, { recursive: true })
      const safe = id.replace(/[^A-Za-z0-9_.-]/g, '_')
      const ext = /\.m3u8$/i.test(String(u.searchParams.get('name') || '')) ? '.m3u8' : '.mp4'
      const abs = path.join(dir, safe + ext)
      const tmp = abs + '.part'
      let bytes = 0
      try {
        await new Promise((resolve, reject) => {
          const ws = fs.createWriteStream(tmp)
          req.on('data', (c) => {
            bytes += c.length
            if (bytes > MAX_UPLOAD_BYTES) {
              reject(new Error('视频超过 ' + Math.round(MAX_UPLOAD_BYTES / 1048576) + 'MB，放弃上传'))
              req.destroy()
            }
          })
          req.on('error', reject)
          ws.on('error', reject)
          ws.on('finish', resolve)
          req.pipe(ws)
        })
        fs.renameSync(tmp, abs)
      } catch (e) {
        try {
          fs.unlinkSync(tmp)
        } catch (e2) {
          /* ignore */
        }
        return send(res, 400, { ok: false, error: String((e && e.message) || e) })
      }
      const it = queue.find((x) => x.id === id)
      if (it) {
        it.localFile = abs
        it.localSize = bytes
        writeQueue(queue)
      }
      console.log('[media] 收到视频 ' + safe + ext + ' ' + Math.round(bytes / 1048576) + 'MB')
      return send(res, 200, { ok: true, id: id, bytes: bytes, localFile: abs })
    }

    /* ---- 本地已存视频（插件预览 / 直连播放） ---- */
    if (method === 'GET' && p === '/api/media') {
      const id = String(u.searchParams.get('id') || '').trim()
      const it = queue.find((x) => x.id === id)
      const abs = it && it.localFile ? it.localFile : ''
      if (!abs || !fs.existsSync(abs)) return send(res, 404, { ok: false, error: 'no local file' })
      const st = fs.statSync(abs)
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': st.size,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      })
      return fs.createReadStream(abs).pipe(res)
    }

    /* ---- 关键帧图片（插件里直接显示） ---- */
    if (method === 'GET' && p.startsWith('/api/frames/')) {
      const rel = decodeURIComponent(p.slice('/api/frames/'.length))
      const root = framesDir()
      const abs = path.resolve(root, rel)
      if (!abs.startsWith(path.resolve(root) + path.sep)) return send(res, 400, { ok: false, error: 'bad path' })
      try {
        const buf = fs.readFileSync(abs)
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' })
        return res.end(buf)
      } catch (e) {
        return send(res, 404, { ok: false, error: 'not found' })
      }
    }

    return send(res, 404, { ok: false, error: 'not found', path: p })
  } catch (e) {
    return send(res, 500, { ok: false, error: String((e && e.message) || e) })
  }
})

server.on('error', (e) => {
  if (e && e.code === 'EADDRINUSE') {
    console.log(`端口 ${PORT} 已被占用 —— 采集桥多半已经在跑了，直接去浏览器用就行。`)
    process.exit(0)
  }
  console.error('采集桥启动失败:', e && e.message)
  process.exit(1)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`德饱采集桥已启动  http://127.0.0.1:${PORT}`)
  console.log(`队列文件          ${QUEUE_FILE}`)
  console.log(`当前已有          ${queue.length} 条`)
  console.log('按 Ctrl+C 停止')
})

process.on('SIGINT', () => {
  console.log('\n停止中…')
  server.close(() => process.exit(0))
})
