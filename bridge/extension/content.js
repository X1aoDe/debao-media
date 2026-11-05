/**
 * 采集到我的自媒体库 · 隔离世界（content script）
 *
 * 职责：
 *   笔记页（小红书 / 抖音）→ 右下角一个「采集到自媒体库」按钮，点一下把当前这条采集到本机。
 *   创作者后台（creator.*）→ 按钮变成「同步后台到自媒体库」，把页面自己调过的接口响应原样存成本地快照。
 *
 * 不自动上报、不后台偷跑：只有你点按钮才发。只走 127.0.0.1:53210。
 */
;(function () {
  if (window.__DEBAO_CONTENT_LOADED__) return
  window.__DEBAO_CONTENT_LOADED__ = true

  const TAG = 'debao'
  const BRIDGE = 'http://127.0.0.1:53210'
  const host = location.hostname
  const isDouyin = /douyin\.com$/.test(host)
  const isCreator = /^creator\./.test(host)
  const platform = isDouyin ? 'douyin' : 'xhs'
  const platformLabel = isDouyin ? '抖音' : '小红书'

  let latest = null
  let creatorBuf = []
  let replayBuf = []
  let reqSeq = 0
  const waiters = new Map()
  let state = { online: false, count: 0 }

  /* ---------------------------- 收页面数据 ---------------------------- */

  window.addEventListener('message', function (e) {
    const d = e.data
    if (!d || d.source !== TAG) return
    if (d.kind === 'note') {
      latest = d.payload || null
      if (d.reqId && waiters.has(d.reqId)) {
        waiters.get(d.reqId)({ note: latest, items: null })
        waiters.delete(d.reqId)
      }
    }
    if (d.kind === 'creator-replay') {
      replayBuf = Array.isArray(d.payload) ? d.payload : []
      const w = waiters.get(d.reqId)
      if (w) {
        waiters.delete(d.reqId)
        w({ note: null, items: replayBuf })
      }
      return
    }
    if (d.kind === 'creator') {
      creatorBuf = Array.isArray(d.payload) ? d.payload : []
      if (d.reqId && waiters.has(d.reqId)) {
        waiters.get(d.reqId)({ note: null, items: creatorBuf })
        waiters.delete(d.reqId)
      }
    }
    if (d.kind === 'none') {
      if (d.reqId && waiters.has(d.reqId)) {
        waiters.get(d.reqId)({ note: null, items: null })
        waiters.delete(d.reqId)
      }
    }
  })

  /* 抖音/小红书的创作者后台都不给「我是谁」的接口，从页面头部刮一下昵称和头像 */
  function creatorProfile() {
    const out = { nickname: '', avatar: '' }
    try {
      const names = [
        '[data-e2e="user-name"]',
        '.user-name',
        '.account-name',
        '.creator-name',
        '.semi-navigation-header .name',
        '.header-user-name',
        '#user-name',
      ]
      for (const sel of names) {
        const el = document.querySelector(sel)
        const txt = el && (el.textContent || '').trim()
        if (txt && txt.length <= 40) {
          out.nickname = txt.replace(/\s+/g, ' ')
          break
        }
      }
      const imgs = document.querySelectorAll(
        '[data-e2e="user-avatar"] img, .header-avatar img, .user-avatar img, .semi-avatar img, .avatar img',
      )
      for (const im of imgs) {
        const s = im.currentSrc || im.src || ''
        if (/^https?:/.test(s) && s.length > 20) {
          out.avatar = s
          break
        }
      }
    } catch (e) {}
    return out
  }

  function askPage(kind, timeoutMs) {
    return new Promise(function (resolve) {
      const id = 'r' + ++reqSeq
      let done = false
      waiters.set(id, function (p) {
        done = true
        resolve(p)
      })
      window.postMessage({ source: TAG, kind: kind, reqId: id }, '*')
      setTimeout(function () {
        if (done) return
        waiters.delete(id)
        resolve({ note: null, items: null })
      }, timeoutMs || 2500)
    })
  }

  /* ------------------------------ 采集桥 ------------------------------ */

  function health() {
    return fetch(BRIDGE + '/health', { cache: 'no-store' })
      .then(function (r) {
        return r.json()
      })
      .then(function (j) {
        state.online = !!(j && j.ok)
        state.count = (j && j.count) || 0
        return state
      })
      .catch(function () {
        state.online = false
        return state
      })
  }

  function postJSON(path, body) {
    return fetch(BRIDGE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json()
    })
  }

  /* ------------------------------ DOM 兜底 ----------------------------- */

  function textOf(sel) {
    const el = document.querySelector(sel)
    return el ? String(el.textContent || '').trim() : ''
  }

  /* 页面上的 <video> 只是其中一条线索：小红书/抖音大多用 blob: 播 HLS，
     真正能下载的是播放器请求过的 m3u8 / mp4 —— 从 Resource Timing 里捞最准。 */
  function perfVideoUrls() {
    const out = []
    try {
      const es = performance.getEntriesByType ? performance.getEntriesByType('resource') : []
      for (let i = 0; i < es.length; i++) {
        const e = es[i]
        const u = String(e.name || '')
        if (!/^https?:\/\//i.test(u)) continue
        if (!/\.m3u8(\?|$)|\.mp4(\?|$)|sns-video|xhscdn|douyinvod|bytecdn|byteimg/i.test(u)) continue
        out.push({ u: u, t: Number(e.startTime) || 0, len: Number(e.transferSize) || 0 })
      }
    } catch (e) {
      /* ignore */
    }
    out.sort(function (a, b) {
      return b.t - a.t
    })
    return out.map(function (x) {
      return x.u
    })
  }

  function bestVideoUrl() {
    try {
      const vs = Array.prototype.slice.call(document.querySelectorAll('video'))
      for (let i = 0; i < vs.length; i++) {
        const v = vs[i]
        const cand = [v.currentSrc, v.src, (v.querySelector && v.querySelector('source') && v.querySelector('source').src) || '']
        for (let j = 0; j < cand.length; j++) {
          const u = String(cand[j] || '')
          if (/^https?:\/\//i.test(u) && /(\.mp4|\.m3u8|sns-video|xhscdn|douyinvod|bytecdn)/i.test(u)) return u
        }
      }
      /* ② 播放器实际请求过的流（blob 播放时唯一可靠的来源） */
      const perf = perfVideoUrls()
      if (perf.length) return perf[0]
      /* ③ og:video 之类的 meta 兜底（部分页面只在这里给直链） */
      const metas = ['meta[property="og:video"]', 'meta[property="og:video:url"]', 'meta[property="og:video:secure_url"]', 'meta[name="og:video"]']
      for (let k = 0; k < metas.length; k++) {
        const el = document.querySelector(metas[k])
        const u = el ? String(el.getAttribute('content') || '') : ''
        if (/^https?:\/\//i.test(u)) return u
      }
      /* ④ 页面里内联的 masterUrl 兜底 */
      const html = document.documentElement ? document.documentElement.innerHTML : ''
      const m = html.match(/https?:\/\/[^"'\\\s]+\.(?:mp4|m3u8)[^"'\\\s]*/)
      if (m) return m[0].replace(/\\u002F/g, '/')
    } catch (e) {
      /* ignore */
    }
    return ''
  }

  /* 小红书有些对象只给 videoId，拼出来的 sns-video-bd.xhscdn.com/<纯数字> 是猜的，
     没有签名参数，请求必然 404 —— 只当线索，不当直链用。 */
  function isGuessUrl(u) {
    const s = String(u || '')
    if (!s) return true
    if (/sns-video-bd\.xhscdn\.com\/\d+\/?(\?|$)/i.test(s)) return true
    try {
      const x = new URL(s)
      if (/xhscdn\.com$/i.test(x.hostname) && !x.search && !/\.(mp4|m3u8)$/i.test(x.pathname)) return true
    } catch (e) {
      /* ignore */
    }
    return false
  }

  /* 下载交给后台 service worker：content script 直接 fetch 跨域视频会被 CORS 拦成
     "Failed to fetch"（页面世界的权限），service worker 有 host_permissions 才拿得到字节 */
  function swSaveVideo(id, url) {
    return new Promise(function (resolve) {
      let done = false
      const finish = function (v) {
        if (done) return
        done = true
        resolve(v || { ok: false, why: 'no response' })
      }
      try {
        chrome.runtime.sendMessage({ type: 'debao-download', id: id, url: url }, function (r) {
          if (chrome.runtime.lastError) return finish({ ok: false, why: String(chrome.runtime.lastError.message || '') })
          finish(r)
        })
      } catch (e) {
        finish({ ok: false, why: String((e && e.message) || e) })
      }
      setTimeout(function () {
        finish({ ok: false, why: '后台下载超时' })
      }, 180000)
    })
  }

  /* 兜底路线：页面世界直接下（同域/有 CORS 头时能用） */
  async function uploadVideoDirect(id, url) {
    try {
      const r = await fetch(url, { credentials: 'include', mode: 'cors' })
      if (!r.ok) return { ok: false, why: 'HTTP ' + r.status }
      const ct = String(r.headers.get('content-type') || '')
      if (/text\/html|application\/json/i.test(ct)) return { ok: false, why: '不是视频文件' }
      const len = Number(r.headers.get('content-length') || 0)
      if (len > 200 * 1048576) return { ok: false, why: '文件超过 200MB' }
      const buf = await r.arrayBuffer()
      const name = ((url.split('?')[0].split('/').pop() || 'v') + '').slice(-40)
      const up = await fetch(BRIDGE + '/api/media/upload?id=' + encodeURIComponent(id) + '&name=' + encodeURIComponent(name), {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buf,
      })
      const j = await up.json()
      return { ok: !!(j && j.ok), why: (j && j.error) || '', bytes: (j && j.bytes) || 0 }
    } catch (e) {
      return { ok: false, why: String((e && e.message) || e) }
    }
  }

  /* 先走后台，失败了再试页面直下 */
  async function uploadVideo(id, url) {
    const a = await swSaveVideo(id, url)
    if (a && a.ok) return a
    const b = await uploadVideoDirect(id, url)
    if (b && b.ok) return b
    return { ok: false, why: (a && a.why) || (b && b.why) || '未知原因' }
  }

  /* 后台（webRequest）旁观到的媒体请求：MSE/blob 播的 HLS、跨域 mp4 只有这里看得到，
     performance.getEntriesByType('resource') 对它们经常是空的 —— 这是「抓不到直链」的主因。 */
  function askSW() {
    return new Promise(function (resolve) {
      let done = false
      const finish = function (v) {
        if (done) return
        done = true
        resolve(v || [])
      }
      try {
        chrome.runtime.sendMessage({ type: 'debao-media' }, function (r) {
          if (chrome.runtime.lastError) return finish([])
          finish((r && r.items) || [])
        })
      } catch (e) {
        finish([])
      }
      setTimeout(function () {
        finish([])
      }, 900)
    })
  }

  function domFallback() {
    if (isDouyin) {
      const title = textOf('[data-e2e="video-desc"]') || textOf('h1')
      const author = textOf('[data-e2e="user-name"]') || textOf('.account-name')
      const likeEl = document.querySelector('[data-e2e="video-player-digg"] span, [data-e2e="like-count"]')
      if (!title && !author) return null
      return {
        platform: 'douyin',
        noteId: (location.pathname.match(/\/video\/(\d+)/) || [])[1] || '',
        title: title.slice(0, 60),
        desc: title,
        tags: (title.match(/#([^\s#]{1,30})/g) || []).map(function (t) {
          return t.replace(/^#/, '')
        }),
        coverUrl: '',
        images: [],
        mediaType: 'video',
        stats: { likes: likeEl ? likeEl.textContent : 0, collects: 0, comments: 0 },
        author: { name: author, id: '', avatar: '' },
        url: location.href,
        videoUrl: '',
        source: 'extension-dom',
      }
    }
    const title = textOf('#detail-title') || textOf('.note-content .title')
    const desc = textOf('#detail-desc') || textOf('.note-content .desc')
    const author = textOf('.author-wrapper .username') || textOf('.info .name')
    const likes = textOf('.like-wrapper .count')
    if (!title && !desc) return null
    return {
      platform: 'xhs',
      noteId: (location.pathname.match(/\/(?:explore|discovery\/item)\/([A-Za-z0-9]+)/) || [])[1] || '',
      title: title,
      desc: desc,
      tags: (textOf('.note-content .tag') || '').split(/\s+/).filter(Boolean),
      coverUrl: '',
      images: [],
      mediaType: 'image',
      stats: { likes: likes, collects: 0, comments: 0 },
      author: { name: author, id: '', avatar: '' },
      url: location.href,
      videoUrl: '',
      source: 'extension-dom',
    }
  }

  /* ------------------------------- UI -------------------------------- */

  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;z-index:2147483000;right:18px;bottom:96px;'
  const shadow = box.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      .wrap{font:12px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;}
      .btn{display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:999px;border:0;cursor:pointer;
        background:linear-gradient(135deg,#ff2e4d,#ff6a3d);color:#fff;font-weight:600;font-size:13px;
        box-shadow:0 6px 18px rgba(255,46,77,.35);transition:.15s;}
      .btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(255,46,77,.45);}
      .btn.off{background:#5a5f6a;box-shadow:none;}
      .btn:disabled{opacity:.7;cursor:default;transform:none;}
      .dot{width:7px;height:7px;border-radius:50%;background:#3ddc84;}
      .dot.off{background:#ffb020;}
      .cnt{font-weight:400;opacity:.85;font-size:11px;}
      .toast{position:absolute;right:0;bottom:calc(100% + 8px);white-space:nowrap;background:rgba(20,22,26,.94);
        color:#fff;padding:7px 12px;border-radius:8px;font-size:12px;opacity:0;transform:translateY(4px);
        transition:.2s;pointer-events:none;}
      .toast.on{opacity:1;transform:translateY(0);}
      .toast.err{background:rgba(190,30,40,.96);}
    </style>
    <div class="wrap">
      <div class="toast" id="t"></div>
      <button class="btn" id="b"><span class="dot off" id="d"></span><span id="l">连接中…</span><span class="cnt" id="c"></span></button>
    </div>`

  const btn = shadow.getElementById('b')
  const dot = shadow.getElementById('d')
  const labelEl = shadow.getElementById('l')
  const cntEl = shadow.getElementById('c')
  const toastEl = shadow.getElementById('t')

  let toastTimer = null
  function toast(msg, isErr) {
    toastEl.textContent = msg
    toastEl.className = 'toast on' + (isErr ? ' err' : '')
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(function () {
      toastEl.className = 'toast'
    }, 2400)
  }

  function paint() {
    if (!state.online) {
      btn.className = 'btn off'
      dot.className = 'dot off'
      labelEl.textContent = '采集桥离线'
      cntEl.textContent = ''
      return
    }
    btn.className = 'btn'
    dot.className = 'dot'
    labelEl.textContent = isCreator ? '同步后台到库' : '采集到自媒体库'
    cntEl.textContent = state.count ? state.count + ' 条' : ''
  }

  async function onClick() {
    if (!state.online) {
      const s = await health()
      paint()
      if (!s.online) {
        toast('采集桥没开：先跑 start-bridge.bat', true)
        return
      }
    }
    btn.disabled = true
    const old = labelEl.textContent
    labelEl.textContent = '采集中…'
    try {
      if (isCreator) {
        const res = await askPage('creator-request', 3000)
        let items = res.items || []
        const re = await askPage('creator-replay', 12000)
        const extra = (re && re.items) || []
        if (extra.length) {
          const seen = new Set(items.map(function (x) { return String(x.url) }))
          items = items.concat(extra.filter(function (x) { return x && x.json && !seen.has(String(x.url)) }))
        }
        if (!items.length) {
          toast('还没拿到后台接口数据：先打开「数据中心 / 粉丝数据 / 作品管理」任意一个，等图出来再点', true)
          return
        }
        await postJSON('/api/account', {
          kind: 'creator-api',
          platform: platform,
          host: host,
          url: location.href,
          at: Date.now(),
          profile: creatorProfile(),
          items: items,
        })
        toast('已同步后台数据：' + items.length + ' 个接口')
      } else {
        const res = await askPage('request', 2500)
        let note = res.note
        if (!note) note = domFallback()
        /* 页面世界只挖到直链（详情不在 state 里）时，用 DOM 里读到的标题/正文/赞藏评补齐 */
        if (note && note.partial) {
          const base = domFallback() || {}
          note = Object.assign({}, base, {
            platform: note.platform || platform,
            noteId: note.noteId || base.noteId || '',
            videoUrl: note.videoUrl || '',
            videoUrlFrom: note.videoUrlFrom || '',
            diag: note.diag || null,
            partial: undefined,
          })
        }
        /* 直链常常要等播放器起来才有：没拿到就再问一次页面世界 */
        if (note && !note.videoUrl) {
          await new Promise(function (r) { setTimeout(r, 700) })
          const again = await askPage('request', 1500)
          const n2 = again && again.note
          if (n2 && n2.videoUrl) {
            note.videoUrl = n2.videoUrl
            note.videoUrlFrom = n2.videoUrlFrom || ''
          }
          if (n2 && n2.coverUrl && !note.coverUrl) note.coverUrl = n2.coverUrl
          if (n2 && n2.diag) note.diag = n2.diag
        }
        if (!note) {
          toast('没识别到这条内容：往下滑一下让数据加载完再点', true)
          return
        }
        note.platform = note.platform || platform
        note.videoUrl = note.videoUrl || bestVideoUrl()
        if (isGuessUrl(note.videoUrl)) note.videoUrl = ''
        /* 最后一道：问后台，看这个标签页真的请求过哪些媒体 */
        const seen = await askSW()
        const swList = seen
          .map(function (x) {
            return String((x && x.url) || '')
          })
          .filter(function (u) {
            return u && !isGuessUrl(u)
          })
        const swMp4 = swList.filter(function (u) {
          return /\.mp4(\?|$)/i.test(u)
        })
        const swHls = swList.filter(function (u) {
          return /\.m3u8(\?|$)/i.test(u)
        })
        const curMp4 = /\.mp4(\?|$)/i.test(note.videoUrl) ? note.videoUrl : ''
        const curHls = /\.m3u8(\?|$)/i.test(note.videoUrl) ? note.videoUrl : ''
        if (!curMp4 && swMp4.length) {
          note.videoUrl = swMp4[0]
          note.videoUrlFrom = 'webrequest'
        } else if (!curMp4 && !curHls && swHls.length) {
          note.videoUrl = swHls[0]
          note.videoUrlFrom = 'webrequest-hls'
        }
        if (swMp4.length > 1) note.videoUrlAlt = swMp4.slice(1, 4)
        note.videoUrlFrom = note.videoUrl ? (note.videoUrlFrom || 'extension') : ''
        /* 拿不到直链时把「诊断包」一起送进库，插件里能看到到底哪一层断了 */
        note._diag = Object.assign({}, note.diag || {}, {
          sw: swList.slice(0, 8),
          perf: perfVideoUrls().slice(0, 8),
          pageCandidates: [bestVideoUrl()].filter(Boolean),
          og: (function () {
            const m = document.querySelector('meta[property="og:video"]') || document.querySelector('meta[name="og:video"]')
            return m ? String(m.content || '').slice(0, 200) : ''
          })(),
          at: Date.now(),
        })
        console.log('[德饱] 直链诊断', {
          来源: note.videoUrlFrom || '（没拿到）',
          地址: note.videoUrl || '',
          后台旁观: swList,
          页面候选: bestVideoUrl(),
        })
        const r = await postJSON('/api/capture', note)
        if (r && r.ok) {
          const isVideo = note.mediaType === 'video' || /video/i.test(String(note.type || ''))
          const id = r.ids && r.ids[0] ? r.ids[0] : ''
          if (isVideo && note.videoUrl && !/\.m3u8(\?|$)/i.test(note.videoUrl) && id) {
            /* 直链会过期，趁热把视频直接搬进本机（失败也不影响这次采集） */
            labelEl.textContent = '存视频…'
            const up = await uploadVideo(id, note.videoUrl)
            if (up && up.ok) {
              toast('已入库并存在本机（' + Math.round((up.bytes || 0) / 1048576 * 10) / 10 + 'MB）：' + (note.title || '').slice(0, 14))
            } else {
              toast('已入库：' + (note.title || '').slice(0, 16) + '（视频没搬下来：' + ((up && up.why) || '原因未知') + '）', true)
            }
          } else if (isVideo && !note.videoUrl) {
            toast('已采集，但没拿到视频直链：按一下播放、等 2 秒再点我一次', true)
          } else if (isVideo) {
            toast('已入库（HLS 流，解析时现取）：' + (note.title || '').slice(0, 16))
          } else {
            toast('已入库：' + (note.title || '').slice(0, 18))
          }
        } else toast((r && r.error) || '采集失败', true)
      }
    } catch (e) {
      toast('连不上采集桥：' + ((e && e.message) || e), true)
    } finally {
      btn.disabled = false
      labelEl.textContent = old
      health().then(paint)
    }
  }

  btn.addEventListener('click', onClick)

  function mount() {
    if (!document.documentElement.contains(box)) document.documentElement.appendChild(box)
  }

  mount()
  health().then(paint)
  setInterval(function () {
    health().then(paint)
  }, 20000)
})()
