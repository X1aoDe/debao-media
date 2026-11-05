#!/usr/bin/env node
/**
 * 德饱 · 本地学习（learn.mjs）
 *
 * 读 bridge/data/queue.json，算出一份「你的内容长什么样」的统计，
 * 写到 bridge/data/insights.json，并打印给人看。
 *
 * 插件里「账号学习」页的「读本地统计」走的是 server.mjs 的 /api/stats；
 * 这个脚本算得更细（标签表现、发文节律、长短与互动的关系），
 * 适合定期手动跑一次，把 insights.json 一起喂给助手。
 *
 * 用法：
 *   node learn.mjs            算全部
 *   node learn.mjs --platform douyin
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(HERE, 'data')
const QUEUE = path.join(DATA, 'queue.json')
const OUT = path.join(DATA, 'insights.json')

const args = process.argv.slice(2)
const wantPlatform = (() => {
  const i = args.indexOf('--platform')
  return i >= 0 ? args[i + 1] : ''
})()

function readQueue() {
  try {
    const arr = JSON.parse(fs.readFileSync(QUEUE, 'utf8'))
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

function median(arr) {
  if (!arr.length) return 0
  const s = arr.slice().sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

function pct(arr, p) {
  if (!arr.length) return 0
  const s = arr.slice().sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))]
}

function avg(arr) {
  if (!arr.length) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

function likesOf(x) {
  return (x.stats && x.stats.likes) || 0
}

function tagStats(items) {
  const map = new Map()
  for (const it of items) {
    for (const t of it.tags || []) {
      if (!map.has(t)) map.set(t, [])
      map.get(t).push(likesOf(it))
    }
  }
  return Array.from(map.entries())
    .filter((x) => x[1].length >= 2)
    .map((x) => ({ tag: x[0], n: x[1].length, avgLikes: avg(x[1]), medianLikes: median(x[1]) }))
    .sort((a, b) => b.avgLikes - a.avgLikes)
    .slice(0, 20)
}

function rhythm(items) {
  const wd = [0, 0, 0, 0, 0, 0, 0]
  const hr = new Array(24).fill(0)
  let n = 0
  for (const it of items) {
    const raw = it.publishTime
    if (!raw) continue
    let d = null
    if (/^\d{10}$/.test(String(raw))) d = new Date(Number(raw) * 1000)
    else if (/^\d{13}$/.test(String(raw))) d = new Date(Number(raw))
    else d = new Date(String(raw))
    if (!d || isNaN(d.getTime())) continue
    wd[d.getDay()] += 1
    hr[d.getHours()] += 1
    n += 1
  }
  return { withTime: n, weekday: wd, hour: hr }
}

function shapeStats(items) {
  const rows = items.map((it) => ({
    len: String(it.desc || '').length,
    tags: (it.tags || []).length,
    emoji: (String(it.desc || '').match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length,
    lines: String(it.desc || '').split('\n').length,
    likes: likesOf(it),
  }))
  const hi = rows.filter((r) => r.likes >= pct(rows.map((x) => x.likes), 0.75))
  const lo = rows.filter((r) => r.likes <= pct(rows.map((x) => x.likes), 0.25))
  const pick = (arr) => ({
    n: arr.length,
    avgLen: avg(arr.map((r) => r.len)),
    avgTags: avg(arr.map((r) => r.tags)),
    avgEmoji: avg(arr.map((r) => r.emoji)),
    avgLines: avg(arr.map((r) => r.lines)),
  })
  return { high: pick(hi), low: pick(lo) }
}

const all = readQueue()
const items = wantPlatform ? all.filter((x) => (x.platform || 'xhs') === wantPlatform) : all

if (!items.length) {
  console.log('队列是空的：先去浏览器里采几条（插件「★ 采集」页能看到）。')
  process.exit(0)
}

const likes = items.map(likesOf)
const collects = items.map((x) => (x.stats && x.stats.collects) || 0)
const comments = items.map((x) => (x.stats && x.stats.comments) || 0)
const byPlat = {}
const byKind = { video: 0, image: 0 }
for (const it of items) {
  const p = it.platform || 'xhs'
  byPlat[p] = (byPlat[p] || 0) + 1
  byKind[it.mediaType === 'video' || it.videoUrl ? 'video' : 'image'] += 1
}

const top = items
  .slice()
  .sort((a, b) => likesOf(b) - likesOf(a))
  .slice(0, 10)
  .map((x) => ({
    title: x.title || (x.desc || '').slice(0, 40),
    platform: x.platform || 'xhs',
    kind: x.mediaType || (x.videoUrl ? 'video' : 'image'),
    likes: likesOf(x),
    collects: (x.stats && x.stats.collects) || 0,
    comments: (x.stats && x.stats.comments) || 0,
    tags: x.tags || [],
  }))

const insights = {
  at: Date.now(),
  platform: wantPlatform || 'all',
  counts: { total: items.length, byPlatform: byPlat, byKind },
  engagement: {
    likes: { avg: avg(likes), median: median(likes), p25: pct(likes, 0.25), p75: pct(likes, 0.75), max: Math.max(...likes) },
    collects: { avg: avg(collects), median: median(collects) },
    comments: { avg: avg(comments), median: median(comments) },
    collectRatePct: median(items.map((x) => (likesOf(x) ? Math.round((((x.stats && x.stats.collects) || 0) / likesOf(x)) * 100) : 0))),
  },
  topTags: tagStats(items),
  rhythm: rhythm(items),
  shape: shapeStats(items),
  topItems: top,
}

fs.mkdirSync(DATA, { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(insights, null, 2), 'utf8')

const e = insights.engagement
console.log(`样本 ${items.length} 条  ${JSON.stringify(byPlat)}  视频 ${byKind.video} / 图文 ${byKind.image}`)
console.log(`点赞 平均 ${e.likes.avg} / 中位 ${e.likes.median} / 最高 ${e.likes.max}`)
console.log(`收藏率中位 ${e.collectRatePct}%`)
if (insights.topTags.length) {
  console.log('标签表现（按平均赞）：')
  insights.topTags.slice(0, 8).forEach((t) => console.log(`  #${t.tag}  ${t.n} 条  平均 ${t.avgLikes}  中位 ${t.medianLikes}`))
}
console.log(`爆款 vs 平款：高互动平均 ${insights.shape.high.avgLen} 字 / ${insights.shape.high.avgTags} 标签；低互动 ${insights.shape.low.avgLen} 字 / ${insights.shape.low.avgTags} 标签`)
console.log(`已写 ${OUT}`)
