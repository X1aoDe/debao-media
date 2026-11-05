/* 从 client.js 的 STRINGS 生成 locale/zh.json 与 locale/en.json，保持运行时与导出文件一致 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const src = fs.readFileSync(path.join(root, 'client.js'), 'utf8')

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

new Function(src)()

/* 钩子在 factory 里，必须先跑一次 factory 才会导出 */
const cfg = globalThis.__cfg
if (!cfg) throw new Error('__ModuleLoader__.load 没被调用')
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: (v) => ({ current: v }),
  useCallback: (fn) => fn,
}
cfg.factory((name) => (name === 'react' ? React : {}))

const S = globalThis.__debao && globalThis.__debao.STRINGS
if (!S) throw new Error('STRINGS 没导出')

for (const [lang, file] of [['zh', 'zh.json'], ['en', 'en.json']]) {
  const data = S[lang] || {}
  const sorted = {}
  Object.keys(data)
    .sort()
    .forEach((k) => (sorted[k] = data[k]))
  fs.writeFileSync(path.join(root, 'locale', file), JSON.stringify(sorted, null, 2) + '\n', 'utf8')
  console.log(file, Object.keys(sorted).length, 'keys')
}
