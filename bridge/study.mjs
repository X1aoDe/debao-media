/**
 * 学习库：把「拆解 / 仿写 / 视频解析 / 博主 / 账号学习 / 后台分析」这些学过的动作，
 * 统一落成一张表（像飞书多维表格那样），可筛选、可加标签、可删除、可去重。
 *
 * 设计：
 * - 真实来源是 generations.json / analyses.json / bloggers.json，每次读取时同步进来；
 * - study.json 只存「人工痕迹」：标签、备注、星标、手动添加的行、以及已删除的 id 黑名单；
 * - 所以删掉的行不会在下次同步时又冒出来。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const KINDS = {
  deconstruct: '拆解',
  imitate: '仿写',
  learn: '账号学习',
  backend: '后台分析',
  analysis: '视频解析',
  blogger: '博主',
  original: '原创',
  topics: '选题',
  idea: '创意',
  cover: '封面',
  manual: '手动添加',
}

function hash(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 14)
}

function str(v) {
  return v == null ? '' : String(v)
}

function clip(s, n) {
  const t = str(s)
  return t.length > n ? t.slice(0, n) + '…' : t
}

/* 从生成结果的 markdown 里抽一段可读摘要：跳过标题行、去掉 markdown 记号 */
function summarize(text, n) {
  const lines = str(text).split(/\r?\n/)
  const picked = []
  for (const raw of lines) {
    const l = raw.trim()
    if (!l) continue
    if (l.startsWith('#')) continue
    if (l.startsWith('```')) continue
    picked.push(l.replace(/^[-*>\s]+/, '').replace(/\*\*/g, ''))
    if (picked.join(' ').length > n) break
  }
  return clip(picked.join(' '), n)
}

function fmtStats(s) {
  const out = {}
  if (!s || typeof s !== 'object') return out
  const map = { likes: 'likes', digg: 'likes', collects: 'collects', collect: 'collects', comments: 'comments', comment: 'comments', shares: 'shares', share: 'shares' }
  Object.keys(map).forEach(function (k) {
    const v = Number(s[k])
    if (v > 0) out[map[k]] = v
  })
  return out
}

function mkItem(o) {
  const kind = KINDS[o.kind] ? o.kind : 'manual'
  const platform = o.platform === 'douyin' ? 'douyin' : o.platform === 'xhs' ? 'xhs' : ''
  const origin = o.origin || 'manual'
  const sourceId = str(o.sourceId) || hash(kind + '|' + platform + '|' + str(o.title) + '|' + str(o.url))
  const id = 'st_' + hash(origin + '|' + kind + '|' + sourceId)
  return {
    id: id,
    origin: origin,
    kind: kind,
    label: KINDS[kind],
    platform: platform,
    title: clip(o.title || '未命名', 160),
    author: clip(o.author || '', 80),
    url: str(o.url || ''),
    cover: str(o.cover || ''),
    stats: fmtStats(o.stats),
    summary: clip(o.summary || '', 260),
    text: clip(o.text || '', 30000),
    tags: Array.isArray(o.tags) ? o.tags.filter(Boolean).map(String).slice(0, 12) : [],
    note: clip(o.note || '', 2000),
    starred: !!o.starred,
    at: Number(o.at) || Date.now(),
    updatedAt: Number(o.updatedAt) || Number(o.at) || Date.now(),
    sourceId: sourceId,
    meta: o.meta && typeof o.meta === 'object' ? o.meta : {},
  }
}

function normTitle(t) {
  return str(t)
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，。！？、,.!?：:；;"'“”‘’（）()【】\[\]…—\-_/\\|·~`]+/g, '')
}

export function createStudy(dataDir) {
  const FILE = path.join(dataDir, 'study.json')

  function load() {
    try {
      const j = JSON.parse(fs.readFileSync(FILE, 'utf8'))
      return {
        items: Array.isArray(j.items) ? j.items : [],
        hidden: Array.isArray(j.hidden) ? j.hidden : [],
        syncedAt: Number(j.syncedAt) || 0,
        createdAt: Number(j.createdAt) || Date.now(),
      }
    } catch (e) {
      return { items: [], hidden: [], syncedAt: 0, createdAt: Date.now() }
    }
  }

  function save(st) {
    const tmp = FILE + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(st, null, 2), 'utf8')
    fs.renameSync(tmp, FILE)
  }

  function readArr(file) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'))
      if (Array.isArray(j)) return j
      if (j && Array.isArray(j.items)) return j.items
      return []
    } catch (e) {
      return []
    }
  }

  /* 把三个数据源摊平成学习库的行 */
  function harvest() {
    const out = []

    readArr('generations.json').forEach(function (g) {
      if (!g || !g.id) return
      out.push(
        mkItem({
          origin: 'gen',
          sourceId: g.id,
          kind: g.kind === 'cover' ? 'cover' : g.kind,
          platform: g.platform,
          title: g.title || KINDS[g.kind] + ' · 未命名',
          summary: summarize(g.text, 240),
          text: g.text,
          at: g.at,
          meta: { model: g.model, ms: g.ms, tokens: g.usage && g.usage.total_tokens, adopted: !!g.adopted },
        }),
      )
    })

    readArr('analyses.json').forEach(function (a) {
      if (!a || !a.id) return
      const r = a.result || {}
      const meta = a.meta || {}
      const lines = []
      if (r.summary) lines.push(r.summary)
      if (r.hook) lines.push('前 3 秒：' + r.hook)
      if (Array.isArray(r.timeline)) {
        r.timeline.forEach(function (t) {
          lines.push(Number(t.t) + 's ｜' + (t.shot || '') + (t.card ? ' ｜字卡：' + t.card : '') + (t.what ? ' ｜' + t.what : ''))
        })
      }
      if (Array.isArray(r.structure)) {
        lines.push('结构：' + r.structure.map(function (s) { return s.name + ' ' + s.from + '-' + s.to + 's' }).join(' / '))
      }
      if (Array.isArray(r.reusable)) lines.push('可复用：' + r.reusable.join('；'))
      out.push(
        mkItem({
          origin: 'analysis',
          sourceId: a.id,
          kind: 'analysis',
          platform: a.platform,
          title: meta.title || '视频解析 · ' + a.id,
          author: meta.author && meta.author.name,
          cover: meta.cover,
          url: meta.url,
          stats: { likes: meta.likes, collects: meta.collects, comments: meta.comments },
          summary: r.summary || summarize(lines.join('\n'), 220),
          text: lines.join('\n'),
          at: a.at,
          meta: { mode: (a.source && a.source.mode) || a.mode, frames: (a.frames || []).length, model: a.model },
        }),
      )
    })

    readArr('bloggers.json').forEach(function (b) {
      if (!b) return
      const uid = b.uid || b.userId || b.sec_uid || b.id || b.nickname
      if (!uid) return
      out.push(
        mkItem({
          origin: 'blogger',
          sourceId: str(uid),
          kind: 'blogger',
          platform: b.platform,
          title: b.nickname || b.name || '未命名博主',
          author: b.nickname || b.name || '',
          cover: b.avatar,
          url: b.url || b.homeUrl || '',
          stats: { likes: b.likes || b.likeCount || b.totalFavorited, collects: b.fans || b.followers || b.fansCount, comments: b.works || b.awemeCount || b.noteCount },
          summary: str(b.signature || b.desc || b.intro || '').slice(0, 220),
          at: b.at || b.fetchedAt,
          meta: { fans: b.fans || b.followers || 0, works: b.works || 0 },
        }),
      )
    })

    return out
  }

  /* 同步：把来源行并进库，保留人工痕迹；已被删掉的 id 不再回来 */
  function sync(force) {
    const st = load()
    if (!force && Date.now() - st.syncedAt < 8000) return st

    const hidden = new Set(st.hidden)
    const byId = new Map()
    st.items.forEach(function (it) {
      if (it && it.id) byId.set(it.id, it)
    })

    harvest().forEach(function (fn) {
      if (hidden.has(fn.id)) return
      const old = byId.get(fn.id)
      if (old) {
        byId.set(
          fn.id,
          Object.assign({}, fn, {
            tags: old.tags || [],
            note: old.note || '',
            starred: !!old.starred,
            title: old.title && old.manualTitle ? old.title : fn.title,
            summary: old.summary && old.manualSummary ? old.summary : fn.summary,
            updatedAt: old.updatedAt || fn.updatedAt,
          }),
        )
      } else {
        byId.set(fn.id, fn)
      }
    })

    const items = Array.from(byId.values()).sort(function (a, b) {
      return (b.at || 0) - (a.at || 0)
    })
    const next = { items: items, hidden: Array.from(hidden), syncedAt: Date.now(), createdAt: st.createdAt }
    save(next)
    return next
  }

  function strip(it) {
    const o = Object.assign({}, it)
    delete o.text
    o.hasText = str(it.text).length > 0
    return o
  }

  function list(q) {
    const st = sync(false)
    const kind = str(q.kind).trim()
    const platform = str(q.platform).trim()
    const keyword = str(q.q).trim().toLowerCase()
    const starred = !!q.starred
    const origin = str(q.origin).trim()
    const tag = str(q.tag).trim()

    const items = st.items.filter(function (it) {
      if (kind && it.kind !== kind) return false
      if (origin && it.origin !== origin) return false
      if (platform && it.platform !== platform) return false
      if (starred && !it.starred) return false
      if (tag && !(it.tags || []).some(function (x) { return String(x).toLowerCase() === tag.toLowerCase() })) return false
      if (keyword) {
        const hay = (it.title + ' ' + it.author + ' ' + it.summary + ' ' + (it.tags || []).join(' ') + ' ' + it.note).toLowerCase()
        if (hay.indexOf(keyword) < 0) return false
      }
      return true
    })

    const counts = { total: st.items.length, byKind: {}, byPlatform: { xhs: 0, douyin: 0 } }
    st.items.forEach(function (it) {
      counts.byKind[it.kind] = (counts.byKind[it.kind] || 0) + 1
      if (it.platform === 'xhs') counts.byPlatform.xhs++
      if (it.platform === 'douyin') counts.byPlatform.douyin++
    })

    const limit = Math.max(1, Math.min(1000, Number(q.limit) || 400))
    return { items: items.slice(0, limit).map(strip), matched: items.length, counts: counts, syncedAt: st.syncedAt }
  }

  function get(id) {
    const st = sync(false)
    return st.items.find(function (it) { return it.id === id }) || null
  }

  function add(input, at) {
    const st = sync(false)
    const list = Array.isArray(input) ? input : [input]
    const added = []
    const skipped = []
    const hidden = new Set(st.hidden)

    list.forEach(function (raw) {
      if (!raw) return
      const it = mkItem(Object.assign({}, raw, { origin: 'manual', at: raw.at || at || Date.now() }))
      const dup = st.items.find(function (x) {
        return x.kind === it.kind && x.platform === it.platform && normTitle(x.title) === normTitle(it.title)
      })
      if (dup) {
        skipped.push(it.title)
        return
      }
      st.items.push(it)
      hidden.delete(it.id)
      added.push(strip(it))
    })

    st.hidden = Array.from(hidden)
    st.syncedAt = st.syncedAt || Date.now()
    save(st)
    return { added: added, skipped: skipped }
  }

  function patch(id, body) {
    const st = sync(false)
    const it = st.items.find(function (x) { return x.id === id })
    if (!it) return null
    if (body.title !== undefined) {
      it.title = clip(body.title, 160)
      it.manualTitle = true
    }
    if (body.summary !== undefined) {
      it.summary = clip(body.summary, 260)
      it.manualSummary = true
    }
    if (body.note !== undefined) it.note = clip(body.note, 2000)
    if (body.tags !== undefined) {
      const arr = Array.isArray(body.tags)
        ? body.tags
        : str(body.tags)
            .split(/[,，\s]+/)
            .filter(Boolean)
      it.tags = arr.map(String).slice(0, 12)
    }
    if (body.starred !== undefined) it.starred = !!body.starred
    if (body.text !== undefined) it.text = clip(body.text, 30000)
    it.updatedAt = Date.now()
    save(st)
    return strip(it)
  }

  function remove(ids) {
    const st = sync(false)
    const set = new Set((Array.isArray(ids) ? ids : [ids]).map(String))
    const before = st.items.length
    st.items = st.items.filter(function (it) { return !set.has(it.id) })
    const hidden = new Set(st.hidden)
    set.forEach(function (id) { hidden.add(id) })
    st.hidden = Array.from(hidden)
    save(st)
    return { removed: before - st.items.length }
  }

  /* 去重：同 kind + platform + 规范化标题（或同一条来源）只留最新、最完整的 */
  function dedupe() {
    const st = sync(false)
    const keep = new Map()
    const hidden = new Set(st.hidden)
    let removed = 0
    st.items.forEach(function (it) {
      const key = it.kind + '|' + it.platform + '|' + normTitle(it.title)
      const prev = keep.get(key)
      if (!prev) {
        keep.set(key, it)
        return
      }
      const prevScore = (prev.text || '').length + (prev.starred ? 5000 : 0) + (prev.tags || []).length * 100
      const curScore = (it.text || '').length + (it.starred ? 5000 : 0) + (it.tags || []).length * 100
      const winner = curScore > prevScore ? it : prev
      const loser = winner === it ? prev : it
      keep.set(key, winner)
      const idx = st.items.indexOf(loser)
      if (idx >= 0) {
        st.items.splice(idx, 1)
        hidden.add(loser.id)
        removed++
      }
    })
    st.hidden = Array.from(hidden)
    save(st)
    return { removed: removed, left: st.items.length }
  }

  function counts() {
    const st = sync(false)
    return st.items.length
  }

  return { list, get, add, patch, remove, dedupe, sync, counts, KINDS }
}
