/* 采集到我的自媒体库 —— 后台服务（MV3 Service Worker）
 *
 * 两件事：
 * 1) webRequest 旁观媒体请求：MSE / blob 播的 HLS 只有这里看得见。
 * 2) 替 content script 下载视频：content script 跑在页面世界里，fetch 跨域视频
 *    会被 CORS 拦成 "Failed to fetch"；service worker 有 host_permissions，
 *    可以直接把字节取下来再交给本机采集桥（127.0.0.1:53210）。
 */
const BRIDGE = 'http://127.0.0.1:53210'

const byTab = new Map()
const TTL_MS = 10 * 60 * 1000

function looksMedia(url) {
  return /\.mp4|\.m3u8|\.flv|\.ts|\.mov|\/play|sns-video|xhscdn\.com\/stream|douyinvod|bytecdn|zjcdn/i.test(
    String(url || ''),
  )
}

chrome.webRequest.onBeforeRequest.addListener(
  function (d) {
    try {
      if (d.tabId < 0) return
      if (!looksMedia(d.url)) return
      const arr = byTab.get(d.tabId) || []
      arr.push({ url: d.url, at: Date.now(), type: d.type })
      while (arr.length > 60) arr.shift()
      byTab.set(d.tabId, arr)
    } catch (e) {
      /* ignore */
    }
  },
  {
    urls: [
      '*://*.xiaohongshu.com/*',
      '*://*.xhscdn.com/*',
      '*://*.douyin.com/*',
      '*://*.douyinvod.com/*',
      '*://*.bytecdn.com/*',
      '*://*.bytecdntp.com/*',
      '*://*.zjcdn.com/*',
    ],
    types: ['media', 'xmlhttprequest', 'other', 'object'],
  },
)

/* 标签页关掉就清掉，不占内存 */
chrome.tabs.onRemoved.addListener(function (tabId) {
  byTab.delete(tabId)
})

/* 把视频字节搬到本机：先下载，再 POST 给采集桥 */
async function saveVideo(id, url) {
  try {
    const r = await fetch(url, { credentials: 'include' })
    if (!r.ok) return { ok: false, why: 'HTTP ' + r.status }
    const ct = String(r.headers.get('content-type') || '')
    if (/text\/html|application\/json/i.test(ct)) return { ok: false, why: '不是视频文件' }
    const len = Number(r.headers.get('content-length') || 0)
    if (len > 200 * 1048576) return { ok: false, why: '文件超过 200MB' }
    const buf = await r.arrayBuffer()
    if (!buf || buf.byteLength < 20000) return { ok: false, why: '文件太小（可能被拦了）' }
    const name = String(url.split('?')[0].split('/').pop() || 'v').slice(-40)
    const up = await fetch(
      BRIDGE + '/api/media/upload?id=' + encodeURIComponent(id) + '&name=' + encodeURIComponent(name),
      { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: buf },
    )
    const j = await up.json().catch(() => null)
    return { ok: !!(j && j.ok), why: (j && j.error) || '', bytes: (j && j.bytes) || buf.byteLength }
  } catch (e) {
    return { ok: false, why: String((e && e.message) || e) }
  }
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg) return

  if (msg.type === 'debao-download') {
    /* 异步：必须先返回 true，否则 sendResponse 会被当成同步结束 */
    saveVideo(msg.id, msg.url).then(sendResponse).catch((e) => sendResponse({ ok: false, why: String(e && e.message) }))
    return true
  }

  if (msg.type !== 'debao-media') return
  const tabId = sender && sender.tab ? sender.tab.id : msg.tabId
  const now = Date.now()
  const arr = (byTab.get(tabId) || []).filter((x) => now - x.at < TTL_MS)
  /* mp4 优先（能直接下载、能存本机），m3u8 次之（交给 ffmpeg 现取） */
  const mp4 = arr.filter((x) => /\.mp4(\?|$)/i.test(x.url))
  const hls = arr.filter((x) => /\.m3u8(\?|$)/i.test(x.url))
  const rest = arr.filter((x) => mp4.indexOf(x) < 0 && hls.indexOf(x) < 0)
  sendResponse({
    ok: true,
    tabId: tabId,
    items: mp4.concat(hls).concat(rest).map((x) => ({ url: x.url, at: x.at, type: x.type })),
  })
  return true
})
