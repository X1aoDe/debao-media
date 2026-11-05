/* 把扩展从创作者后台抓下来的原始响应（items: [{url, at, json}]）提炼成人能看的东西：
   账号信息、作品数据、平台活动。后台接口形状经常变，所以这里用「结构探测」而不是写死路径：
   凡是长得像作品（有 aweme_id + statistics）或像活动（有 show_name + 截止时间）的对象就收。 */

const MAX_WORKS = 300

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
}

function firstUrl(u) {
  if (!u) return ''
  if (typeof u === 'string') return u
  if (Array.isArray(u.url_list) && u.url_list.length) return u.url_list[0]
  if (typeof u.url === 'string') return u.url
  return ''
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 从任意对象里捞作品。 */
function firstNum() {
  for (let i = 0; i < arguments.length; i++) {
    const v = arguments[i]
    if (v !== undefined && v !== null && v !== '' && !isNaN(Number(v))) return Number(v)
  }
  return 0
}

function pickWork(o) {
  const id = String(o.aweme_id || o.awemeId || o.item_id || o.note_id || o.noteId || o.id || '')
  if (!id || id.length < 6) return null
  const st = o.statistics || o.stats || o.metrics || {}
  const hasStat =
    (st && (st.play_count != null || st.digg_count != null || st.collect_count != null || st.comment_count != null || st.view_count != null || st.like_count != null || st.favorite_count != null)) ||
    o.liked_count != null ||
    o.read_count != null ||
    o.imp_count != null ||
    o.view_count != null ||
    o.play_count != null ||
    o.likes != null ||
    o.views != null ||
    o.collected_count != null
  if (!hasStat) return null
  const video = o.video || {}
  const cover =
    firstUrl(video.cover) ||
    firstUrl(o.cover && o.cover.url_list && o.cover.url_list[0]) ||
    firstUrl(o.cover) ||
    firstUrl(o.picture_info && o.picture_info.images && o.picture_info.images[0] && o.picture_info.images[0].url_list && o.picture_info.images[0].url_list[0]) ||
    firstUrl(o.cover_url) ||
    firstUrl(video.origin_cover) ||
    firstUrl(o.image_cover) ||
    firstUrl(o.images_list && o.images_list[0]) ||
    firstUrl(o.image)
  const title = String(o.desc || o.description || o.item_title || o.title || o.note_title || o.display_title || o.caption || '').slice(0, 120)
  if (!title && !cover) return null
  return {
    id,
    title,
    cover,
    createTime: (function () {
      const v = firstNum(o.create_time, o.createTime, o.publish_time, o.publishTime, o.time, o.user_update_time, o.update_time)
      if (!v) return 0
      return v > 1e11 ? v : v * 1000
    })(),
    duration: Math.round(firstNum(o.duration, video.duration) / 1000) || 0,
    play: firstNum(st.play_count, st.view_count, st.play, st.vv, o.view_count, o.views, o.play_count, o.play, o.read_count, o.imp_count),
    digg: firstNum(st.digg_count, st.like_count, st.digg, o.liked_count, o.likes, o.digg_count, o.like_count, o.digg),
    collect: firstNum(st.collect_count, st.favorite_count, st.collect, o.collected_count, o.collects, o.collect_count, o.collect),
    comment: firstNum(st.comment_count, st.comment, o.comments_count, o.comments, o.comment_count, o.comment),
    share: firstNum(st.share_count, st.share, o.shared_count, o.shares, o.share_count, o.share),
    /* 抖音后台特有的质量指标（0-1 的小数，UI 里乘 100） */
    extra: {
      completion5s: firstNum(st.completion_rate_5s, st.completion_rate),
      bounce2s: firstNum(st.bounce_rate_2s, st.bounce_rate),
      coverCtr: firstNum(st.cover_click_rate, st.cover_ctr),
      avgView: firstNum(st.avg_view_second, st.avg_play_duration),
      coverShow: firstNum(st.cover_show, st.show_count),
    },
    url: o.share_url || o.shareUrl || '',
    author: String((o.author && (o.author.nickname || o.author.unique_id)) || o.nickname || ''),
    src: '',
  }
}

/** 从任意对象里捞活动。 */
function pickActivity(o) {
  const name = String(o.show_name || o.activity_name || o.name || '')
  if (!name || name.length < 2) return null
  const end = num(o.show_end_time || o.end_time || o.endTime)
  if (!end) return null
  return {
    id: String(o.activity_id || o.id || name),
    name,
    tip: String(o.recommendation || o.desc || '').slice(0, 80),
    head: String(o.head_image || ''),
    end,
    start: num(o.show_start_time || o.start_time),
    tag: String(o.query_tag_name || o.activity_incentive_name || ''),
    link: String(o.jump_link || ''),
  }
}

/** 从任意对象里捞账号信息。 */
const BAD_NICKS = ['所有笔记', '全部笔记', '作品管理', '数据概览', '笔记列表', '作品列表', '全部作品', '内容管理']

function pickAccount(o) {
  const nick = o.nickname || o.nick_name || o.name
  if (!nick || typeof nick !== 'string') return null
  const name = nick.trim()
  if (!name || name.length > 30 || BAD_NICKS.indexOf(name) >= 0) return null
  /* 只有「粉丝 / 获赞 / 作品数」这三个字段之一，且必须真的是账号画像，才算候选 */
  const fans = firstNum(o.follower_count, o.followers_count, o.fans_count, o.fans, o.followers, o.fansCount, o.mplatform_followers_count)
  const digg = firstNum(o.total_favorited, o.faved_count, o.like_count, o.liked_count, o.digg_count, o.likes)
  const works = firstNum(o.aweme_count, o.item_count, o.works_count, o.note_count, o.notes_count)
  const avatar = firstUrl(o.avatar_larger) || firstUrl(o.avatar_medium) || firstUrl(o.avatar_thumb) || String(o.avatar_url || o.avatar || '')
  const uid = String(o.uid || o.sec_uid || o.user_id || o.red_num || '')
  const sig = String(o.signature || o.personal_desc || o.desc || '').slice(0, 160)
  if (!fans && !digg && !works) return null
  /* 有粉丝数就已经是强证据；没有粉丝数时，至少要头像 / id / 简介之一，避免把列表标题当账号 */
  if (!fans && !avatar && !uid && !sig) return null
  /* 有粉丝是最强信号；其次是头像、简介、id；作品数只作微调，避免「所有笔记 274」这种列表条拿高分 */
  const score = (fans > 0 ? 1000 : 0) + (avatar ? 100 : 0) + (sig ? 40 : 0) + (uid ? 30 : 0) + (digg > 0 ? 10 : 0) + Math.min(works, 9)
  return { nickname: name, avatar, signature: sig, fans, digg, works, uid, score }
}

function walk(node, visit, depth = 0) {
  if (depth > 9 || !node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const v of node) walk(v, visit, depth + 1)
    return
  }
  visit(node)
  for (const k of Object.keys(node)) {
    const v = node[k]
    if (v && typeof v === 'object') walk(v, visit, depth + 1)
  }
}


/* -------------------- 数据中心总览 / 粉丝画像 -------------------- */

/* 后台「数据总览」那一排指标：键名 → 中文（只认这些，避免把作品字段当总览） */
const SIGNAL = {
  play_count: 'play',
  view_count: 'play',
  vv: 'play',
  show_count: 'show',
  cover_show: 'show',
  like_count: 'digg',
  digg_count: 'digg',
  comment_count: 'comment',
  share_count: 'share',
  collect_count: 'collect',
  favorite_count: 'collect',
  fans_count: 'fans',
  follower_count: 'fans',
  total_fans: 'fans',
  new_fans: 'newFans',
  net_fans: 'netFans',
  unfollow_count: 'lostFans',
  cancel_fans: 'lostFans',
  replay_fans: 'backFans',
  completion_rate_5s: 'completion5s',
  completion_rate: 'completion',
  bounce_rate_2s: 'bounce2s',
  bounce_rate: 'bounce2s',
  cover_click_rate: 'coverCtr',
  avg_view_second: 'avgView',
  avg_play_duration: 'avgView',
  play_rate: 'playRate',
  like_rate: 'likeRate',
  favorite_rate: 'collectRate',
  share_rate: 'shareRate',
  comment_rate: 'commentRate',
  subscribe_count: 'subscribe',
  homepage_visit_count: 'homeVisit',
  image_avg_view_count: 'imgView',
}

function pickOverview(o) {
  let hit = 0
  for (const k in SIGNAL) {
    if (o[k] != null && !isNaN(Number(o[k]))) hit++
  }
  if (hit < 3) return null
  const out = {}
  for (const k in SIGNAL) {
    const v = o[k]
    if (v == null || v === '' || isNaN(Number(v))) continue
    const key = SIGNAL[k]
    const n = Number(v)
    if (!(key in out) || n > out[key]) out[key] = n
  }
  return Object.keys(out).length >= 3 ? out : null
}

const PORTRAIT_KEYS = ['gender', 'age', 'age_range', 'device', 'os', 'province', 'city', 'region', 'interest', 'interests']

function bucketName(x) {
  if (!x || typeof x !== 'object') return ''
  return String(x.name || x.key || x.label || x.title || x.item || x.tag || x.name_cn || '')
}

function bucketValue(x) {
  if (x == null) return 0
  if (typeof x === 'number') return x
  if (typeof x === 'string' && !isNaN(Number(x))) return Number(x)
  if (typeof x === 'object') {
    const v = x.value != null ? x.value : x.rate != null ? x.rate : x.ratio != null ? x.ratio : x.count != null ? x.count : x.percent
    if (v != null && !isNaN(Number(v))) return Number(v)
  }
  return 0
}

function pickPortrait(o) {
  const out = {}
  for (const key of PORTRAIT_KEYS) {
    const v = o[key]
    if (!v) continue
    let list = []
    if (Array.isArray(v)) {
      list = v.map(function (x) { return { name: bucketName(x), value: bucketValue(x) } }).filter(function (x) { return x.name && x.value })
    } else if (typeof v === 'object') {
      list = Object.keys(v)
        .map(function (k) { return { name: k, value: bucketValue(v[k]) } })
        .filter(function (x) { return x.value })
    }
    if (list.length >= 2) out[key === 'interests' ? 'interest' : key] = list.slice(0, 8)
  }
  return Object.keys(out).length ? out : null
}

/** 主入口：snapshot = { kind, platform, host, url, items: [...] } */
export function summarizeAccount(snapshot) {
  const snap = snapshot || {}
  const items = Array.isArray(snap.items) ? snap.items : []
  const works = new Map()
  const acts = new Map()
  let account = null
  const prof = snap.profile || null
  if (prof && (prof.nickname || prof.avatar)) {
    account = {
      nickname: String(prof.nickname || '').slice(0, 40),
      avatar: String(prof.avatar || ''),
      signature: '',
      fans: 0,
      digg: 0,
      works: 0,
      uid: String(prof.uid || ''),
      score: 900,
    }
  }
  const sources = []
  let metrics = null
  const portrait = {}

  for (const it of items) {
    const json = it && it.json
    if (!json) continue
    const before = works.size
    const u = String((it && it.url) || '')
    const tag = /(aweme\/post|item\/list|item_list|work_list|content_list|note\/list|note_list|note\/info|user\/posted|\/posted|datacenter|analyze|user\/notes|note\/user)/.test(u)
      ? 'mine'
      : /(inspiration|activity|hot|recommend|billboard|challenge|topic)/.test(u)
        ? 'feed'
        : ''
    walk(json, (o) => {
      const w = pickWork(o)
      if (w) {
        const old = works.get(w.id)
        if (!old) {
          w.src = tag
          works.set(w.id, w)
        } else {
          /* 同一个作品出现在多个接口里：指标取大的，标题/封面/时间补空 */
          for (const k of ['play', 'digg', 'collect', 'comment', 'share', 'createTime', 'duration']) {
            if ((w[k] || 0) > (old[k] || 0)) old[k] = w[k]
          }
          if (!old.title && w.title) old.title = w.title
          if (!old.cover && w.cover) old.cover = w.cover
          if (!old.author && w.author) old.author = w.author
          if (!old.src && w.src) old.src = w.src
        }
      }
      const dcSrc = /(data|statistic|overview|analysis|fans|trend|dashboard|portrait)/i.test(u)
      const ov = dcSrc ? pickOverview(o) : null
      if (ov) {
        if (!metrics) metrics = {}
        for (const k in ov) {
          if (!(k in metrics) || ov[k] > metrics[k]) metrics[k] = ov[k]
        }
      }
      const pt = dcSrc ? pickPortrait(o) : null
      if (pt) {
        for (const k in pt) {
          if (!portrait[k] || pt[k].length > portrait[k].length) portrait[k] = pt[k]
        }
      }
      const a = pickActivity(o)
      if (a && !acts.has(a.id)) acts.set(a.id, a)
      const acc = pickAccount(o)
      if (acc && (!account || acc.score > account.score)) account = acc
      else if (acc && account && prof && !account.fans && acc.nickname && acc.nickname === account.nickname) account.fans = acc.fans || account.fans
    })
    sources.push({
      url: String((it && it.url) || '').slice(0, 200),
      at: num(it && it.at),
      newWorks: works.size - before,
    })
  }

  const list = [...works.values()]
    .filter((w) => w.src !== 'feed')
    .sort((a, b) => (b.createTime || 0) - (a.createTime || 0))
    .slice(0, MAX_WORKS)
  const activities = [...acts.values()].sort((a, b) => (a.end || 0) - (b.end || 0)).slice(0, 60)
  /* 统计只算「我的作品」；如果一条都认不出来（老接口没有区分），才退回全部，并在 mixed 里标出来 */
  const own = list.filter((w) => w.src === 'mine')
  const base = own.length ? own : list
  const sum = (k) => base.reduce((a, w) => a + (w[k] || 0), 0)
  /* 后台首页没给作品数时，用作品列表补上 */
  if (account && !account.works && base.length) account.works = base.length
  /* 数据中心里如果有粉丝数，补到账号头上去 */
  if (account && !account.fans && metrics && metrics.fans) account.fans = metrics.fans
  if (account && !account.digg && metrics && metrics.digg) account.digg = metrics.digg

  return {
    at: num(snap.updatedAt || snap.at) || 0,
    platform: String(snap.platform || ''),
    kind: String(snap.kind || ''),
    host: String(snap.host || ''),
    url: String(snap.url || ''),
    account,
    works: list,
    activities: [],
    sources,
    metrics: metrics && Object.keys(metrics).length >= 3 ? metrics : null,
    portrait: Object.keys(portrait).length ? portrait : null,
    stats: {
      mixed: own.length === 0,
      works: base.length,
      play: sum('play'),
      digg: sum('digg'),
      collect: sum('collect'),
      comment: sum('comment'),
      share: sum('share'),
    },
  }
}
