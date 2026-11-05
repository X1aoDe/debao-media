#!/usr/bin/env node
/**
 * 德饱 · 取素材（fetch-media.mjs）
 *
 * 把采集队列里某一条的视频/音频下到本机，给视频解析（ffmpeg 抽帧 + 豆包视频理解）用。
 * 只下队列里已经采到直链的素材；页面没有直链时给 yt-dlp 的替代命令，不硬爬。
 *
 * 用法：
 *   node fetch-media.mjs --id <采集项 id>      指定一条
 *   node fetch-media.mjs --latest              队列里最新一条
 *   node fetch-media.mjs --url <直链> --name 名字
 * 输出：
 *   data/media/<id>.mp4，并打印绝对路径
 */
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(HERE, 'data')
const QUEUE = path.join(DATA, 'queue.json')
const MEDIA = path.join(DATA, 'media')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name)
  if (i < 0) return fallback
  const v = process.argv[i + 1]
  return v && !v.startsWith('--') ? v : true
}

function readQueue() {
  try {
    const arr = JSON.parse(fs.readFileSync(QUEUE, 'utf8'))
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

function pickItem() {
  const id = arg('id', null)
  const url = arg('url', null)
  if (typeof url === 'string') {
    return { id: 'direct_' + Date.now(), videoUrl: url, url: url, title: typeof arg('name', '') === 'string' ? arg('name', '') : '' }
  }
  const q = readQueue()
  if (!q.length) return null
  if (typeof id === 'string') return q.find((x) => x.id === id) || null
  // 不给 --id 时优先挑最新一条有视频直链的，别拿图文条目空跑
  return q.find((x) => String(x.videoUrl || '').trim()) || q[0]
}

async function main() {
  const item = pickItem()
  if (!item) {
    console.error('队列是空的，或用 --id 指定一条。先采几条再跑。')
    process.exit(2)
  }
  const direct = String(item.videoUrl || '').trim()
  if (!direct) {
    console.error('这一条没有直链视频地址（' + (item.title || item.id || '未命名') + '：多半是图文笔记，或者页面还没加载完就采了）。')
    if (item.url) {
      console.error('可以改用 yt-dlp 直接抓页面：')
      console.error(`  yt-dlp -o "${path.join(MEDIA, '%(id)s.%(ext)s')}" "${item.url}"`)
      console.error('（本机还没装 yt-dlp：pip install -U yt-dlp）')
    } else {
      console.error('队列里也没有它的原始页面地址；回浏览器重新采一次（打开笔记页等 2 秒再点采集）。')
    }
    process.exit(3)
  }

  fs.mkdirSync(MEDIA, { recursive: true })
  const safe = String(item.id || 'item').replace(/[^\w.-]/g, '_')
  const dest = path.join(MEDIA, safe + '.mp4')

  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
    console.log('已经下过了：' + dest)
    return
  }

  console.log('下载中：' + direct)
  const res = await fetch(direct, {
    headers: {
      'User-Agent': UA,
      Referer: String(item.url || 'https://www.xiaohongshu.com/'),
      Accept: '*/*',
    },
  })
  if (!res.ok || !res.body) {
    console.error(`下载失败 HTTP ${res.status}`);
    console.error('可能原因：直链过期（小红书直链有时效），回页面重新采一次。')
    process.exit(4)
  }

  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest))
  const size = fs.statSync(dest).size
  if (size < 1024) {
    fs.unlinkSync(dest)
    console.error('下下来的文件太小（可能被拦），换一次链接再试。')
    process.exit(5)
  }
  console.log('已保存：' + dest)
  console.log(`大小：${(size / 1048576).toFixed(2)} MB`)
  console.log('下一步：ffprobe 看一眼，然后 ffmpeg 抽帧 / 让助手跑视频解析。')
}

main().catch((e) => {
  console.error('出错：' + ((e && e.message) || e))
  process.exit(1)
})
