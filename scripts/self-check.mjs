// 插件自检：在 node 里模拟 DSH 的 __ModuleLoader__，跑一遍工厂 + 五个指令生成器
import fs from 'node:fs'

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const CLIENT = join(dirname(dirname(fileURLToPath(import.meta.url))), 'client.js')
const ROOT = dirname(CLIENT)
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

globalThis.__DEBAO_TEST__ = true
globalThis.window = {
  __ModuleLoader__: { load: (cfg) => { globalThis.__cfg = cfg } },
  localStorage: { getItem: () => null, setItem: () => {} },
}
globalThis.document = {
  getElementById: () => null,
  head: { appendChild() {} },
  body: { appendChild() {}, removeChild() {} },
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
}
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true })

const src = fs.readFileSync(CLIENT, 'utf8')
new Function(src)()

const cfg = globalThis.__cfg
if (!cfg) throw new Error('__ModuleLoader__.load 没被调用')
if (cfg.id !== '@local/debao-media') throw new Error('id 不对: ' + cfg.id)
console.log('load id      :', cfg.id)

const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: (v) => ({ current: v }),
  useCallback: (fn) => fn,
}

const mod = cfg.factory((name) => (name === 'react' ? React : {}))
if (!mod || typeof mod.apply !== 'function') throw new Error('factory 没返回 apply')
if (!Array.isArray(mod.inject) || mod.inject[0] !== 'slots') throw new Error('inject 不对')

const regs = []
const effects = []
const ctx = {
  locale: {
    register: (ns, lang) => () => {},
    bind: () => (k) => k,
  },
  effect: (fn) => effects.push(fn),
  slots: {
    inject: (name, fn) => regs.push([name, fn()]),
    register: (spec, comp) => ({ spec, comp }),
  },
}
mod.apply(ctx)

const names = regs.map((r) => r[0])
console.log('slots        :', names.join(', '))
if (!names.includes('sidebar.panellist') || !names.includes('main')) throw new Error('slot 注册不全')
const side = regs.find((r) => r[0] === 'sidebar.panellist')[1]
const main = regs.find((r) => r[0] === 'main')[1]
if (side.spec.id !== main.spec.key) throw new Error('侧栏 id 与 main key 不一致: ' + side.spec.id + ' / ' + main.spec.key)
if (typeof side.comp !== 'function' || typeof main.comp !== 'function') throw new Error('slot 组件不是函数')

// 侧栏图标能渲染
const icon = side.comp({ size: 18 })
if (!icon || icon.type !== 'svg') throw new Error('SidebarIcon 没返回 svg')
console.log('sidebar id   :', side.spec.id, '| label:', side.spec.label(), '| icon ok')

// 五个指令生成器
const { BUILDERS, TOPIC_KINDS, defaultForm } = globalThis.__debao || {}
if (!BUILDERS) throw new Error('测试钩子没生效')

/* ---- 渲染冒烟：media 表单 + 解析结果面板（用 stub React 走一遍，抓 undefined 变量这类崩溃） ---- */
const hook = globalThis.__debao
if (typeof hook.renderForm !== 'function') throw new Error('测试钩子没导出 renderForm')
if (typeof hook.MediaResult !== 'function') throw new Error('测试钩子没导出 MediaResult')
const mediaForm = defaultForm().media
let patched = 0
const patchSpy = () => { patched++ }
const mediaFormEl = hook.renderForm('media', mediaForm, patchSpy, () => {}, { onAnalyze: () => {}, mx: null, platform: 'xhs', flash: () => {} })
if (!mediaFormEl) throw new Error('media 表单渲染返回空')
// 把渲染树拍平成字符串，确认关键控件都在
const flatten = (n) => {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(flatten).join('|')
  if (typeof n === 'function') {
    try {
      return flatten(n({}))
    } catch (e) {
      return ''
    }
  }
  if (typeof n.type === 'function') {
    try {
      const kids = n.children && n.children.length === 1 ? n.children[0] : n.children
      return flatten(n.type(Object.assign({}, n.props, { children: kids })))
    } catch (e) {
      return ''
    }
  }
  const kids = n.children ? n.children : []
  const attrs = [n.props && n.props.src, n.props && n.props.href].filter(Boolean).join(' ')
  return (
    String(n.type || '') +
    '(' +
    String((n.props && n.props.className) || '') +
    ')' +
    (attrs ? '{' + attrs + '}' : '') +
    kids.map(flatten).join('')
  )
}
const mediaFlat = flatten(mediaFormEl)
for (const must of ['开始解析（本机）', '怎么解析', '整段视频理解', '抽帧密度', '自适应', '24 帧（长视频）', '复制给助手的指令']) {
  if (mediaFlat.indexOf(must) < 0) throw new Error('media 表单缺控件: ' + must)
}
// 点一下「开始解析」得真的调到 onAnalyze
const findClickable = (n, text) => {
  if (!n || typeof n !== 'object') return null
  if (Array.isArray(n)) {
    for (const x of n) {
      const got = findClickable(x, text)
      if (got) return got
    }
    return null
  }
  const kids = n.children || []
  if (String(kids.map(flatten).join('')).indexOf(text) >= 0 && n.props && typeof n.props.onClick === 'function') return n
  for (const k of kids) {
    const got = findClickable(k, text)
    if (got) return got
  }
  return null
}
const btn = findClickable(mediaFormEl, '开始解析（本机）')
if (!btn) throw new Error('没找到「开始解析」按钮')
btn.props.onClick()
console.log('media form   : 控件齐全 + 按钮可点 ok')

const jobDone = {
  busy: false,
  stage: '完成',
  pct: 100,
  error: '',
  result: {
    id: 'an_test',
    model: 'doubao-seed-2-1-lite-260915',
    platform: 'xhs',
    source: { kind: 'local', file: 'D:\\a.mp4' },
    probe: { duration: 20, width: 720, height: 1280, fps: 25, hasAudio: true },
    frames: [{ t: 2.5, file: 'an_test/f01.jpg' }, { t: 7.5, file: 'an_test/f02.jpg' }],
    result: {
      summary: '一句话结论',
      hook: '前 3 秒钩子',
      timeline: [{ t: 2.5, shot: '画面', card: '无', what: '作用' }],
      structure: [{ name: '钩子', from: 0, to: 3, what: '作用' }],
      peakSec: 7.5,
      reusable: ['模板一', '模板二'],
      emotion: '平稳',
      gap: '缺口',
      tags: ['标签A', '标签B'],
    },
  },
}
const panel = hook.MediaResult({ job: jobDone, onCopyReport: () => {}, onAgain: () => {}, onToImitate: () => {}, empty: null })
const panelFlat = flatten(panel)
for (const must of ['一句话结论', '前 3 秒钩子', '时间线', '结构', '可复用模板', '情绪', '标签A', '复制结论', '照这个结构仿写']) {
  if (panelFlat.indexOf(must) < 0) throw new Error('结果面板缺内容: ' + must)
}
if (panelFlat.indexOf('/api/frames/an_test/f01.jpg') < 0) throw new Error('结果面板没挂关键帧图')
const report = hook.buildMediaReport(jobDone.result)
for (const must of ['【一句话结论】', '【前 3 秒钩子】', '【时间线】', '【可复用模板】', '【情绪】']) {
  if (report.indexOf(must) < 0) throw new Error('可复制报告缺段: ' + must)
}
console.log('media panel  : 帧图 + 时间线 + 结构 + 模板 + 复制报告 ok')

const form = defaultForm()
form.deconstruct = { title: '当我把出租屋改成这样', body: '正文正文', tags: '#改造', likes: '1200', collects: '860', comments: '95' }
form.imitate = { source: '参考笔记全文', replace: '换成辅食机', aspect: '正文', similarity: 50 }
form.original = { topic: '租房收纳', audience: '刚毕业', pain: '台面堆满', selling: '亲测两年', keywords: '免打孔', tone: '像朋友说话', words: 600 }
form.topics = { industry: '母婴辅食', kinds: form.topics.kinds }
form.cover = { type: '大字报', main: '别再乱买收纳盒了', sub: '这5个位置白扔钱', subject: '厨房台面', vibe: '干净有冲击力' }
form.media = { mode: 'video', link: 'D:\\videos\\a.mp4', desc: '女生讲租房收纳', goal: 'decode' }
form.learn = { stage: '起步（0-1 万粉）', goal: '两个月涨到 5000 粉', stats: '采集 20 条，平均赞 1200', extra: '' }
form.strategy = { direction: '租房改造 + 省钱好物', format: '口播', count: 10, constraint: '不露脸' }

let bad = 0
for (const key of Object.keys(BUILDERS)) {
  const out = BUILDERS[key](form[key] || {}, { platform: 'xhs' })
  const ok = typeof out === 'string' && out.length > 120 && !/undefined|\[object Object\]/.test(out)
  console.log('builder', key.padEnd(12), out.length.toString().padStart(4), '字', ok ? 'ok' : 'FAIL')
  if (!ok) { bad++; console.log(out.slice(0, 300)) }
}
if (bad) throw new Error(bad + ' 个生成器输出异常')

// 抖音口径也要能跑，并且带平台校准
const dyDecon = BUILDERS.deconstruct(form.deconstruct, { platform: 'douyin' })
if (!/平台校准 · 抖音/.test(dyDecon)) throw new Error('抖音口径没带上平台校准')
if (!/完播率/.test(dyDecon)) throw new Error('抖音口径缺算法关键词')
const xhsDecon = BUILDERS.deconstruct(form.deconstruct, { platform: 'xhs' })
if (!/平台校准 · 小红书/.test(xhsDecon)) throw new Error('小红书口径没带上平台校准')
if (/完播率/.test(xhsDecon)) throw new Error('小红书口径混进了抖音词')
console.log('platform     : 小红书/抖音 口径分流 ok')

// 空表单也不能崩
for (const key of Object.keys(BUILDERS)) {
  const out = BUILDERS[key]({}, { platform: 'douyin' })
  if (typeof out !== 'string' || out.length < 120) throw new Error('空表单崩了: ' + key)
}
console.log('empty form   : ok')
console.log('topic kinds  :', TOPIC_KINDS.length, TOPIC_KINDS.map((k) => k.key).join('/'))

/* ---------------- 采集页 + 本地桥 / 扩展 一致性 ---------------- */
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const { TAB_KEYS, BRIDGE_BASE, PLATFORMS } = globalThis.__debao
console.log('tabs         :', TAB_KEYS.join(' -> '))
if (!TAB_KEYS.includes('capture')) throw new Error('采集页没进 TAB_KEYS')
if (TAB_KEYS[0] !== 'board') throw new Error('总览看板应当在第一位')
if (TAB_KEYS[1] !== 'capture') throw new Error('采集库应当在第二位（拆解与学习板块的第一个）')
// 两大板块的分组顺序：工作台 → 拆解与学习 → 原创 → 我的
const groups = globalThis.__debao.TAB_GROUPS
if (!Array.isArray(groups) || groups.length !== 4) throw new Error('TAB_GROUPS 应当是 4 组')
if (groups.map((g) => g.key).join('|') !== 'g.work|g.learn|g.orig|g.mine') {
  throw new Error('分组成 工作台/拆解与学习/原创/我的 不对: ' + groups.map((g) => g.key).join('|'))
}
const flat = groups.reduce((a, g) => a.concat(g.keys), [])
if (flat.join('|') !== TAB_KEYS.join('|')) throw new Error('分组里的页签与 TAB_KEYS 不一致')
for (const k of ['deconstruct', 'imitate', 'search', 'bloggers', 'learn', 'original', 'topics', 'idea', 'insp', 'drafts']) {
  if (!TAB_KEYS.includes(k)) throw new Error('缺页签: ' + k)
}
if (TAB_KEYS.includes('media')) throw new Error('视频/音乐不该再是独立页签（已并入拆解）')
if (TAB_KEYS.includes('cover')) throw new Error('封面不该再是独立页签（已并入仿写）')
if (TAB_KEYS.includes('hot')) throw new Error('热榜不该再是独立页签（已并入搜索）')
for (const k of ['worksLearn', 'worksOrig']) {
  if (!TAB_KEYS.includes(k)) throw new Error('缺页签: ' + k)
}
if (TAB_KEYS.length !== 17) throw new Error('页签数量不对: ' + TAB_KEYS.length)
if (!TAB_KEYS.includes('settings')) throw new Error('缺页签: settings')
if (!TAB_KEYS.includes('account')) throw new Error('缺页签: account（后台数据）')
if (!PLATFORMS || !PLATFORMS.xhs || !PLATFORMS.douyin) throw new Error('平台定义缺失')
if (PLATFORMS.douyin.titleLimit !== 30) throw new Error('抖音标题字数不对')
console.log('platforms    :', Object.keys(PLATFORMS).join('/'), 'titleLimit', PLATFORMS.xhs.titleLimit + '/' + PLATFORMS.douyin.titleLimit)

const must = [
  'bridge/server.mjs',
  'bridge/start-bridge.bat',
  'bridge/learn.mjs',
  'bridge/fetch-media.mjs',
  'bridge/extension/manifest.json',
  'bridge/extension/inject.js',
  'bridge/extension/content.js',
  'bridge/extension/background.js',
]
for (const rel of must) {
  const p = join(root, rel)
  if (!fs.existsSync(p)) throw new Error('缺文件: ' + rel)
  const size = fs.statSync(p).size
  if (size < 200) throw new Error('文件太小，可能写坏了: ' + rel)
  console.log('bridge file  :', rel.padEnd(30), size + ' B')
}

const manifest = JSON.parse(fs.readFileSync(join(root, 'bridge/extension/manifest.json'), 'utf8'))
if (manifest.manifest_version !== 3) throw new Error('manifest 不是 MV3')
const mainWorld = (manifest.content_scripts || []).find((c) => c.world === 'MAIN')
if (!mainWorld || !mainWorld.js.includes('inject.js')) throw new Error('inject.js 没声明成 MAIN world')
const matches = (manifest.content_scripts || []).flatMap((c) => c.matches || [])
if (!matches.some((m) => m.includes('xiaohongshu.com'))) throw new Error('manifest 没匹配小红书')
if (!matches.some((m) => m.includes('douyin.com'))) throw new Error('manifest 没匹配抖音')
const port = String(BRIDGE_BASE).split(':').pop()
const hostOk = (manifest.host_permissions || []).some((h) => h.indexOf('127.0.0.1:' + port) >= 0)
if (!hostOk) throw new Error('manifest 的 host_permissions 与插件端口不一致: ' + port)
const serverSrc = fs.readFileSync(join(root, 'bridge/server.mjs'), 'utf8')
if (serverSrc.indexOf('53210') < 0) throw new Error('server.mjs 里没写默认端口')
for (const ep of ['/api/stats', '/api/kb', '/api/analysis', '/api/account']) {
  if (serverSrc.indexOf(ep) < 0) throw new Error('server.mjs 缺接口: ' + ep)
}
const injectSrc = fs.readFileSync(join(root, 'bridge/extension/inject.js'), 'utf8')
if (injectSrc.indexOf('aweme_id') < 0) throw new Error('inject.js 没有抖音解析')
if (injectSrc.indexOf('noteDetailMap') < 0) throw new Error('inject.js 没有小红书解析')
if (injectSrc.indexOf('installCreatorHooks') < 0) throw new Error('inject.js 没有后台接口拦截')
for (const needle of ['function vueVideo', 'function fiberVideo', 'function scriptVideo', '__reactFiber$', '__vnode']) {
  if (injectSrc.indexOf(needle) < 0) throw new Error('inject.js 缺少直链补路: ' + needle)
}
if (injectSrc.indexOf('videoUrlFrom') < 0) throw new Error('inject.js 没记录直链是从哪条路拿到的')
const contentSrc = fs.readFileSync(join(root, 'bridge/extension/content.js'), 'utf8')
if (contentSrc.indexOf('同步后台数据') < 0 && contentSrc.indexOf('同步后台到库') < 0) throw new Error('content.js 没有后台同步入口')
if (contentSrc.indexOf('perfVideoUrls') < 0) throw new Error('content.js 没有从 Resource Timing 捞视频流')
if (contentSrc.indexOf('采集到自媒体库') < 0) throw new Error('content.js 按钮文案没改名')
if (contentSrc.indexOf('function uploadVideo') < 0) throw new Error('content.js 没有把视频字节搬进本机的 uploadVideo')
if (contentSrc.indexOf('function isGuessUrl') < 0) throw new Error('content.js 没过滤"用 videoId 拼出来的假直链"')
if (serverSrc.indexOf('/api/media/upload') < 0) throw new Error('server.mjs 没有接收视频字节的 /api/media/upload')
if (serverSrc.indexOf('/api/bulk-delete') < 0 || serverSrc.indexOf('/api/bulk-patch') < 0)
  throw new Error('server.mjs 没有批量删除 / 批量编辑接口')
if (contentSrc.indexOf('function askSW') < 0) throw new Error('content.js 没问后台要 webRequest 旁观的媒体请求')
if (manifest.permissions.indexOf('webRequest') < 0) throw new Error('扩展没开 webRequest 权限（抓不到直链的关键）')
if (!manifest.background || !manifest.background.service_worker) throw new Error('manifest 没挂 background service worker')
const bgSrc = fs.readFileSync(join(root, 'bridge/extension/background.js'), 'utf8')
if (bgSrc.indexOf('onBeforeRequest') < 0) throw new Error('background.js 没监听 onBeforeRequest')
if (bgSrc.indexOf("'debao-media'") < 0 && bgSrc.indexOf('"debao-media"') < 0) throw new Error('background.js 没接 content.js 的查询消息')
if (manifest.name !== '采集到我的自媒体库') throw new Error('扩展名不对: ' + manifest.name + '（应为 采集到我的自媒体库）')
console.log('manifest     : MV3 / MAIN world ok / xhs+douyin ok / port', port, 'ok / 名称 ok')
console.log('api          : stats/kb/analysis/account ok')
console.log('inject       : xhs noteDetailMap + douyin aweme_id + creator hooks ok')
console.log('content      : 直链兜底 perfVideoUrls + 新按钮文案 ok')

/* ---- 一键解析：桥 + 插件 两端都要接上 ---- */
const analyzePath = join(root, 'bridge/analyze.mjs')
if (!fs.existsSync(analyzePath)) throw new Error('缺 bridge/analyze.mjs')
const anSrc = fs.readFileSync(analyzePath, 'utf8')
if (anSrc.indexOf('export async function runAnalysis') < 0) throw new Error('analyze.mjs 没有 runAnalysis')
{
  const mNA = anSrc.match(/function netArgs\(src\)\s*{([\s\S]*?)\n}/)
  if (!mNA) throw new Error('analyze.mjs 里找不到 netArgs')
  if (mNA[1].indexOf('.kind') >= 0)
    throw new Error('netArgs 又在按 kind 判断：下到本机的 mp4 带 -user_agent/-headers 会让 ffmpeg 报 Option not found')
}
if (anSrc.indexOf('test(file)') < 0) throw new Error('netArgs 没按「文件是不是 http」来判断')
if (anSrc.indexOf('export function resolveKey') < 0) throw new Error('analyze.mjs 没有 resolveKey')
/* 回归：resolveKey 返回 {key, from}，没有 ok 字段；写成 !keyInfo.ok 会永远抛错（已踩过） */
if (anSrc.indexOf('keyInfo.ok') >= 0) throw new Error('analyze.mjs 又把 keyInfo.ok 写回来了（resolveKey 没有 ok 字段）')
if (anSrc.indexOf('if (!keyInfo.key)') < 0) throw new Error('analyze.mjs 的 key 判空不等价于 resolveKey 的返回形状')
for (const ep of ['/api/analyze', '/api/analyze/status', '/api/analyze/key', '/api/frames/']) {
  if (serverSrc.indexOf(ep) < 0) throw new Error('server.mjs 缺解析接口: ' + ep)
}
const src2 = fs.readFileSync(join(root, 'client.js'), 'utf8')
if (src2.indexOf('/api/analyze') < 0) throw new Error('client.js 没有接 /api/analyze')
if (src2.indexOf('开始解析（本机）') < 0) throw new Error('client.js 没有一键解析按钮')
if (src2.indexOf('function MediaResult') < 0) throw new Error('client.js 没有结果面板')
if (src2.indexOf('function buildMediaReport') < 0) throw new Error('client.js 没有可复制报告')
if (anSrc.indexOf('function netArgs') < 0) throw new Error('analyze.mjs 没有给 HLS/远程流带 UA+Referer')
if (anSrc.indexOf('item.localFile') < 0) throw new Error('analyze.mjs 没优先用扩展存到本机的视频（localFile）')
if (src2.indexOf("h('span', { className: 'xm-badge ok', title: it.localFile }, '本机')") < 0)
  throw new Error('client.js 采集卡上没显示「本机」标记')
if (src2.indexOf('xm-cap-check') < 0) throw new Error('client.js 采集卡没有勾选框')
if (src2.indexOf('删除选中') < 0) throw new Error('client.js 没有批量删除按钮')
if (src2.indexOf('/api/bulk-patch') < 0) throw new Error('client.js 没有批量编辑（分类/评分/备注）')
if (src2.indexOf('一键解析全部视频') < 0) throw new Error('采集库没有批量解析按钮')
if (src2.indexOf('xm-cap-grid') < 0) throw new Error('采集库没有卡片网格')
if (src2.indexOf('const analyzeOne = function') < 0) throw new Error('采集库没有单条解析')
if (src2.indexOf('xm-cap-cover') < 0) throw new Error('采集卡没有封面区')
if (src2.indexOf('showAnalysis') < 0) throw new Error('解析完没有回送到结果面板')
console.log('analyze      : runAnalysis + 一键按钮 + 结果面板 ok')
console.log('library      : 卡片网格 + 直链/已解析标记 + 批量解析 ok')

/* ---- 采集库 UI 小工具 ---- */
const { fmtDur, itemCountText } = globalThis.__debao || {}
if (typeof fmtDur !== 'function') throw new Error('fmtDur 没导出')
if (fmtDur(65) !== '1:05' || fmtDur(9) !== '0:09' || fmtDur(0) !== '0:00') throw new Error('fmtDur 不对: ' + fmtDur(65) + ' ' + fmtDur(9))
const ctext = itemCountText({ total: 3, shown: 3, video: 2, link: 1, done: 1 })
if (ctext.indexOf('库 3 条') < 0 || ctext.indexOf('有直链 1') < 0 || ctext.indexOf('当前显示') >= 0) throw new Error('itemCountText 不对: ' + ctext)
console.log('fmt          : 时长/统计文案 ok')
const capEl = hook.Capture({ onUse: () => {}, onShowResult: () => {} })
const capFlat = flatten(capEl)
if (capFlat.indexOf('库里还没有东西') < 0) throw new Error('采集库空态没渲染出来')
if (capFlat.indexOf('采集到自媒体库') < 0) throw new Error('采集库空态没提新按钮名')
console.log('capture page : 空态可渲染 ok')

/* ---------------- 看板 / 列表视图 / 用量 ---------------- */
const { Board, hotOf, fmtNum, fmtMoney, starsOf, collectRatio, commentRatio } = globalThis.__debao || {}
if (typeof Board !== 'function') throw new Error('Board 没导出')
if (hotOf({ stats: { likes: 120000 } }).key !== 'S') throw new Error('hotOf S 判定不对')
if (hotOf({ stats: { likes: 12000 } }).key !== 'A') throw new Error('hotOf A 判定不对')
if (hotOf({ stats: { likes: 1200 } }).key !== 'B') throw new Error('hotOf B 判定不对')
if (hotOf({ stats: { likes: 12 } }).key !== 'C') throw new Error('hotOf C 判定不对')
if (fmtNum(12345) !== '1.2万' || fmtNum(999) !== '999') throw new Error('fmtNum 不对: ' + fmtNum(12345) + '/' + fmtNum(999))
if (fmtMoney(0.1234).indexOf('0.12') < 0 || fmtMoney(0.001).indexOf('0.0010') < 0) throw new Error('fmtMoney 不对: ' + fmtMoney(0.1234) + '/' + fmtMoney(0.001))
if (starsOf(5) !== '★★★★★' || starsOf(3) !== '★★★☆☆') throw new Error('starsOf 不对: ' + starsOf(3))
if (collectRatio({ stats: { likes: 100, collects: 25 } }) !== 25) throw new Error('collectRatio 不对')
if (commentRatio({ stats: { likes: 100, comments: 4 } }) !== 4) throw new Error('commentRatio 不对')
console.log('metrics      : 爆款档/数字/星级/比值 ok')

const boardEl = Board({ onUse: () => {}, onShowResult: () => {} })
const boardFlat = flatten(boardEl)
/* 自检里 locale 是恒等绑定，断言的是 key；中文串另外查 locale/zh.json */
for (const s of ['board.total', 'board.parsed', 'board.calls', 'board.byTag', 'board.usage']) {
  if (boardFlat.indexOf(s) < 0) throw new Error('看板缺节点: ' + s)
}
if (boardFlat.indexOf('xm-stat') < 0) throw new Error('看板没渲染统计卡')
if (boardFlat.indexOf('xm-dist') < 0) throw new Error('看板没渲染分布图')
const zh = JSON.parse(fs.readFileSync(join(root, 'locale/zh.json'), 'utf8'))
for (const s of ['总览看板', '采集总数', '豆包用量', '素材表']) {
  if (Object.values(zh).indexOf(s) < 0) throw new Error('zh.json 缺文案: ' + s)
}
console.log('board page   : 统计卡 + 分布 ok')

const srcB = fs.readFileSync(join(root, 'client.js'), 'utf8')
for (const s of ['xm-rail', 'xm-tbl-wrap', 'xm-seg-btn', "view === 'list'", 'dsh.debao.view.v1', "/api/usage"]) {
  if (srcB.indexOf(s) < 0) throw new Error('client.js 缺: ' + s)
}
const serverSrcB = fs.readFileSync(join(root, 'bridge/server.mjs'), 'utf8')
for (const s of ["'/api/usage'", 'DEBAO_PRICE_IN', 'promptTokens']) {
  if (serverSrcB.indexOf(s) < 0) throw new Error('server.mjs 缺: ' + s)
}
const analyzeSrcB = fs.readFileSync(join(root, 'bridge/analyze.mjs'), 'utf8')
for (const s of ['usage:', 'meta:', 'srcItem']) {
  if (analyzeSrcB.indexOf(s) < 0) throw new Error('analyze.mjs 缺: ' + s)
}
console.log('persist      : usage + meta 落库 ok')

/* ---------------- 一键生成 / 作品库 ---------------- */
const genHook = globalThis.__debao || {}
for (const k of ['GenResult', 'Works', 'costOfUsage', 'fmtMs']) {
  if (genHook[k] === undefined) throw new Error('没导出: ' + k)
}
const genFlat = flatten(
  genHook.GenResult({ gen: { busy: false, text: '测试成品正文', usage: { total_tokens: 120, prompt_tokens: 100, completion_tokens: 20 }, ms: 2000, model: 'doubao-test' } }),
)
for (const s of ['测试成品正文', 'tok', 'test', 'xm-genmeta']) {
  if (genFlat.indexOf(s) < 0) throw new Error('成品面板缺: ' + s)
}
const genBusy = flatten(genHook.GenResult({ gen: { busy: true, text: '' } }))
if (genBusy.indexOf('豆包正在写') < 0) throw new Error('成品面板缺生成中提示')
if (genHook.fmtMs(2000) !== '2.0s' || genHook.fmtMs(33000) !== '33s') throw new Error('fmtMs 不对: ' + genHook.fmtMs(2000) + '/' + genHook.fmtMs(33000))
if (Math.abs(genHook.costOfUsage({ prompt_tokens: 1000000, completion_tokens: 0 }) - 0.3) > 1e-9) throw new Error('costOfUsage 不对')

const worksFlat = flatten(genHook.Works({}))
if (worksFlat.indexOf('works.title') < 0) throw new Error('作品库标题没渲染')
if (worksFlat.indexOf('xm-work') < 0 && worksFlat.indexOf('xm-cap-empty') < 0) throw new Error('作品库既没有列表也没有空态')

const srcG = fs.readFileSync(join(root, 'client.js'), 'utf8')
for (const s of [
  "'⚡ 一键生成'",
  'function GenResult',
  'function Works',
  'xm-genbar',
  'new EventSource(',
  "BRIDGE_BASE + '/api/gen'",
  '/api/gen/stream',
  '/api/generation',
  '/api/generations',
  'xhs.debao',
]) {
  if (s === 'xhs.debao') continue
  if (srcG.indexOf(s) < 0) throw new Error('client.js 缺: ' + s)
}
const serverSrcG = fs.readFileSync(join(root, 'bridge/server.mjs'), 'utf8')
for (const s of ["'/api/gen'", "'/api/gen/stream'", "'/api/gen/status'", "'/api/generations'", "'/api/generation'", 'GENERATIONS_FILE', 'generateStream']) {
  if (serverSrcG.indexOf(s) < 0) throw new Error('server.mjs 缺: ' + s)
}
const textSrc = fs.readFileSync(join(root, 'bridge/text.mjs'), 'utf8')
for (const s of ['generateStream', 'TEXT_MODEL', "type: 'disabled'", 'DEBAO_TEXT_MODEL']) {
  if (textSrc.indexOf(s) < 0) throw new Error('text.mjs 缺: ' + s)
}
const zhGen = JSON.parse(fs.readFileSync(join(root, 'locale/zh.json'), 'utf8'))
for (const s of ['一键生成', '作品库']) {
  if (JSON.stringify(zhGen).indexOf(s) < 0) throw new Error('zh.json 缺文案: ' + s)
}
console.log('gen+works    : 一键生成 / 作品库 / 落库接口 ok')

/* 方法论回归：回答体系必须由 IMA「人类最强编导」那套框架撑着，不能被改回泛泛的爆款话术 */
for (const s of ['爆款四必要条件', '三种内容路径', '用户任务', '证据纪律', '万古同悲', '打破节奏']) {
  if (textSrc.indexOf(s) < 0) throw new Error('text.mjs 的 SYSTEM 缺方法论: ' + s)
}
for (const s of ['用户任务与需求层级', '爆款四必要条件诊断', '内容路径归属', '系列承接', 'necessities']) {
  if (srcG.indexOf(s) < 0) throw new Error('拆解模板缺方法论段: ' + s)
}
for (const s of ['评分卡（六维各 0-2 分）', '系列归属与拍摄成本', '热点四问']) {
  if (srcG.indexOf(s) < 0) throw new Error('选题模板缺方法论段: ' + s)
}
for (const s of ['任务单', '证据清单', '结构选择']) {
  if (srcG.indexOf(s) < 0) throw new Error('原创模板缺方法论段: ' + s)
}
for (const s of ['起号体检（Step0', '沿行为链', '机制复制检查']) {
  if (srcG.indexOf(s) < 0) throw new Error('账号学习模板缺方法论段: ' + s)
}
console.log('methodology  : 编导方法论已嵌入 SYSTEM + 六个模板 ok')

/* 抖音抓取回归：数据源换过好几轮，任何一个丢了都会让抖音页面采不到东西 */
const injectSrcDy = fs.readFileSync(join(root, 'bridge/extension/inject.js'), 'utf8')
for (const s of ['_ROUTER_DATA', '_SSR_HYDRATED_DATA', '__UNIVERSAL_DATA_FOR_REHYDRATION__', 'awemeId', 'RENDER_DATA']) {
  if (injectSrcDy.indexOf(s) < 0) throw new Error('inject.js 抖音数据源缺: ' + s)
}
const analyzeSrcDy = fs.readFileSync(join(root, 'bridge/analyze.mjs'), 'utf8')
if (analyzeSrcDy.indexOf('function refererOf') < 0) throw new Error('analyze.mjs 缺 refererOf（抖音 CDN 要自己的 Referer）')
if (analyzeSrcDy.indexOf('https://www.douyin.com/') < 0) throw new Error('analyze.mjs 没有抖音 Referer')
console.log('douyin       : ROUTER_DATA / SSR_HYDRATED / RENDER_DATA + Referer 分流 ok')

// ---- 后台数据（创作者后台同步） ----
const accountSrc = fs.readFileSync(new URL('../bridge/account.mjs', import.meta.url), 'utf8')
for (const k of ['summarizeAccount', 'pickWork', 'pickActivity', 'pickAccount']) {
  if (!accountSrc.includes(k)) throw new Error('account.mjs 缺 ' + k)
}
const serverBk = fs.readFileSync(new URL('../bridge/server.mjs', import.meta.url), 'utf8')
if (!serverBk.includes('/api/account/summary')) throw new Error('server 缺 /api/account/summary')
if (!serverBk.includes('summarizeAccount')) throw new Error('server 没接 account.mjs')
if (!src.includes('function Backend(props)')) throw new Error('缺 Backend 组件')
if (!src.includes('/api/account/summary')) throw new Error('Backend 没请求 /api/account/summary')
if (!src.includes('同步后台到库')) throw new Error('后台数据空态没写同步指引')
console.log('backend      : 后台数据页 + 快照提炼 ok')

/* 热榜 / 我的账号 / 找博主：页面与桥接口都要在 */
const socialSrc = fs.readFileSync(join(root, 'bridge/social.mjs'), 'utf8')
for (const s of ['function hotBoard', 'function keywordBoard', 'function searchUsers', 'function userProfile', 'fetch_hot_challenge_list', 'search_users']) {
  if (socialSrc.indexOf(s) < 0) throw new Error('social.mjs 缺: ' + s)
}
const serverSrcS = fs.readFileSync(join(root, 'bridge/server.mjs'), 'utf8')
for (const s of ["'/api/hot'", "'/api/bloggers/search'", "'/api/blogger/fetch'", "'/api/accounts'", "'/api/accounts/sync'", 'hot_cache.json']) {
  if (serverSrcS.indexOf(s) < 0) throw new Error('server.mjs 缺路由: ' + s)
}
const srcS = fs.readFileSync(join(root, 'client.js'), 'utf8')
for (const s of ['function Hot(props)', 'function Accounts(', 'function Bloggers(', 'xm-hot-grid', 'xm-acc-card', 'xm-blog-card', 'TAB_GROUPS']) {
  if (srcS.indexOf(s) < 0) throw new Error('client.js 缺: ' + s)
}
if (typeof globalThis.__debao.Hot !== 'function') throw new Error('Hot 没导出')
if (typeof globalThis.__debao.Accounts !== 'function') throw new Error('Accounts 没导出')
if (typeof globalThis.__debao.Bloggers !== 'function') throw new Error('Bloggers 没导出')
if (globalThis.__debao.fmtHot(12345) !== '1.2万') throw new Error('fmtHot 换算不对: ' + globalThis.__debao.fmtHot(12345))
if (globalThis.__debao.fmtHot(8082561) !== '808万') throw new Error('fmtHot 大数不对: ' + globalThis.__debao.fmtHot(8082561))
if (!/xm-hotpage/.test(src) || !/xm-accpage/.test(src) || !/xm-blogpage/.test(src)) {
  throw new Error('三个新页面容器类名要叫 xm-*page，不能跟 .xm-hot 徽标撞名')
}
if (/className: 'xm-hot'/.test(src)) throw new Error('页面容器不许再用 .xm-hot（会把爆款徽标撑大）')
console.log('hot/accounts : 热榜 + 我的账号 + 找博主 + 桥路由 ok')

/* 多账号 / 知识库可视化 / 本地上传去重 / 后台 AI 分析 */
const backendSrc = fs.readFileSync(new URL('../bridge/backend.mjs', import.meta.url), 'utf8')
for (const s of ['createStore', 'parseCsv', 'normalizeRow', 'signatureOf', 'kbCatalog', 'kbDoc', 'searchKb']) {
  if (backendSrc.indexOf(s) < 0) throw new Error('backend.mjs 缺: ' + s)
}
for (const s of ["'/api/account/list'", "'/api/kb/catalog'", "'/api/kb/search'", "'/api/kb/doc'", "'/api/backend/upload'", "'/api/backend/uploads'"]) {
  if (serverSrcS.indexOf(s) < 0) throw new Error('server.mjs 缺路由: ' + s)
}
for (const s of ['function buildBackendAnalyze', '方法论口径', 'Dan Koe', '上传文件', 'AI 分析', 'xm-kbcard', '本机知识库', 'xm-kbdocpre']) {
  if (src.indexOf(s) < 0) throw new Error('client.js 缺: ' + s)
}
if (typeof globalThis.__debao.buildBackendAnalyze !== 'function') throw new Error('buildBackendAnalyze 没导出')
const fakeAcct = { id: 'bk_x', platform: 'douyin', nickname: '测试号', data: { stats: { works: 2, play: 1000, digg: 50, collect: 20, comment: 3, share: 1 }, works: [{ id: 'w1', title: '菜市场直闪', play: 900, digg: 40, collect: 18, comment: 2, createTime: 1690000000000, src: 'mine', author: '测试号' }], account: null, activities: [] } }
const prompt = globalThis.__debao.buildBackendAnalyze(fakeAcct, [{ platform: 'douyin', title: '对标视频', author: '同行', stats: { likes: 9000, collects: 800, comments: 90 }, tags: ['摄影'] }], { name: 'x.csv', total: 3, kept: 2, dropped: 1, rows: [{ title: '上传行', play: 500, digg: 10, collect: 3, comment: 1 }] })
for (const s of ['任务句', '爆款四必要条件', '行为链', '对标视频', '上传行', '已去重', '21 天实验']) {
  if (prompt.indexOf(s) < 0) throw new Error('后台分析提示词缺: ' + s)
}
/* 小红书后台字段（扁平 note_id/liked_count/view_count）必须认得出来 */
const acctMod = await import(new URL('../bridge/account.mjs', import.meta.url))
const xhsSnap = {
  platform: 'xhs',
  host: 'creator.xiaohongshu.com',
  items: [
    { url: 'https://creator.xiaohongshu.com/api/note/list', json: { data: { notes: [{ note_id: '6a1b2c3d4e5f6a7b8c9d0e1f', title: '测试笔记A', liked_count: 120, collected_count: 33, comments_count: 5, view_count: 5000 }] } } },
    { url: 'https://creator.xiaohongshu.com/api/user/info', json: { data: { nickname: '测试小红书号', fans: 1234 } } },
  ],
}
const xhsSum = acctMod.summarizeAccount(xhsSnap)
if (!xhsSum.account || xhsSum.account.nickname !== '测试小红书号') throw new Error('小红书账号没认出来')
if (xhsSum.stats.works !== 1 || xhsSum.stats.play !== 5000 || xhsSum.stats.digg !== 120) throw new Error('小红书作品统计不对: ' + JSON.stringify(xhsSum.stats))
if (xhsSum.works[0].src !== 'mine') throw new Error('小红书作品来源标错: ' + xhsSum.works[0].src)
console.log('backend v2   : 多账号 / 知识库可视化 / 上传去重 / AI 分析 ok')
console.log('xhs fields   : note_id / liked_count / view_count 认得 ok')

/* 真实小红书创作者后台的三段接口（personal_info / posted / analyze list） */
const realSnap = {
  platform: 'xhs',
  host: 'creator.xiaohongshu.com',
  items: [
    {
      url: 'https://creator.xiaohongshu.com/api/galaxy/creator/home/personal_info',
      json: { data: { name: '德饱(真实)', avatar: 'https://x/a.jpg', fans_count: 5128, faved_count: 30000, red_num: 'abc123', personal_desc: '独立摄影师' } },
    },
    {
      url: 'https://creator.xiaohongshu.com/api/galaxy/v2/creator/note/user/posted',
      json: { data: { notes: [{ id: '6a1b2c3d4e5f6a7b8c9d0e1f', display_title: '真的作品', likes: 90, collected_count: 20, comments_count: 4, view_count: 1605, time: 1793000000 }] } },
    },
    {
      url: 'https://creator.xiaohongshu.com/api/galaxy/creator/datacenter/note/analyze/list',
      json: { data: { note_infos: [{ id: '6a1b2c3d4e5f6a7b8c9d0e1f', title: '真的作品', cover_url: 'https://x/c.jpg', like_count: 90, comment_count: 4, share_count: 1, read_count: 1605 }] } },
    },
  ],
}
const realSum = acctMod.summarizeAccount(realSnap)
if (!realSum.account || realSum.account.nickname !== '德饱(真实)') throw new Error('小红书 personal_info 昵称没认出来: ' + JSON.stringify(realSum.account))
if (realSum.activities.length) throw new Error('后台数据不该再有平台活动')
if (!realSum.stats || realSum.stats.play !== 1605) throw new Error('小红书 read_count 没进统计: ' + JSON.stringify(realSum.stats))
if (!/^\d{13}$/.test(String(realSum.works[0].createTime))) throw new Error('秒级时间戳要转成毫秒: ' + realSum.works[0].createTime)
/* 「所有笔记」这类列表标题不能被当成账号昵称 */
const badNick = acctMod.summarizeAccount({ platform: 'xhs', items: [{ url: 'https://creator.xiaohongshu.com/api/note/list', json: { data: { note_list: [{ note_id: 'x', title: '所有笔记', liked_count: 1 }] } } }] })
if (badNick.account && badNick.account.nickname === '所有笔记') throw new Error('「所有笔记」被误当成账号昵称了')

/* 账号管理 + xlsx 上传 */
for (const s of ["'/api/account/create'", "PATCH", 'parseXlsx']) {
  const hay = s === 'parseXlsx' ? backendSrc : serverSrcS
  if (hay.indexOf(s) < 0) throw new Error('缺账号管理 / xlsx 解析: ' + s)
}
if (typeof acctMod.summarizeAccount !== 'function') throw new Error('summarizeAccount 没导出')
if (!/parseXlsx/.test(backendSrc) || !/zlib/.test(backendSrc)) throw new Error('xlsx 解析必须走内置 zlib')
if (!/read_count|imp_count/.test(fs.readFileSync(new URL('../bridge/account.mjs', import.meta.url), 'utf8'))) {
  throw new Error('account.mjs 要认 read_count / imp_count')
}
for (const s of ['改个名字', '删除这个账号', '新建账号', '上传：Excel(.xlsx) / CSV / JSON 都行']) {
  if (src.indexOf(s) < 0) throw new Error('client.js 缺账号管理 / 上传提示: ' + s)
}
if (/accept: '\.csv/.test(src)) throw new Error('上传框不要再限制文件类型')
if (/平台活动/.test(src)) throw new Error('客户端不该再有「平台活动」')
if (!/src !== 'feed'/.test(src)) throw new Error('作品表要把灵感/活动过滤掉')
console.log('backend v3   : 小红书真实后台 / 无活动 / 账号管理 / xlsx ok')

/* 抖音创作者后台：item/list 的 metrics + 数据中心总览 + 粉丝画像 */
const dySnap = {
  platform: 'douyin',
  host: 'creator.douyin.com',
  profile: { nickname: '抖音测试号', avatar: 'https://p3.douyinpic.com/a.jpg' },
  items: [
    {
      url: 'https://creator.douyin.com/web/api/creator/item/list?count=10',
      json: {
        items: [
          {
            id: '1793678620123456',
            description: '20mm 镜头 + 闪光灯直闪',
            cover: { url_list: ['https://p3.douyinpic.com/cover.jpg'] },
            create_time: '1793678620',
            metrics: {
              view_count: '4494', like_count: '258', favorite_count: '60', comment_count: '12', share_count: '26',
              completion_rate_5s: '0.082', bounce_rate_2s: '0.5387', cover_click_rate: '0.0914', avg_view_second: '4.703',
            },
          },
        ],
      },
    },
    {
      url: 'https://creator.douyin.com/web/api/creator/data/overview/',
      json: { data: { play_count: '194000', like_count: '7384', share_count: '649', comment_count: '359', completion_rate_5s: '0.3467', bounce_rate_2s: '0.4852', cover_click_rate: '0.1615', avg_view_second: '6.48' } },
    },
    {
      url: 'https://creator.douyin.com/web/api/creator/data/fans/portrait/',
      json: { data: { gender: [{ name: '男', value: 0.62 }, { name: '女', value: 0.38 }], age: [{ name: '<23', value: 0.38 }, { name: '24-30', value: 0.34 }] } },
    },
  ],
}
const dySum = acctMod.summarizeAccount(dySnap)
if (!dySum.account || dySum.account.nickname !== '抖音测试号') throw new Error('抖音页面昵称兜底没生效: ' + JSON.stringify(dySum.account))
if (dySum.works.length !== 1) throw new Error('抖音 works 没解析出来')

const dyw = dySum.works[0]
if (dyw.play !== 4494 || dyw.digg !== 258 || dyw.collect !== 60) throw new Error('抖音 metrics 数字没映射对: ' + JSON.stringify(dyw))
if (!dyw.extra || Math.abs(dyw.extra.completion5s - 0.082) > 1e-6) throw new Error('抖音 5 秒完播率没带上: ' + JSON.stringify(dyw.extra))
if (!/^https:\/\/p3\.douyinpic\.com\/cover\.jpg$/.test(dyw.cover)) throw new Error('抖音 cover.url_list 没取到: ' + dyw.cover)
if (String(dyw.createTime) !== '1793678620000') throw new Error('抖音 create_time 没转毫秒: ' + dyw.createTime)
if (!dySum.metrics || dySum.metrics.play !== 194000) throw new Error('数据中心总览没解析: ' + JSON.stringify(dySum.metrics))
if (!dySum.portrait || !dySum.portrait.gender || dySum.portrait.gender.length !== 2) throw new Error('粉丝画像没解析: ' + JSON.stringify(dySum.portrait))
const dyPrompt = globalThis.__debao.buildBackendAnalyze({ id: 'bk_d', platform: 'douyin', nickname: '抖音测试号', data: dySum }, [], null)
for (const s of ['后台数据总览', '5 秒完播率', '粉丝画像', '性别']) {
  if (dyPrompt.indexOf(s) < 0) throw new Error('抖音后台分析提示词缺: ' + s)
}

const injectSrcDy2 = fs.readFileSync(new URL('../bridge/extension/inject.js', import.meta.url), 'utf8')
const contentSrcDy2 = fs.readFileSync(new URL('../bridge/extension/content.js', import.meta.url), 'utf8')
for (const s of ['noteCreatorReq', 'replayCreator', 'creator-replay', 'creatorReqBuf']) {
  if (injectSrcDy2.indexOf(s) < 0) throw new Error('inject.js 缺请求重放: ' + s)
}
for (const s of ['creator-replay', 'creatorProfile', 'data-e2e="user-name"']) {
  if (contentSrcDy2.indexOf(s) < 0) throw new Error('content.js 缺: ' + s)
}
for (const s of ['xm-mxgrid', 'xm-ptgrid', '数据总览（创作者后台「数据中心」）', '粉丝画像']) {
  if (src.indexOf(s) < 0) throw new Error('client.js 缺数据总览/画像: ' + s)
}
if (src.indexOf('mx || pt') < 0) throw new Error('数据总览/画像要按条件渲染')
console.log('douyin board : item/list metrics / 数据中心总览 / 粉丝画像 / 请求重放 ok')

/* ---- 整段视频理解 / SSE 进度 / 后台下载 ---- */
{
  const analyzeSrc2 = fs.readFileSync(join(ROOT, 'bridge', 'analyze.mjs'), 'utf8')
  assert(analyzeSrc2.includes('function callVideo'), 'analyze.mjs 要有 callVideo（整段视频理解）')
  assert(analyzeSrc2.includes("type: 'video_url'"), 'analyze.mjs 要发 video_url 给豆包')
  assert(analyzeSrc2.includes('function planFrames'), 'analyze.mjs 要按片长自适应帧数')
  assert(analyzeSrc2.includes("analyzeMode = 'video'"), 'analyze.mjs 要走整段视频分支')
  assert(/Math\.min\(32, count/.test(analyzeSrc2), '抽帧上限要放到 32')
  assert(analyzeSrc2.includes('VIDEO_MAX_BYTES'), '整段视频要有大小上限')

  const srvSrc2 = fs.readFileSync(join(ROOT, 'bridge', 'server.mjs'), 'utf8')
  assert(srvSrc2.includes('/api/analyze/stream'), 'server 要有解析进度 SSE')
  assert(srvSrc2.includes('/api/analyze/active'), 'server 要能列出正在跑的任务')

  assert(src.includes('/api/analyze/stream?id='), 'client 要用 SSE 接解析进度')
  assert(src.includes('/api/analyze/active'), 'client 重开页面要接回正在跑的任务')
  assert(src.includes('怎么解析') && src.includes('整段视频理解'), '解析方式 chips 要能选整段/抽帧')
  assert(src.includes('xm-mx-via'), '结果要标出这次是整段还是抽帧')

  const bgSrc = fs.readFileSync(join(ROOT, 'bridge', 'extension', 'background.js'), 'utf8')
  assert(bgSrc.includes("msg.type === 'debao-download'"), 'background 要替页面下载视频（绕开 CORS）')
  assert(bgSrc.includes('/api/media/upload'), 'background 要能把字节交给本机桥')
  const ctSrc = fs.readFileSync(join(ROOT, 'bridge', 'extension', 'content.js'), 'utf8')
  assert(ctSrc.includes('function swSaveVideo'), 'content 要先走后台下载')
  assert(ctSrc.includes('uploadVideoDirect'), 'content 要保留页面直下的兜底')

  const mf = JSON.parse(fs.readFileSync(join(ROOT, 'bridge', 'extension', 'manifest.json'), 'utf8'))
  assert(mf.version === '2.6.0', '扩展版本要是 2.6.0')
  console.log('analyze v2   : 整段视频 / 自适应帧数 / SSE 进度 / 后台下载 ok')

  /* v3：超大视频先压小样，别因为体积退回抽帧；拆解页能直接贴链接解析 */
  assert(analyzeSrc2.includes('async function compactForVideo'), '超大视频要有压缩小样的兜底')
  assert(analyzeSrc2.includes('videoFile'), 'callVideo 要能用压缩后的文件')
  assert(analyzeSrc2.includes("'_compact_'"), '压缩临时文件要能被清理')
  assert(src.includes('xm-linkbox') && src.includes('解析这条'), '拆解页要能直接粘链接解析')
  assert(/mode: m\.how === 'frames'/.test(src), 'mode 要交给「怎么解析」决定')
  assert(src.includes('整段看（推荐）') && src.includes('抽帧快跑（省 token）'), '拆解页要有「怎么解析」两档')
  assert(analyzeSrc2.includes('const wantVideo = wantMode !== \'frames\''), 'auto 档要一律整段看')
  console.log('analyze v3   : 超大视频压小样 / 拆解页贴链接解析 ok')
}

console.log('\nALL CHECKS PASSED')
