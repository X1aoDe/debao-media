/**
 * 德饱采集器 · 页面世界（MAIN world）
 *
 * 小红书：Vue 应用，笔记数据挂在 window.__INITIAL_STATE__.note.noteDetailMap
 * 抖音：React/SSR 应用，数据挂在 window._ROUTER_DATA / RENDER_DATA / __INITIAL_STATE__
 * 创作者后台（creator.*）：没有稳定的全局对象，改成拦 fetch / XHR 的接口响应，
 *   把后台自己的数据原样收下来存快照（不伪造、不改写，只搬本地）。
 *
 * 这里只做「读 + 转发给隔离世界的 content.js」，不发任何网络请求。
 */
;(function () {
  'use strict'
  if (window.__debaoInjected) return
  window.__debaoInjected = true

  const TAG = 'debao'
  const host = location.hostname
  const isDouyin = /douyin\.com$/.test(host)
  const isCreator = /^creator\./.test(host)
  const platform = isDouyin ? 'douyin' : 'xhs'
  let lastSent = 0
  let lastUrl = location.href

  /* ----------------------------- 工具 ----------------------------- */

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

  function firstUrl(v) {
    if (!v) return ''
    if (typeof v === 'string') return v
    if (Array.isArray(v)) return String(v[0] || '')
    if (v.url_list && v.url_list.length) return String(v.url_list[0] || '')
    if (v.urlList && v.urlList.length) return String(v.urlList[0] || '')
    if (v.url) return String(v.url)
    return ''
  }

  function idFromPath() {
    const m = location.pathname.match(/\/(?:explore|discovery\/item|video|note)\/([A-Za-z0-9]+)/)
    return m ? m[1] : location.pathname.replace(/\/$/, '').split('/').pop().split('?')[0]
  }

  /* --------------------- 笔记接口里捞视频流地址 ---------------------
     __INITIAL_STATE__ 只有首屏 SSR 才带笔记详情；SPA 里点进笔记是 XHR 拉的，
     详情只在接口响应里，所以顺手记下最近一次的流地址。 */
  let netVideo = ''
  let netAt = 0

  function netVideoUrl() {
    if (!netVideo) return ''
    if (Date.now() - netAt > 10 * 60 * 1000) return ''
    return netVideo
  }

  function sniffBody(text) {
    try {
      if (!text || text.length > 4 * 1024 * 1024) return
      if (!/masterUrl|master_url|play_addr|playAddr/i.test(text)) return
      const m =
        text.match(/"masterUrl"\s*:\s*"([^"]+)"/) ||
        text.match(/"master_url"\s*:\s*"([^"]+)"/) ||
        text.match(/"url_list"\s*:\s*\[\s*"([^"]+\.(?:mp4|m3u8)[^"]*)"/) ||
        text.match(/"(https?:\\?\/\\?\/[^"]+?\.(?:mp4|m3u8)[^"]*)"/)
      if (!m) return
      const u = String(m[1]).replace(/\\u002F/g, '/').replace(/\\\//g, '/')
      if (!/^https?:\/\//i.test(u)) return
      netVideo = u
      netAt = Date.now()
    } catch (e) {
      /* ignore */
    }
  }

  function installNoteHooks() {
    if (window.__debaoNoteHooks) return
    window.__debaoNoteHooks = true
    try {
      const of = window.fetch
      window.fetch = function () {
        const p = of.apply(this, arguments)
        try {
          p.then(function (res) {
            try {
              const u = String((res && res.url) || '')
              if (!/sns\/web|note|feed|aweme|item/i.test(u)) return
              res
                .clone()
                .text()
                .then(function (t) {
                  sniffBody(t)
                })
                .catch(function () {})
            } catch (e) {
              /* ignore */
            }
          }).catch(function () {})
        } catch (e) {
          /* ignore */
        }
        return p
      }
    } catch (e) {
      /* ignore */
    }
    try {
      const oo = XMLHttpRequest.prototype.open
      const os = XMLHttpRequest.prototype.send
      XMLHttpRequest.prototype.open = function (m, u) {
        try {
          this.__debaoUrl = u
        } catch (e) {
          /* ignore */
        }
        return oo.apply(this, arguments)
      }
      XMLHttpRequest.prototype.send = function () {
        const xhr = this
        try {
          xhr.addEventListener('load', function () {
            try {
              const rt = xhr.responseType
              if (rt && rt !== 'text' && rt !== 'json') return
              const t = rt === 'json' ? JSON.stringify(xhr.response) : String(xhr.responseText || '')
              sniffBody(t)
            } catch (e) {
              /* ignore */
            }
          })
        } catch (e) {
          /* ignore */
        }
        return os.apply(this, arguments)
      }
    } catch (e) {
      /* ignore */
    }
  }

  /* ---------------- 视频直链的三条补路（Fiber / 页面脚本 / 深搜） ----------------
     小红书的笔记数据经常只活在 React 组件的 props 里：
     __INITIAL_STATE__ 是首屏 SSR 的快照，SPA 打开笔记后详情是 XHR 拉的，
     既不进 state 也看不到响应体（MSE 播放时片段由浏览器网络栈发）。
     所以除了网络旁观，还要能从 DOM 元素上挂的 React Fiber 里把 note.video 抠出来。 */

  function fiberOf(el) {
    if (!el || typeof el !== 'object') return null
    const ks = Object.keys(el)
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i]
      if (k.indexOf('__reactFiber$') === 0 || k.indexOf('__reactInternalInstance$') === 0) {
        return el[k]
      }
    }
    return null
  }

  function isHttp(u) {
    return typeof u === 'string' && /^https?:\/\//.test(u)
  }

  // sns-video-bd.xhscdn.com/<纯数字> 这种是「拼出来的」假地址（无签名，必然 404）
  function isGuessUrl(u) {
    if (!isHttp(u)) return true
    if (/sns-video-bd\.xhscdn\.com\/\d+\/?(\?|$)/.test(u)) return true
    if (/xhscdn\.com\/\d+\/?(\?|$)/.test(u)) return true
    return false
  }

  function streamUrlOf(video) {
    if (!video || typeof video !== 'object') return ''
    const st = video.media && video.media.stream
    if (st) {
      const lists = [st.h264, st.h265, st.hevc, st.av1]
      for (let i = 0; i < lists.length; i++) {
        const arr = lists[i]
        if (!arr) continue
        for (let j = 0; j < arr.length; j++) {
          const c = arr[j]
          if (!c) continue
          if (isHttp(c.masterUrl)) return c.masterUrl
          if (isHttp(c.master_url)) return c.master_url
          if (c.backupUrls && isHttp(c.backupUrls[0])) return c.backupUrls[0]
          if (isHttp(c.url)) return c.url
        }
      }
    }
    if (isHttp(video.masterUrl)) return video.masterUrl
    if (isHttp(video.url)) return video.url
    return ''
  }

  // 在任意对象里往下找「带 video 的笔记」，最多 depth 层（避免扫到 DOM 节点）
  function deepFindVideo(root, targetId, depth) {
    if (!root || typeof root !== 'object' || depth <= 0) return ''
    if (root.nodeType || root === window || root === document) return ''
    if (root.video || (root.media && root.media.stream)) {
      const id = root.noteId || root.note_id || root.id || ''
      if (!targetId || !id || String(id) === String(targetId)) {
        const u = streamUrlOf(root.video) || streamUrlOf(root)
        if (u) return u
      }
    }
    const ks = Object.keys(root)
    for (let i = 0; i < ks.length && i < 40; i++) {
      const k = ks[i]
      if (k === 'return' || k === 'child' || k === 'sibling' || k === 'stateNode') continue
      const v = root[k]
      if (v && typeof v === 'object') {
        const u = deepFindVideo(v, targetId, depth - 1)
        if (u) return u
      }
    }
    return ''
  }

  // 小红书前端是 Vue：组件实例挂在 DOM 元素的 __vnode / __vueParentComponent / __vue__ 上
  function compBags(obj) {
    const out = []
    if (!obj || typeof obj !== 'object') return out
    const keys = ['props', 'setupState', 'data', 'ctx', 'proxy', '$props', '$data', '$setup']
    for (let i = 0; i < keys.length; i++) {
      try {
        const v = obj[keys[i]]
        if (v && typeof v === 'object') out.push(v)
      } catch (e) {}
    }
    return out
  }

  function vueVideo(targetId) {
    const sels = ['video', '#noteContainer', '.note-container', '.note-detail-mask', '.note-scroller']
    for (let i = 0; i < sels.length; i++) {
      let el = null
      try {
        el = document.querySelector(sels[i])
      } catch (e) {
        el = null
      }
      if (!el) continue
      /* Vue 3：__vnode.parent 往上找，顺手把 component 的 props/setupState/data 都翻一遍 */
      let node = el.__vnode || null
      let steps = 0
      while (node && steps < 60) {
        const bags = []
        try {
          if (node.props) bags.push(node.props)
        } catch (e) {}
        let comp = node.component || null
        let cs = 0
        while (comp && cs < 6) {
          const b = compBags(comp)
          for (let k = 0; k < b.length; k++) bags.push(b[k])
          comp = comp.parent || null
          cs++
        }
        for (let k = 0; k < bags.length; k++) {
          const u = deepFindVideo(bags[k], targetId, 4)
          if (u) return u
        }
        node = node.parent || null
        steps++
      }
      /* Vue 2：__vue__ + $parent */
      let vm = el.__vue__ || null
      let vs = 0
      while (vm && vs < 20) {
        const u =
          deepFindVideo(vm.$props, targetId, 4) ||
          deepFindVideo(vm.$data, targetId, 4) ||
          deepFindVideo(vm.note, targetId, 4)
        if (u) return u
        vm = vm.$parent || null
        vs++
      }
    }
    return ''
  }

  // 顺着 React Fiber 往上走，读 memoizedProps 里的 note
  function fiberVideo(targetId) {    const sels = ['video', '#noteContainer', '.note-container', '.note-detail-mask', '.note-scroller', '#noteContainer video']
    for (let i = 0; i < sels.length; i++) {
      let cur = fiberOf(document.querySelector(sels[i]))
      let steps = 0
      while (cur && steps < 60) {
        let u = ''
        try {
          u = deepFindVideo(cur.memoizedProps, targetId, 4)
        } catch (e) {
          u = ''
        }
        if (u) return u
        cur = cur.return
        steps++
      }
    }
    return ''
  }

  // 页面里内联的 __INITIAL_STATE__ 脚本（有的版本不挂到 window）
  let scriptCache = { at: 0, url: '' }

  function scriptVideo(targetId) {
    if (Date.now() - scriptCache.at < 15000) return scriptCache.url
    let url = ''
    try {
      const scripts = document.querySelectorAll('script')
      for (let i = 0; i < scripts.length && !url; i++) {
        const t = scripts[i] && scripts[i].textContent
        if (!t || t.indexOf('__INITIAL_STATE__') < 0) continue
        const cut = t.indexOf('__INITIAL_STATE__')
        const body = t.slice(cut).replace(/^[^=]*=/, '').replace(/;\s*$/, '')
        let st = null
        try {
          st = JSON.parse(body)
        } catch (e) {
          st = null
        }
        if (st) url = deepFindVideo(st, targetId, 8)
        if (!url) {
          const m = body.match(/"masterUrl"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/)
          if (m) url = m[1].replace(/\\\//g, '/')
        }
      }
    } catch (e) {
      url = ''
    }
    scriptCache = { at: Date.now(), url: url }
    return url
  }

  /* ----------------------------- 小红书 ---------------------------- */

  function pickXhsNote(state) {
    const map = state && state.note && state.note.noteDetailMap
    if (!map) return null
    const id = idFromPath()
    if (map[id]) return map[id]
    const keys = Object.keys(map)
    if (!keys.length) return null
    if (keys.length === 1) return map[keys[0]]
    const hit = keys.find(function (k) {
      const n = map[k] && (map[k].note || map[k])
      return n && n.noteId === id
    })
    return hit ? map[hit] : null
  }

  function fromXhs() {
    const detail = pickXhsNote(window.__INITIAL_STATE__)
    if (!detail) return null
    const note = detail.note || detail
    const interact = detail.interactInfo || note.interactInfo || note.stats || {}
    const user = note.user || {}
    const images = note.imageList || []
    const mediaUrls = images
      .map(function (img) {
        return img.urlDefault || img.url || img.url_default || (img.infoList && img.infoList[0] && img.infoList[0].url)
      })
      .filter(Boolean)
    const tags = (note.tagList || [])
      .map(function (t) {
        return typeof t === 'string' ? t : t && (t.name || t.tagName)
      })
      .filter(Boolean)
    // 直链按「可信度」依次试：state 里的流 → state 深搜 → React Fiber → 网络旁观 → 内联脚本 → DOM
    const nid = note.noteId || idFromPath()
    const tries = [
      ['state-stream', function () { return streamUrlOf(note.video) }],
      ['state-deep', function () { return deepFindVideo(detail, nid, 6) }],
      ['vue', function () { return vueVideo(nid) }],
      ['fiber', function () { return fiberVideo(nid) }],
      ['network', function () { return netVideoUrl() }],
      ['script', function () { return scriptVideo(nid) }],
      ['dom', function () {
        const og = document.querySelector('meta[property="og:video"]') || document.querySelector('meta[name="og:video"]')
        if (og && isHttp(og.content)) return og.content
        const v = document.querySelector('video')
        const u = v && (v.currentSrc || v.src)
        return isHttp(u) ? u : ''
      }],
    ]
    let video = ''
    let videoFrom = ''
    for (let i = 0; i < tries.length && !video; i++) {
      let got = ''
      try {
        got = tries[i][1]()
      } catch (e) {
        got = ''
      }
      if (!got || isGuessUrl(got)) continue
      video = got
      videoFrom = tries[i][0]
    }
    return {
      platform: 'xhs',
      noteId: note.noteId || idFromPath(),
      title: note.title || (note.desc || '').slice(0, 50).replace(/\n/g, ' ') || '',
      desc: note.desc || '',
      tags: tags,
      coverUrl: mediaUrls[0] || (note.video && note.video.cover && note.video.cover.url) || '',
      images: mediaUrls,
      mediaType: note.type === 'video' || (note.video && !images.length) ? 'video' : 'image',
      stats: {
        likes: num(interact.likedCount != null ? interact.likedCount : interact.liked),
        collects: num(interact.collectedCount != null ? interact.collectedCount : interact.collected),
        comments: num(interact.commentCount != null ? interact.commentCount : interact.comment),
        shares: num(interact.sharedCount != null ? interact.sharedCount : interact.shareCount),
      },
      author: {
        name: user.nickname || user.nickName || '',
        id: user.userid || user.userId || '',
        avatar: user.avatar || user.image || '',
      },
      publishTime: note.time || '',
      url: location.href.split('&xsec_source')[0],
      videoUrl: video,
      videoUrlFrom: videoFrom,
      source: 'extension',
    }
  }

  // 笔记详情不在 state 里时（SSR 只给空 noteDetailMap，详情是 XHR 拉的），
  // 至少把「视频直链」这条线索挖出来，交给 content.js 和 DOM 里拿到的标题合并。
  function fromXhsVideoOnly() {
    if (isCreator) return null
    const nid = idFromPath()
    const tries = [
      ['vue', function () { return vueVideo(nid) }],
      ['fiber', function () { return fiberVideo(nid) }],
      ['network', function () { return netVideoUrl() }],
      ['script', function () { return scriptVideo(nid) }],
      ['dom', function () {
        const og = document.querySelector('meta[property="og:video"]') || document.querySelector('meta[name="og:video"]')
        if (og && isHttp(og.content)) return og.content
        const v = document.querySelector('video')
        const u = v && (v.currentSrc || v.src)
        return isHttp(u) && u.indexOf('blob:') !== 0 ? u : ''
      }],
    ]
    let diag = { targetId: nid, vue: false, fiber: false, script: false }
    try {
      const v = document.querySelector('video')
      diag.vue = !!(v && (v.__vnode || v.__vue__))
      diag.fiber = !!fiberOf(v)
      diag.script = document.querySelectorAll('script').length > 0
    } catch (e) {}
    for (let i = 0; i < tries.length; i++) {
      let got = ''
      try {
        got = tries[i][1]()
      } catch (e) {
        got = ''
      }
      if (!got || isGuessUrl(got)) continue
      return { platform: 'xhs', noteId: nid, videoUrl: got, videoUrlFrom: tries[i][0], partial: true, diag: diag, url: location.href.split('&xsec_source')[0] }
    }
    return { platform: 'xhs', noteId: nid, videoUrl: '', videoUrlFrom: '', partial: true, diag: diag, url: location.href.split('&xsec_source')[0] }
  }

  /* ------------------------------ 抖音 ----------------------------- */

  // 深度找「像一条作品」的对象：有 aweme_id（或驼峰），且带 desc / statistics
  function findAweme(root, depth) {
    const d = depth || 0
    if (!root || typeof root !== 'object' || d > 9) return null
    const id = root.aweme_id || root.awemeId
    if (id && (root.desc != null || root.statistics || root.stats)) return root
    if (root.aweme_detail && (root.aweme_detail.aweme_id || root.aweme_detail.awemeId)) return root.aweme_detail
    if (Array.isArray(root)) {
      for (const x of root) {
        const hit = findAweme(x, d + 1)
        if (hit) return hit
      }
      return null
    }
    for (const k of Object.keys(root)) {
      const v = root[k]
      if (v && typeof v === 'object') {
        const hit = findAweme(v, d + 1)
        if (hit) return hit
      }
    }
    return null
  }

  function renderDataJSON() {
    try {
      const el = document.querySelector('script#RENDER_DATA')
      if (!el) return null
      return JSON.parse(decodeURIComponent(el.textContent || ''))
    } catch (e) {
      return null
    }
  }

  function fromDouyin() {
    /* 抖音的数据源换过好几轮，谁在就用谁：SSR 的 _ROUTER_DATA、编辑器用的
       _SSR_HYDRATED_DATA、通用再水合包、旧版 __INITIAL_STATE__、以及 RENDER_DATA 脚本 */
    const roots = [
      window._ROUTER_DATA,
      window._SSR_HYDRATED_DATA,
      window.__UNIVERSAL_DATA_FOR_REHYDRATION__,
      window.__INITIAL_STATE__,
      renderDataJSON(),
    ]
    let aweme = null
    for (const r of roots) {
      aweme = findAweme(r, 0)
      if (aweme) break
    }
    if (!aweme) return null
    const s = aweme.statistics || aweme.stats || {}
    const author = aweme.author || {}
    const video = aweme.video || {}
    const images = (aweme.images || [])
      .map(function (img) {
        return firstUrl(img)
      })
      .filter(Boolean)
    const tags = (aweme.text_extra || [])
      .map(function (t) {
        return t && (t.hashtag_name || t.hashtagName)
      })
      .filter(Boolean)
    const desc = String(aweme.desc || '')
    if (!tags.length) {
      const found = desc.match(/#([^\s#]{1,30})/g) || []
      found.forEach(function (t) {
        tags.push(t.replace(/^#/, ''))
      })
    }
    const videoUrl =
      firstUrl(video.play_addr) ||
      firstUrl(video.playAddr) ||
      firstUrl(video.bit_rate && video.bit_rate[0] && video.bit_rate[0].play_addr) ||
      firstUrl(video.download_addr)
    return {
      platform: 'douyin',
      noteId: String(aweme.aweme_id || aweme.awemeId || idFromPath()),
      title: desc.replace(/\n/g, ' ').slice(0, 60) || '',
      desc: desc,
      tags: Array.from(new Set(tags)).slice(0, 30),
      coverUrl: firstUrl(video.cover) || firstUrl(video.dynamic_cover) || images[0] || '',
      images: images,
      mediaType: images.length && !videoUrl ? 'image' : 'video',
      durationSec: video.duration ? Math.round(video.duration / 1000) : num(aweme.duration),
      musicTitle: (aweme.music && (aweme.music.title || aweme.music.music_name)) || '',
      stats: {
        likes: num(s.digg_count != null ? s.digg_count : s.diggCount),
        collects: num(s.collect_count != null ? s.collect_count : s.collectCount),
        comments: num(s.comment_count != null ? s.comment_count : s.commentCount),
        shares: num(s.share_count != null ? s.share_count : s.shareCount),
      },
      author: {
        name: author.nickname || author.unique_id || '',
        id: author.sec_uid || author.uid || '',
        avatar: firstUrl(author.avatar_thumb) || firstUrl(author.avatar_medium) || '',
      },
      publishTime: String(aweme.create_time || ''),
      url: location.href.split('&previous_page')[0],
      videoUrl: videoUrl,
      source: 'extension',
    }
  }

  /* --------------------------- 创作者后台 -------------------------- */

  // 只收「看起来是后台自己的数据接口」的 JSON，其他一概不碰
  const CREATOR_API = /(api|webapi)\/.*(note|notes|data|overview|statistic|fans|work|aweme|item|comment|dashboard|trend|analysis|creator)/i
  const creatorBuf = []
  const bufSeen = new Set()
  /* 记录请求（method/url/body），点同步时原样重放一遍，把数据中心 / 粉丝画像的接口也补齐 */
  const creatorReqBuf = []
  const reqSeen = new Set()
  const REPLAY_OK = /\/(data|statistic|fans|overview|analysis|trend|item\/list|comment\/list|user\/info|fans\/|data\/)/i
  const REPLAY_BAD = /(delete|publish|create|update|save|submit|upload|logout|login|draft|school|activity|inspiration|aihub|security)/i

  function noteCreatorReq(url, method, body) {
    try {
      const s = String(url || '')
      if (!isCreatorApi(s)) return
      if (REPLAY_BAD.test(s)) return
      if (!REPLAY_OK.test(s)) return
      const m = String(method || 'GET').toUpperCase()
      let b = ''
      if (body && typeof body === 'string') b = body.slice(0, 4000)
      const key = m + ' ' + s + ' ' + b.length
      if (reqSeen.has(key)) return
      reqSeen.add(key)
      creatorReqBuf.unshift({ url: s, method: m, body: b, at: Date.now() })
      if (creatorReqBuf.length > 24) creatorReqBuf.length = 24
    } catch (e) {}
  }

  async function replayCreator() {
    const list = creatorReqBuf.slice(0, 12)
    const out = []
    for (const r of list) {
      try {
        const abs = new URL(r.url, location.origin).href
        const init = { method: r.method, credentials: 'include', headers: { 'content-type': 'application/json' } }
        if (r.method !== 'GET' && r.body) init.body = r.body
        const res = await fetch(abs, init)
        const ct = res.headers.get('content-type') || ''
        if (!/json/i.test(ct)) continue
        const j = await res.json()
        out.push({ url: r.url, at: Date.now(), json: j, replay: true })
      } catch (e) {}
    }
    return out
  }

  function pushCreator(url, json) {
    if (!json || typeof json !== 'object') return
    const key = String(url) + '#' + JSON.stringify(json).length
    if (bufSeen.has(key)) return
    bufSeen.add(key)
    creatorBuf.unshift({ url: String(url), at: Date.now(), json: json })
    if (creatorBuf.length > 40) creatorBuf.length = 40
  }

  function isCreatorApi(url) {
    try {
      const s = String(url || '')
      if (!s) return false
      if (!/^https?:/.test(s) && !s.startsWith('/')) return false
      return CREATOR_API.test(s)
    } catch (e) {
      return false
    }
  }

  function installCreatorHooks() {
    if (!isCreator) return

    const origFetch = window.fetch
    if (typeof origFetch === 'function') {
      window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || ''
        try {
          noteCreatorReq(url, (init && init.method) || (input && input.method) || 'GET', init && init.body)
        } catch (e) {}
        const res = await origFetch.apply(this, arguments)
        try {
          if (isCreatorApi(url) && /json/i.test(res.headers.get('content-type') || '')) {
            const clone = res.clone()
            clone.json().then(function (j) {
              pushCreator(url, j)
            }, function () {})
          }
        } catch (e) {
          /* ignore */
        }
        return res
      }
    }

    const XHR = window.XMLHttpRequest
    if (XHR && XHR.prototype) {
      const origOpen = XHR.prototype.open
      const origSend = XHR.prototype.send
      XHR.prototype.open = function (method, url) {
        this.__debaoUrl = url
        this.__debaoMethod = method
        return origOpen.apply(this, arguments)
      }
      XHR.prototype.send = function (body) {
        const self = this
        try {
          noteCreatorReq(self.__debaoUrl, self.__debaoMethod || 'GET', body)
        } catch (e) {}
        try {
          self.addEventListener('load', function () {
            try {
              if (!isCreatorApi(self.__debaoUrl)) return
              const ct = self.getResponseHeader('content-type') || ''
              if (!/json/i.test(ct)) return
              const j = JSON.parse(self.responseText)
              pushCreator(self.__debaoUrl, j)
            } catch (e) {
              /* ignore */
            }
          })
        } catch (e) {
          /* ignore */
        }
        return origSend.apply(this, arguments)
      }
    }
  }

  function creatorPayload() {
    return creatorBuf.slice(0, 20).map(function (x) {
      return { url: x.url, at: x.at, json: x.json }
    })
  }

  /* ----------------------------- 协议 ----------------------------- */

  function extract() {
    try {
      if (platform === 'douyin') return fromDouyin()
      const rich = fromXhs()
      if (rich) return rich
      return fromXhsVideoOnly()
    } catch (e) {
      return null
    }
  }

  function post(kind, payload, reqId) {
    window.postMessage({ source: TAG, kind: kind, reqId: reqId || null, payload: payload || null }, '*')
  }

  function sendNote(reqId) {
    const note = extract()
    if (!note) {
      if (reqId) post('none', null, reqId)
      return
    }
    lastSent = Date.now()
    post('note', note, reqId)
  }

  window.addEventListener('message', function (e) {
    const d = e.data
    if (!d || d.source !== TAG) return
    if (d.kind === 'request') sendNote(d.reqId)
    if (d.kind === 'creator-request') post('creator', creatorPayload(), d.reqId)
    if (d.kind === 'creator-replay') {
      replayCreator()
        .then(function (extra) {
          post('creator-replay', extra || [], d.reqId)
        })
        .catch(function () {
          post('creator-replay', [], d.reqId)
        })
    }
  })

  function tick() {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      setTimeout(function () {
        sendNote(null)
      }, 600)
      setTimeout(function () {
        sendNote(null)
      }, 2200)
      return
    }
    if (isCreator) return
    if (Date.now() - lastSent > 4000) sendNote(null)
  }

  installCreatorHooks()
  installNoteHooks()
  setTimeout(function () {
    sendNote(null)
  }, 900)
  setInterval(tick, 1200)
  window.addEventListener('popstate', function () {
    setTimeout(function () {
      sendNote(null)
    }, 600)
  })
})()
