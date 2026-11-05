/**
 * 社交数据层：热榜 / 关键词榜单 / 博主搜索 / 账号画像。
 * 全部走 TikHub（需要 key，小红书与搜索类接口为付费路由，抖音单条/热榜可用免费额度）。
 * 不写盘、不依赖 server.mjs，纯函数 + 网络。
 */
import { call, dig, mapXhsNote, mapDouyinAweme, dySecUidOf, xhsUserIdOf } from './tikhub.mjs'

/* ---------------- 通用 ---------------- */

/** 「1万+」「3.4k」「12.3万」→ 数字 */
export function numOf(v) {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/[,，\s+]/g, '')
  const m = s.match(/^([\d.]+)\s*([万wWkK千亿]?)/)
  if (!m) return 0
  const n = Number(m[1]) || 0
  const u = m[2]
  if (u === '万' || u === 'w' || u === 'W') return Math.round(n * 10000)
  if (u === '亿') return Math.round(n * 100000000)
  if (u === 'k' || u === 'K' || u === '千') return Math.round(n * 1000)
  return Math.round(n)
}

const pickUrl = (u) => {
  if (!u) return ''
  if (typeof u === 'string') return u
  const list = u.url_list || u.urlList || u.url_list_2 || []
  return Array.isArray(list) && list.length ? String(list[0]) : ''
}

/* ---------------- 抖音热榜 ---------------- */

/**
 * 抖音热词榜（免费额度可用）。
 * @returns {Promise<{at:number, platform:string, kind:string, items:Array}>}
 */
export async function hotWords({ limit = 50 } = {}) {
  const body = await call('/api/v1/douyin/app/v3/fetch_hot_search_list', {})
  const list = dig(body, 'data.data.word_list', 'data.word_list', 'data.data') || []
  const items = (Array.isArray(list) ? list : [])
    .map((w, i) => ({
      rank: i + 1,
      word: w.word || w.sentence || '',
      hot: Number(w.hot_value || w.view_count || w.discuss_video_count || 0),
      label: Number(w.label || 0),
      url: 'https://www.douyin.com/search/' + encodeURIComponent(w.word || ''),
    }))
    .filter((x) => x.word)
    .slice(0, limit)
  return { at: Date.now(), platform: 'douyin', kind: 'word', items }
}

/** 抖音热榜（billboard）：词条 + 热度 + 每分钟趋势 */
export async function hotBoard({ page = 1, pageSize = 30 } = {}) {
  const body = await call('/api/v1/douyin/billboard/fetch_hot_challenge_list', { page, page_size: pageSize })
  const arr = dig(body, 'data.data.objs', 'data.objs') || []
  const items = (Array.isArray(arr) ? arr : [])
    .map((c) => ({
      rank: Number(c.rank || 0),
      title: c.sentence || '',
      hot: Number(c.hot_score || 0),
      videos: Number(c.video_count || 0),
      tag: Number(c.sentence_tag || 0),
      at: Number(c.create_at || 0) * 1000,
      trends: Array.isArray(c.trends) ? c.trends.slice(-24).map((x) => Number(x.hot_score || 0)) : [],
      url: 'https://www.douyin.com/search/' + encodeURIComponent(c.sentence || ''),
    }))
    .filter((x) => x.title)
  return { at: Date.now(), platform: 'douyin', kind: 'hot', items }
}

/* ---------------- 关键词榜单（当日热门） ---------------- */

/**
 * 按关键词拉内容，按时间窗过滤后按互动排序 —— 当「当日热门榜单」用。
 * @param {{platform:'xhs'|'douyin', keyword:string, days?:number, limit?:number, sort?:'like'|'collect'|'comment'|'recent'}} o
 */
export async function keywordBoard({ platform = 'xhs', keyword, days = 1, limit = 30, sort = 'like' } = {}) {
  const plat = platform === 'douyin' ? 'douyin' : 'xhs'
  if (!keyword || !String(keyword).trim()) throw new Error('先给个关键词')
  const kw = String(keyword).trim()
  const now = Date.now()
  const span = Math.max(1, Number(days) || 1) * 86400000
  const out = []

  for (let p = 0; p < 2; p++) {
    let body
    if (plat === 'xhs') {
      body = await call('/api/v1/xiaohongshu/app_v2/search_notes', { keyword: kw, page: p + 1 })
      const list = dig(body, 'data.data.items', 'data.items', 'data.data.notes', 'data.notes') || []
      if (!Array.isArray(list) || !list.length) break
      list.forEach((n) => {
        try {
          const raw = n.note || n.note_card || n
          const it = mapXhsNote(raw)
          if (!it || !it.noteId) return
          const s = it.stats || (it.stats = { likes: 0, collects: 0, comments: 0, shares: 0 })
          s.likes = s.likes || Number(raw.liked_count || raw.like_count || 0)
          s.collects = s.collects || Number(raw.collected_count || 0)
          s.comments = s.comments || Number(raw.comments_count || 0)
          it.publishTime = Number(raw.last_update_time || raw.time || raw.create_time || 0) || it.publishTime
          if (!it.coverUrl && Array.isArray(raw.images_list) && raw.images_list[0]) {
            const im = raw.images_list[0]
            it.coverUrl = im.url || im.url_size_large || ''
          }
          const u = raw.user || {}
          if (!it.author || !it.author.name) {
            it.author = { name: String(u.nickname || u.nick_name || ''), id: String(u.user_id || u.userid || ''), avatar: u.image || '' }
          }
          out.push(it)
        } catch (e) {}
      })
    } else {
      let dyBody
      try {
        dyBody = await call('/api/v1/douyin/search/fetch_video_search_v1', {}, {
        method: 'POST',
        body: {
          keyword: kw,
          cursor: p * 20,
          sort_type: sort === 'recent' ? '2' : '1',
          publish_time: days <= 1 ? '1' : days <= 7 ? '7' : '180',
          filter_duration: '0',
          content_type: '0',
        },
        })
      } catch (e) {
        if (p === 0) throw e
        break
      }
      body = dyBody
      const cards = dig(body, 'data.data', 'data.aweme_list') || []
      const list = Array.isArray(cards) ? cards : []
      if (!list.length) break
      list.forEach((c) => {
        const aw = c && (c.aweme_info || (c.aweme_id ? c : null))
        if (!aw) return
        try {
          const it = mapDouyinAweme(aw)
          if (it && it.noteId) out.push(it)
        } catch (e) {}
      })
    }
  }

  const score = (x) => {
    const s = x.stats || {}
    if (sort === 'collect') return Number(s.collects || 0)
    if (sort === 'comment') return Number(s.comments || 0)
    if (sort === 'recent') return Number(x.publishTime || 0)
    return Number(s.likes || 0)
  }

  const seen = new Set()
  const dedup = out.filter((x) => {
    const k = x.platform + ':' + x.noteId
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  // 时间戳统一成毫秒（抖音/小红书都有秒级）
  const msOf = (x) => {
    const raw = Number(x.publishTime || 0)
    if (!raw) return 0
    return raw < 1e12 ? raw * 1000 : raw
  }

  const inWindow = dedup
    .map((x) => Object.assign({}, x, { publishTime: msOf(x) }))
    .filter((x) => !x.publishTime || now - x.publishTime <= span)

  const items = inWindow.sort((a, b) => score(b) - score(a)).slice(0, Math.min(60, Number(limit) || 30))
  return {
    at: now,
    platform: plat,
    kind: 'keyword',
    keyword: kw,
    days: Number(days) || 1,
    sort,
    scanned: dedup.length,
    items,
  }
}

/* ---------------- 博主 ---------------- */

export async function searchUsers({ platform = 'xhs', keyword, limit = 20 } = {}) {
  const plat = platform === 'douyin' ? 'douyin' : 'xhs'
  if (!keyword) throw new Error('先给个博主关键词')
  const kw = String(keyword).trim()
  const out = []
  if (plat === 'xhs') {
    const body = await call('/api/v1/xiaohongshu/app_v2/search_users', { keyword: kw })
    const users = dig(body, 'data.data.users', 'data.users') || []
    ;(Array.isArray(users) ? users : []).forEach((u) => {
      out.push({
        platform: 'xhs',
        id: u.id || u.user_id || '',
        redId: u.red_id || '',
        name: u.name || u.nickname || '',
        avatar: pickUrl(u.image || u.avatar),
        desc: u.desc || u.desc_text || '',
        followers: numOf(u.fans || u.follower_count || (u.sub_title || '').replace(/[^\d.万kK]/g, '') + (/万/.test(u.sub_title || '') ? '万' : '')),
        followersText: u.sub_title || '',
        likes: numOf(u.liked || u.like_count || 0),
        verified: !!u.red_official_verified,
        url: u.id ? 'https://www.xiaohongshu.com/user/profile/' + u.id : '',
      })
    })
  } else {
    const body = await call('/api/v1/douyin/search/fetch_user_search_v2', {}, {
      method: 'POST',
      body: { keyword: kw, cursor: 0 },
    })
    const users = dig(body, 'data.data.user_list', 'data.user_list') || []
    ;(Array.isArray(users) ? users : []).forEach((u) => {
      out.push({
        platform: 'douyin',
        id: u.user_id || u.sec_uid || '',
        secUid: u.user_id || '',
        name: u.nick_name || '',
        avatar: pickUrl(u.avatar_url),
        desc: u.signature || '',
        followers: numOf(u.fans_cnt || 0),
        likes: numOf(u.like_cnt || 0),
        notes: numOf(u.publish_cnt || 0),
        url: u.user_id ? 'https://www.douyin.com/user/' + u.user_id : '',
      })
    })
  }
  return { at: Date.now(), platform: plat, keyword: kw, items: out.slice(0, Number(limit) || 20) }
}

/** 账号画像：粉丝/获赞/作品数（我自己的账号靠它做监控） */
export async function userProfile({ platform = 'xhs', input }) {
  const plat = platform === 'douyin' ? 'douyin' : 'xhs'
  const raw = String(input || '').trim()
  if (!raw) throw new Error('先给账号链接或 id')

  if (plat === 'xhs') {
    const uid = xhsUserIdOf(raw)
    if (!uid) throw new Error('看不出小红书用户 id，贴主页链接（/user/profile/<id>）或纯 id')
    const body = await call('/api/v1/xiaohongshu/web_v3/fetch_user_info', { user_id: uid })
    const d = (body && body.data) || {}
    const d2 = d.data || d
    const basic = dig(d2, 'basic_info') || {}
    const its = Array.isArray(d2.interactions) ? d2.interactions : []
    const get = (t) => (its.find((x) => x.type === t) || {}).count || ''
    return {
      platform: 'xhs',
      id: uid,
      name: basic.nickname || '',
      avatar: basic.imageb || basic.images || '',
      desc: basic.desc || '',
      redId: basic.red_id || '',
      followers: numOf(get('fans')),
      followersText: get('fans'),
      likes: numOf(get('interaction')) || Number(d2.liked || 0) + Number(d2.collected || 0),
      likesText: get('interaction'),
      notes: numOf(get('notes')) || Number(dig(d2, 'tab_public.notes.count') || 0),
      url: 'https://www.xiaohongshu.com/user/profile/' + uid,
      at: Date.now(),
    }
  }

  const sec = dySecUidOf(raw)
  if (!sec) throw new Error('看不出抖音账号 id，贴主页链接（/user/<sec_uid>）或 sec_uid')
  const body = await call('/api/v1/douyin/app/v3/handler_user_profile', { sec_user_id: sec })
  const u = dig(body, 'data.user', 'user', 'data') || {}
  return {
    platform: 'douyin',
    id: u.sec_uid || sec,
    secUid: u.sec_uid || sec,
    name: u.nickname || '',
    avatar: pickUrl(u.avatar_larger || u.avatar_168x168 || u.avatar_thumb),
    desc: u.signature || '',
    followers: numOf(u.follower_count || 0),
    likes: numOf(u.total_favorited || 0),
    notes: numOf(u.aweme_count || 0),
    following: numOf(u.following_count || 0),
    url: 'https://www.douyin.com/user/' + (u.sec_uid || sec),
    at: Date.now(),
  }
}
