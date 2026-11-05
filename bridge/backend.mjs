/* 后台数据：多账号快照 / 本地上传解析去重 / 知识库可视化。
   这里只做纯数据活，不碰 http —— server.mjs 负责路由。 */
import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { summarizeAccount } from './account.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const PLUGIN_DIR = path.resolve(HERE, '..')
export const KB_DIR = path.join(PLUGIN_DIR, 'kb')



function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    return fallback
  }
}

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(value), 'utf8')
  fs.renameSync(tmp, file)
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function platformOf(v) {
  const s = String(v || '').toLowerCase()
  if (s.includes('douyin') || s.includes('抖音')) return 'douyin'
  if (s.includes('xiaohongshu') || s.includes('xhs') || s.includes('小红书')) return 'xhs'
  return s || ''
}

/* ---------------- 多账号快照 ---------------- */

function mineAuthor(summary) {
  const w = summary && Array.isArray(summary.works) ? summary.works.find((x) => x.src !== 'feed' && x.author) : null
  return w ? w.author : ''
}

export function createStore(dataDir) {
  const FILE = path.join(dataDir, 'backend.json')
  const LEGACY = path.join(dataDir, 'account.json')
  const UPLOAD_DIR = path.join(dataDir, 'uploads')

  function loadRaw() {
    const rec = readJSON(FILE, null)
    if (rec && Array.isArray(rec.items)) return rec
    return { items: [] }
  }

  let migrating = false

  function load() {
    const rec = readJSON(FILE, null)
    if (rec && Array.isArray(rec.items)) return rec
    const out = { items: [] }
    if (migrating) return out
    migrating = true
    try {
      const old = readJSON(LEGACY, null)
      if (old && old.snapshot) {
        const s = upsert(old.snapshot, old.updatedAt)
        if (s) out.items.push(s)
      }
    } finally {
      migrating = false
    }
    return out
  }

  function save(rec) {
    writeJSON(FILE, rec)
    return rec
  }

  /* 同一次同步可能只抓到部分接口：老快照里有的接口要留着，不能被新快照冲掉 */
  function mergeSnapshot(oldSnap, snap) {
    if (!oldSnap || !Array.isArray(oldSnap.items) || !oldSnap.items.length) return snap
    const fresh = Array.isArray(snap.items) ? snap.items : []
    const seen = new Set(fresh.map(function (x) { return String((x && x.url) || '') }))
    const kept = oldSnap.items.filter(function (x) { return x && x.url && !seen.has(String(x.url)) })
    const items = fresh.concat(kept).slice(0, 80)
    return Object.assign({}, oldSnap, snap, { items: items })
  }

  function upsert(snapshot, at) {
    if (!snapshot || typeof snapshot !== 'object') return null
    const platform = platformOf(snapshot.platform || snapshot.host || (snapshot.url || ''))
    const rec = loadRaw()
    const now = num(at) || Date.now()
    const hostKey = String(snapshot.host || '')

    /* 先粗算一次，拿到 uid / 昵称，才能定位到是哪个账号 */
    let summary = null
    try {
      summary = summarizeAccount(Object.assign({}, snapshot, { platform }))
    } catch (e) {
      summary = null
    }
    const acc0 = summary && summary.account
    const uid = (acc0 && acc0.uid) || snapshot.uid || ''
    let nickname = (acc0 && acc0.nickname) || snapshot.nickname || ''
    if (!nickname && summary && Array.isArray(summary.works)) {
      const mine = summary.works.find(function (w) { return w.src === 'mine' && w.author && w.author.length <= 20 })
      if (mine) nickname = mine.author
    }
    const key = uid ? uid : nickname ? 'name:' + nickname : 'host:' + (hostKey || 'unknown')
    let id = 'bk_' + (platform || 'x') + '_' + crypto.createHash('sha1').update(String(key)).digest('hex').slice(0, 10)
    let old = rec.items.find(function (x) { return x.id === id })
    /* 之前同步时没拿到昵称（id 是按 host 生成的），这次拿到了昵称：合并到老账号，别多出一个 */
    if (!old && hostKey) {
      const cand = rec.items.find(function (x) {
        return x.platform === platform && x.host === hostKey && (!x.nickname || x.nickname === hostKey)
      })
      if (cand) {
        old = cand
        id = cand.id
      }
    }

    /* 老快照里有的接口（比如上次抓到过数据中心）不能被这次的局部同步冲掉 */
    const merged = old && old.snapshot ? mergeSnapshot(old.snapshot, snapshot) : snapshot
    if (merged !== snapshot) {
      try {
        summary = summarizeAccount(Object.assign({}, merged, { platform }))
      } catch (e) {
        /* 保留粗算结果 */
      }
    }
    const acc = summary && summary.account
    const keepNick = !!(old && (old.custom || old.renamed))
    const item = {
      id: id,
      platform: platform,
      nickname: (keepNick ? old.nickname : nickname) || (old && old.nickname) || (acc && acc.nickname) || '',
      avatar: (acc && acc.avatar) || (old && old.avatar) || '',
      host: hostKey,
      updatedAt: now,
      firstAt: (old && old.firstAt) || now,
      snapshot: merged,
      summary: summary || null,
    }
    if (old) Object.assign(old, item)
    else rec.items.push(item)
    save(rec)
    return item
  }

  /** 老快照（旧版解析器算出来的）在读的时候重算一遍，昵称/头像/作品跟着更新。 */
  function refresh(it, rec) {
    if (!it || !it.snapshot || !Array.isArray(it.snapshot.items) || !it.snapshot.items.length) return it
    let s = null
    try {
      s = summarizeAccount(Object.assign({}, it.snapshot, { platform: it.platform, updatedAt: it.updatedAt }))
    } catch (e) {
      return it
    }
    if (!s) return it
    const acc = s.account
    const before = JSON.stringify([it.nickname, it.avatar, it.summary && it.summary.stats, it.summary && it.summary.account])
    it.summary = s
    if (acc) {
      it.avatar = acc.avatar || it.avatar || ''
      if (!it.renamed && acc.nickname) it.nickname = acc.nickname
    }
    const after = JSON.stringify([it.nickname, it.avatar, it.summary && it.summary.stats, it.summary && it.summary.account])
    if (rec && before !== after) save(rec)
    return it
  }

  function list(platform) {
    const rec = load()
    rec.items.forEach((x) => refresh(x, rec))
    const want = platformOf(platform)
    return rec.items
      .filter((x) => !want || x.platform === want)
      .map((x) => ({
        id: x.id,
        platform: x.platform,
        nickname: x.nickname || (x.summary && x.summary.account && x.summary.account.nickname) || mineAuthor(x.summary) || (x.host || '未命名账号'),
        custom: !!x.custom,
        renamed: !!x.renamed,
        avatar: x.avatar || '',
        host: x.host,
        updatedAt: x.updatedAt,
        firstAt: x.firstAt,
        stats: (x.summary && x.summary.stats) || { works: 0, play: 0, digg: 0, collect: 0, comment: 0, share: 0 },
        activities: (x.summary && x.summary.activities && x.summary.activities.length) || 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  function get(id) {
    const rec = load()
    const it = id ? rec.items.find((x) => x.id === id) : rec.items.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0]
    if (!it) return null
    refresh(it, rec)
    const summary = it.summary || summarizeAccount(Object.assign({}, it.snapshot, { platform: it.platform, updatedAt: it.updatedAt }))
    return {
      id: it.id,
      platform: it.platform,
      nickname: it.nickname || mineAuthor(summary) || it.host || '',
      avatar: it.avatar,
      host: it.host,
      updatedAt: it.updatedAt,
      firstAt: it.firstAt,
      data: Object.assign({}, summary, { id: it.id, nickname: it.nickname || (summary.account && summary.account.nickname) || '' }),
    }
  }

  function remove(id) {
    const rec = load()
    const before = rec.items.length
    rec.items = rec.items.filter((x) => x.id !== id)
    save(rec)
    /* 这个账号下的上传记录一起删掉，避免删完账号还留着一堆孤儿数据 */
    try {
      const st = uploadsIndex()
      const keep = (st.files || []).filter((x) => x.account !== id)
      if (keep.length !== (st.files || []).length) {
        st.files = keep
        saveUpload(st)
      }
      const dir = path.join(UPLOAD_DIR)
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          if (f === 'index.json') continue
          try {
            const rec = readJSON(path.join(dir, f), null)
            if (rec && rec.account === id) fs.rmSync(path.join(dir, f), { force: true })
          } catch (e) {
            /* 单个文件坏了就跳过 */
          }
        }
      }
    } catch (e) {
      /* 上传索引有问题不影响删账号 */
    }
    return before - rec.items.length
  }

  /** 手动建一个空账号（还没同步过数据也能先起个名字、挂上传文件）。 */
  function create(input) {
    const src = input || {}
    const platform = platformOf(src.platform || 'xhs')
    const nickname = String(src.nickname || '').trim().slice(0, 40)
    if (!nickname) return null
    const rec = loadRaw()
    const id = 'bk_' + (platform || 'x') + '_' + crypto.createHash('sha1').update('custom:' + nickname).digest('hex').slice(0, 10)
    if (rec.items.some((x) => x.id === id)) return rec.items.find((x) => x.id === id)
    const now = Date.now()
    const item = {
      id,
      platform,
      nickname,
      avatar: '',
      host: '',
      updatedAt: now,
      firstAt: now,
      custom: true,
      snapshot: { platform, host: '', kind: 'creator', items: [] },
      summary: null,
    }
    rec.items.push(item)
    save(rec)
    return item
  }

  /** 改显示名（同步回来的昵称也允许改）。 */
  function rename(id, nickname) {
    const name = String(nickname || '').trim().slice(0, 40)
    if (!id || !name) return null
    const rec = loadRaw()
    const it = rec.items.find((x) => x.id === id)
    if (!it) return null
    it.nickname = name
    it.renamed = true
    save(rec)
    return it
  }

  /* ---------------- 本地上传 + 去重 ---------------- */

  function uploadsIndex() {
    return readJSON(path.join(UPLOAD_DIR, 'index.json'), { files: [], sigs: {} })
  }

  function saveUpload(store) {
    writeJSON(path.join(UPLOAD_DIR, 'index.json'), store)
  }

  return { load, save, upsert, list, get, remove, create, rename, UPLOAD_DIR, uploadsIndex, saveUpload }
}

/* ---------------- 表格解析 ---------------- */

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else q = false
      } else cur += c
    } else if (c === '"') q = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

/* ---------------- xlsx（Excel 另存为 .xlsx 的那种） ---------------- */
/* 不引第三方包：自己读 zip 目录，取出 xl/worksheets/sheet1.xml 与 xl/sharedStrings.xml。
   只支持 xlsx（OpenXML）；老的 .xls 二进制不支持。 */

function unzipEntries(buf) {
  const out = {}
  /* 找 End of Central Directory */
  let eocd = -1
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return out
  const count = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break
    const method = buf.readUInt16LE(off + 10)
    const compSize = buf.readUInt32LE(off + 20)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const commentLen = buf.readUInt16LE(off + 32)
    const localOff = buf.readUInt32LE(off + 42)
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen)
    off += 46 + nameLen + extraLen + commentLen
    if (buf.readUInt32LE(localOff) !== 0x04034b50) continue
    const lNameLen = buf.readUInt16LE(localOff + 26)
    const lExtraLen = buf.readUInt16LE(localOff + 28)
    const start = localOff + 30 + lNameLen + lExtraLen
    const data = buf.subarray(start, start + compSize)
    try {
      out[name] = method === 0 ? Buffer.from(data) : zlib.inflateRawSync(data)
    } catch (e) {
      /* 单个文件坏了就跳过 */
    }
  }
  return out
}

function xmlText(v) {
  return String(v || '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function colIndex(ref) {
  const m = /^([A-Z]+)/.exec(String(ref || ''))
  if (!m) return 0
  let n = 0
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** 读 xlsx → { header, rows:[{列名: 值}] } */
export function parseXlsx(buf) {
  const zip = unzipEntries(buf)
  const sharedRaw = zip['xl/sharedStrings.xml'] ? zip['xl/sharedStrings.xml'].toString('utf8') : ''
  const shared = []
  const siRe = /<si>([\s\S]*?)<\/si>/g
  let m
  while ((m = siRe.exec(sharedRaw))) {
    const parts = []
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g
    let n
    while ((n = tRe.exec(m[1]))) parts.push(xmlText(n[1]))
    shared.push(parts.join(''))
  }
  /* 找第一张表（优先 sheet1.xml，其次任何 worksheets/*.xml） */
  const sheetName = Object.keys(zip).find((k) => /^xl\/worksheets\/sheet1\.xml$/.test(k)) || Object.keys(zip).find((k) => /^xl\/worksheets\/.*\.xml$/.test(k))
  if (!sheetName) return { header: [], rows: [] }
  const sheet = zip[sheetName].toString('utf8')

  const table = []
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g
  let r
  while ((r = rowRe.exec(sheet))) {
    const cells = []
    const cRe = /<c([^>]*)>([\s\S]*?)<\/c>/g
    let c
    while ((c = cRe.exec(r[1]))) {
      const attrs = c[1] || ''
      const body = c[2] || ''
      const refM = /r="([A-Z]+\d+)"/.exec(attrs)
      const typeM = /t="([^"]+)"/.exec(attrs)
      let val = ''
      const vM = /<v>([\s\S]*?)<\/v>/.exec(body)
      if (typeM && typeM[1] === 's') {
        val = shared[Number(vM && vM[1])] || ''
      } else if (typeM && typeM[1] === 'inlineStr') {
        const tM = /<t[^>]*>([\s\S]*?)<\/t>/.exec(body)
        val = tM ? xmlText(tM[1]) : ''
      } else if (vM) {
        val = xmlText(vM[1])
      }
      cells[refM ? colIndex(refM[1]) : cells.length] = val
    }
    table.push(cells)
  }
  if (!table.length) return { header: [], rows: [] }
  const header = table[0].map((h) => String(h || '').trim())
  const rows = []
  for (let i = 1; i < table.length; i++) {
    const o = {}
    header.forEach((h, j) => {
      if (h) o[h] = table[i][j] === undefined ? '' : String(table[i][j]).trim()
    })
    if (Object.keys(o).some((k) => o[k] !== '')) rows.push(o)
  }
  return { header, rows }
}

export function parseCsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
  if (!lines.length) return { rows: [], header: [] }
  const header = splitCsvLine(lines[0]).map((h) => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const o = {}
    header.forEach((h, j) => {
      o[h] = (cells[j] === undefined ? '' : cells[j]).trim()
    })
    rows.push(o)
  }
  return { rows, header }
}

const ALIASES = {
  title: ['标题', '作品标题', '内容', '作品', 'title', 'desc', 'caption', 'name'],
  play: ['播放', '播放量', '播放数', 'play', 'play_count', 'views', 'view'],
  digg: ['点赞', '点赞数', '赞', 'digg', 'like', 'like_count', 'likes'],
  collect: ['收藏', '收藏数', '藏', 'collect', 'favorite', 'collect_count'],
  comment: ['评论', '评论数', '评', 'comment', 'comment_count'],
  share: ['分享', '转发', 'share', 'share_count', 'forward'],
  time: ['发布时间', '时间', '日期', 'date', 'create_time', 'publish_time', 'time'],
  id: ['id', 'aweme_id', 'note_id', '作品id', '笔记id'],
}

function pickField(row, keys) {
  for (const k of Object.keys(row)) {
    const lk = String(k).toLowerCase().trim()
    if (keys.some((a) => lk === a.toLowerCase())) return row[k]
  }
  return ''
}

export function normalizeRow(row) {
  const title = String(pickField(row, ALIASES.title) || '').trim()
  const id = String(pickField(row, ALIASES.id) || '').trim()
  const t = pickField(row, ALIASES.time)
  let time = 0
  if (t) {
    const s = String(t).trim()
    if (/^\d{10}$/.test(s)) time = Number(s) * 1000
    else if (/^\d{13}$/.test(s)) time = Number(s)
    else {
      const d = new Date(s.replace(/\./g, '-').replace(/\//g, '-'))
      if (!isNaN(d.getTime())) time = d.getTime()
    }
  }
  const n = (k) => {
    const v = String(pickField(row, ALIASES[k]) || '').replace(/[,\s]/g, '')
    const m = v.match(/^([\d.]+)\s*(万|w|W|千|k|K|亿)?/)
    if (!m) return 0
    const base = Number(m[1]) || 0
    const unit = m[2]
    if (unit === '万' || unit === 'w' || unit === 'W') return Math.round(base * 10000)
    if (unit === '千' || unit === 'k' || unit === 'K') return Math.round(base * 1000)
    if (unit === '亿') return Math.round(base * 1e8)
    return Math.round(base)
  }
  return {
    id,
    title,
    play: n('play'),
    digg: n('digg'),
    collect: n('collect'),
    comment: n('comment'),
    share: n('share'),
    time,
    raw: row,
  }
}

export function signatureOf(r) {
  const base = r.id ? 'id:' + r.id : 'k:' + (r.title || '').slice(0, 60) + '|' + (r.time || '') + '|' + r.play
  return crypto.createHash('sha1').update(base).digest('hex').slice(0, 16)
}
