/* TikHub 云端拉取（小红书 / 抖音）。
 *
 * 用途：不用打开浏览器也能拿到笔记/作品详情 —— 采集库「云端拉取」面板用它补数据，
 * 也用来批量抓某个博主的主页、或按关键词找对标。
 *
 * key 顺序：DEBAO_TIKHUB_KEY / TIKHUB_API_KEY → <仓库>/tools/tikhub/.tikhub.key
 * 每个请求都会计费（免费额度约 $0.05），所以这里只做「用户点了才调」的被动调用。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..', '..')
const KEY_CANDIDATES = [
  path.join(REPO, 'tools', 'tikhub', '.tikhub.key'),
  process.env.DEBAO_DATA_DIR ? path.join(path.resolve(process.env.DEBAO_DATA_DIR), 'tikhub.key') : '',
  path.join(HERE, '..', 'data', 'tikhub.key'),
]
const BASE = process.env.DEBAO_TIKHUB_BASE || 'https://api.tikhub.io'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const TIMEOUT = Number(process.env.DEBAO_TIKHUB_TIMEOUT || 25000)

let lastError = ''

export function keyInfo() {
  const env = (process.env.DEBAO_TIKHUB_KEY || process.env.TIKHUB_API_KEY || '').trim()
  if (env) return { ok: true, from: 'env', file: '' }
  for (const f of KEY_CANDIDATES) {
    try {
      const k = fs.readFileSync(f, 'utf8').trim()
      if (k) return { ok: true, from: 'file', file: f }
    } catch (e) {
      /* 没有就继续找 */
    }
  }
  return { ok: false, from: '', file: KEY_CANDIDATES[0], lastError: lastError }
}

function readKey() {
  const env = (process.env.DEBAO_TIKHUB_KEY || process.env.TIKHUB_API_KEY || '').trim()
  if (env) return env
  for (const f of KEY_CANDIDATES) {
    try {
      const k = fs.readFileSync(f, 'utf8').trim()
      if (k) return k
    } catch (e) {
      /* 下一个 */
    }
  }
  return ''
}

function normError(body) {
  const d = (body && body.detail) || {}
  const code = Number((body && body.code) || d.code || 0)
  const msg = String((body && (body.message_zh || body.message)) || d.message_zh || d.message || '')
  return { code, msg }
}

export async function call(apiPath, params, opt = {}) {
  const key = readKey()
  if (!key) {
    throw new Error(
      '没找到 TikHub key：把一行 key 写进 tools\\tikhub\\.tikhub.key，或设 TIKHUB_API_KEY 后重启采集桥',
    )
  }
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const method = String(opt.method || 'GET').toUpperCase()
  const url =
    BASE + apiPath + (method === 'GET' && qs.toString() ? '?' + qs.toString() : '')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  let res
  try {
    const init = {
      method,
      headers: {
        Authorization: 'Bearer ' + key,
        Accept: 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'User-Agent': UA,
      },
      signal: ctrl.signal,
    }
    if (method === 'POST') {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(opt.body || {})
    }
    res = await fetch(url, init)
  } catch (e) {
    clearTimeout(timer)
    lastError = String((e && e.message) || e)
    throw new Error('连不上 TikHub（' + lastError + '）')
  }
  clearTimeout(timer)
  const text = await res.text()
  let body = null
  try {
    body = JSON.parse(text)
  } catch (e) {
    body = null
  }
  if (res.status === 401) throw new Error('TikHub key 无效或已停用（401）——去 user.tikhub.io 后台重新复制')
  if (res.status === 402) {
    throw new Error(
      '这个接口要付费余额，且不接受免费额度（当前余额 ¥0）——去 https://user.tikhub.io/users/add_credit 充值；不充也能用浏览器扩展「采集到自媒体库」抓（免费）',
    )
  }
  if (res.status === 403) {
    throw new Error(
      'TikHub 的 key 缺这个接口的权限（403）：去 user.tikhub.io/dashboard/api 编辑 key，勾上 ' +
        (apiPath.indexOf('/xiaohongshu/') >= 0 ? '/api/v1/xiaohongshu/app_v2/' : '/api/v1/douyin/search/'),
    )
  }
  if (!body) throw new Error('TikHub 返回了非 JSON（HTTP ' + res.status + '）：' + text.slice(0, 120))
  const e2 = normError(body)
  if (e2.code !== 200) {
    lastError = e2.msg
    if (e2.code === 402 || /balance|余额|credit|付费/i.test(lastError)) {
      throw new Error(
        '这个接口要付费余额，且不接受免费额度（当前余额 ¥0）——去 https://user.tikhub.io/users/add_credit 充值；不充也能用浏览器扩展「采集到自媒体库」抓（免费）。原话：' +
          lastError.slice(0, 90),
      )
    }
    if (e2.code === 403) {
      throw new Error(
        'TikHub 的 key 缺这个接口的权限（403）：去 user.tikhub.io/dashboard/api 编辑 key，勾上 ' +
          (apiPath.indexOf('/xiaohongshu/') >= 0 ? '/api/v1/xiaohongshu/app_v2/' : '/api/v1/douyin/search/'),
      )
    }
    throw new Error('TikHub 返回 ' + (e2.code || res.status) + '：' + lastError.slice(0, 160))
  }
  return body
}

/* ------------------------------------------------------------ 通用工具 */

export function dig(root, ...paths) {
  for (const p of paths) {
    let cur = root
    for (const seg of p.split('.')) {
      if (cur == null) break
      cur = cur[seg]
    }
    if (cur !== undefined && cur !== null && cur !== '') return cur
  }
  return undefined
}

function bfs(root, test, maxNodes = 6000) {
  const queue = [root]
  const seen = new Set()
  let n = 0
  while (queue.length && n < maxNodes) {
    const cur = queue.shift()
    n++
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue
    seen.add(cur)
    try {
      if (test(cur)) return cur
    } catch (e) {
      /* 忽略怪结构 */
    }
    for (const k in cur) {
      const v = cur[k]
      if (v && typeof v === 'object') queue.push(v)
    }
  }
  return null
}

function pickUrl(u) {
  if (!u) return ''
  if (typeof u === 'string') return u
  if (Array.isArray(u)) return u.find((x) => typeof x === 'string' && /^https?:/.test(x)) || ''
  if (Array.isArray(u.url_list)) return u.url_list.find((x) => /^https?:/.test(x)) || ''
  if (typeof u.url_default === 'string') return u.url_default
  if (typeof u.url === 'string') return u.url
  return ''
}

export function xhsIdOf(input) {
  const s = String(input || '').trim()
  if (!s) return ''
  const m = s.match(/\/(?:explore|discovery\/item|note)\/([0-9a-f]{20,})/i)
  if (m) return m[1]
  if (/^[0-9a-f]{20,}$/i.test(s)) return s
  return ''
}

export function dyIdOf(input) {
  const s = String(input || '').trim()
  if (!s) return ''
  const m = s.match(/\/(?:video|note)\/(\d{15,})/)
  if (m) return m[1]
  if (/^\d{15,}$/.test(s)) return s
  return ''
}

export function dySecUidOf(input) {
  const s = String(input || '').trim()
  const m = s.match(/\/user\/([A-Za-z0-9_-]{20,})/)
  if (m) return m[1]
  if (/^(MS4w|MS4y)[A-Za-z0-9_-]{10,}$/.test(s)) return s
  return ''
}

export function xhsUserIdOf(input) {
  const s = String(input || '').trim()
  const m = s.match(/\/user\/profile\/([0-9a-f]{10,})/i)
  if (m) return m[1]
  if (/^[0-9a-f]{20,}$/i.test(s)) return s
  return ''
}

/* ------------------------------------------------------- 结构 → 统一 item */

function streamUrl(video) {
  const media = (video && video.media) || {}
  const stream = media.stream || {}
  for (const codec of ['h264', 'h265', 'hevc', 'av1']) {
    const arr = stream[codec]
    if (Array.isArray(arr)) {
      for (const c of arr) {
        const u = c && (c.masterUrl || c.master_url || c.url)
        if (u) return u
      }
    }
  }
  return media.masterUrl || media.master_url || ''
}

export function mapXhsNote(card) {
  const note = card.note_card || card.note || card
  const inter = note.interact_info || note.interactInfo || {}
  const user = note.user || {}
  const video = note.video || {}
  const images = (note.image_list || note.imageList || []).map((im) =>
    pickUrl(im.url_default || im.url || im.url_pre || im),
  )
  const vurl = streamUrl(video) || (video.media && video.media.video_id ? '' : '')
  return {
    platform: 'xhs',
    noteId: String(note.note_id || note.id || card.id || '').trim(),
    title: String(note.title || note.display_title || '').trim(),
    desc: String(note.desc || '').trim(),
    tags: (note.tag_list || note.tagList || []).map((t) => t && (t.name || t.tag_name)).filter(Boolean),
    coverUrl: pickUrl(note.image_list && note.image_list[0]) || images[0] || '',
    mediaType: vurl ? 'video' : 'image',
    videoUrl: vurl,
    videoUrlFrom: vurl ? 'tikhub' : '',
    images: images.slice(0, 9),
    durationSec: 0,
    stats: {
      likes: Number(inter.liked_count || inter.likedCount || 0) || 0,
      collects: Number(inter.collected_count || inter.collectedCount || 0) || 0,
      comments: Number(inter.comment_count || inter.commentCount || 0) || 0,
      shares: Number(inter.share_count || inter.shareCount || 0) || 0,
    },
    author: {
      name: String(user.nickname || user.nick_name || '').trim(),
      id: String(user.user_id || user.userid || '').trim(),
      avatar: pickUrl(user.image || user.avatar),
    },
    publishTime: String(note.time || note.create_time || ''),
    url: 'https://www.xiaohongshu.com/explore/' + String(note.note_id || note.id || card.id || ''),
    source: 'tikhub',
  }
}

export function mapDouyinAweme(aw) {
  const st = aw.statistics || aw.stats || {}
  const au = aw.author || {}
  const vd = aw.video || {}
  const play =
    pickUrl(vd.play_addr) ||
    (Array.isArray(vd.bit_rate) && vd.bit_rate[0] && pickUrl(vd.bit_rate[0].play_addr)) ||
    ''
  const imgs = (aw.images || []).map((im) => pickUrl(im)).filter(Boolean)
  return {
    platform: 'douyin',
    noteId: String(aw.aweme_id || aw.awemeId || '').trim(),
    title: String(aw.desc || '').slice(0, 40),
    desc: String(aw.desc || '').trim(),
    tags: (aw.text_extra || []).map((t) => t && t.hashtag_name).filter(Boolean),
    coverUrl: pickUrl(vd.cover) || pickUrl(vd.origin_cover) || imgs[0] || '',
    mediaType: play ? 'video' : 'image',
    videoUrl: play,
    videoUrlFrom: play ? 'tikhub' : '',
    images: imgs.slice(0, 9),
    durationSec: vd.duration ? Math.round(Number(vd.duration) / 1000) : 0,
    musicTitle: String((aw.music && aw.music.title) || '').trim(),
    stats: {
      likes: Number(st.digg_count || 0) || 0,
      collects: Number(st.collect_count || 0) || 0,
      comments: Number(st.comment_count || 0) || 0,
      shares: Number(st.share_count || 0) || 0,
    },
    author: {
      name: String(au.nickname || '').trim(),
      id: String(au.sec_uid || '').trim(),
      avatar: pickUrl(au.avatar_thumb || au.avatar_medium || au.avatar_larger),
    },
    publishTime: String(aw.create_time || ''),
    url: 'https://www.douyin.com/video/' + String(aw.aweme_id || aw.awemeId || ''),
    source: 'tikhub',
  }
}

function isXhsNoteNode(o) {
  if (!o || typeof o !== 'object') return false
  if (o.note_card && (o.note_card.title || o.note_card.desc)) return true
  const hasInter = !!(o.interact_info || o.interactInfo)
  return hasInter && !!(o.title || o.display_title || o.desc)
}

/* ------------------------------------------------------------ 对外接口 */

export async function fetchNote({ platform, input }) {
  const plat = platform === 'douyin' ? 'douyin' : 'xhs'
  if (plat === 'xhs') {
    const id = xhsIdOf(input)
    if (!id) throw new Error('没认出小红书笔记 id：把整条链接贴进来（/explore/… 或 /discovery/item/…）')
    let body = null
    let lastErr = null
    for (const p of [
      '/api/v1/xiaohongshu/app_v2/get_image_note_detail',
      '/api/v1/xiaohongshu/app_v2/get_video_note_detail',
    ]) {
      try {
        body = await call(p, { note_id: id })
        const node = bfs(body, isXhsNoteNode)
        if (node) return { item: mapXhsNote(node), kind: 'note' }
        lastErr = new Error('接口返回了但没有笔记内容（可能被删/私密）')
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr || new Error('拉取失败')
  }
  const id = dyIdOf(input)
  const body = id
    ? await call('/api/v1/douyin/app/v3/fetch_one_video', { aweme_id: id })
    : await call('/api/v1/douyin/app/v3/fetch_one_video_by_share_url', { share_url: input })
  const aw = dig(body, 'data.aweme_details', 'data.aweme_detail', 'data.aweme_list', 'data.item_list')
  const one = Array.isArray(aw) ? aw[0] : aw
  const fallback = one || bfs(body, (o) => o && o.aweme_id && (o.desc != null || o.statistics))
  if (!fallback) throw new Error('接口返回里没有作品（filter_list 非空通常是已删除/私密/地区限制）')
  return { item: mapDouyinAweme(fallback), kind: 'note' }
}

export async function fetchUserNotes({ platform, input, pages = 1 }) {
  const plat = platform === 'douyin' ? 'douyin' : 'xhs'
  const out = []
  if (plat === 'xhs') {
    const uid = xhsUserIdOf(input)
    if (!uid) throw new Error('没认出小红书用户 id：贴 /user/profile/<id> 或纯 id')
    let cursor = ''
    for (let p = 0; p < Math.min(5, Number(pages) || 1); p++) {
      const body = await call('/api/v1/xiaohongshu/app_v2/get_user_posted_notes', { user_id: uid, cursor })
      const list = dig(body, 'data.data.notes', 'data.notes', 'data.data.note_list', 'data.note_list') || []
      if (!Array.isArray(list) || !list.length) break
      list.forEach((n) => {
        try {
          out.push(mapXhsNote(n))
        } catch (e) {
          /* 跳过坏项 */
        }
      })
      cursor = dig(body, 'data.data.cursor', 'data.cursor') || ''
      if (!cursor) break
    }
  } else {
    const sec = dySecUidOf(input)
    if (!sec) throw new Error('没认出抖音用户：贴 https://www.douyin.com/user/MS4wLj…')
    let cursor = 0
    for (let p = 0; p < Math.min(5, Number(pages) || 1); p++) {
      const body = await call('/api/v1/douyin/app/v3/fetch_user_post_videos', {
        sec_user_id: sec,
        max_cursor: cursor,
        count: 20,
      })
      const list = dig(body, 'data.aweme_list', 'data.data.aweme_list', 'data.item_list') || []
      if (!Array.isArray(list) || !list.length) break
      list.forEach((a) => {
        try {
          out.push(mapDouyinAweme(a))
        } catch (e) {
          /* 跳过坏项 */
        }
      })
      const hasMore = dig(body, 'data.has_more', 'data.data.has_more')
      cursor = dig(body, 'data.max_cursor', 'data.data.max_cursor') || 0
      if (!hasMore) break
    }
  }
  return out.filter((x) => x && x.noteId)
}

export async function searchNotes({ platform, keyword, pages = 1 }) {
  const plat = platform === 'douyin' ? 'douyin' : 'xhs'
  const out = []
  if (!keyword) throw new Error('先给个关键词')
  for (let p = 0; p < Math.min(5, Number(pages) || 1); p++) {
    let body
    if (plat === 'xhs') {
      body = await call('/api/v1/xiaohongshu/app_v2/search_notes', { keyword, page: p + 1 })
      const list = dig(body, 'data.data.items', 'data.items', 'data.data.notes', 'data.notes') || []
      if (!Array.isArray(list) || !list.length) break
      list.forEach((n) => {
        try {
          out.push(mapXhsNote(n))
        } catch (e) {
          /* 跳过 */
        }
      })
    } else {
      body = await call(
        '/api/v1/douyin/search/fetch_video_search_v2',
        {},
        {
          method: 'POST',
          body: {
            keyword,
            offset: p * 20,
            count: 20,
            search_channel: 'aweme_video_web',
            sort_type: 0,
            publish_time: 0,
            filter_duration: 0,
            is_premium: 0,
            content_type: 0,
          },
        },
      )
      const list = dig(body, 'data.data', 'data.business_data', 'data.data_list', 'data.aweme_list') || []
      if (!Array.isArray(list) || !list.length) break
      list.forEach((a) => {
        try {
          out.push(mapDouyinAweme(a))
        } catch (e) {
          /* 跳过 */
        }
      })
    }
  }
  return out.filter((x) => x && (x.noteId || x.desc))
}

export async function accountUsage() {
  const body = await call('/api/v1/tikhub/user/get_user_daily_usage', {})
  const d = body.data || {}
  return {
    email: d.user_email || '',
    date: d.date || '',
    usage: Number(d.usage || 0),
    freeCreditUsage: Number(d.free_credit_usage || 0),
    total: Number(d.total_request_per_day || 0),
    counters: d.uri_counts || {},
  }
}
