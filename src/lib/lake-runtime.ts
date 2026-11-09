export const LAKE_EDITOR_PAGE = "/lake/editor.html?v=9"
export const LAKE_VIEWER_PAGE = "/lake/viewer.html?v=3"

const LAKE_SCRIPTS = [
  "/lake/react.production.min.js",
  "/lake/react-dom.production.min.js",
  "/lake/CodeMirror.js",
  "/lake/kitchen.js",
  "/lake/doc.umd.js",
] as const

const LAKE_PRELOAD = [
  "/lake/doc.css",
  "/lake/antd.css",
  ...LAKE_SCRIPTS,
] as const

type LakeDoc = {
  createOpenEditor: (root: HTMLElement, options: object) => unknown
  createOpenViewer: (root: HTMLElement, options: object) => { setDocument: (type: string, content: string) => void }
}

type LakeWindow = Window & { Doc?: LakeDoc }

let lakeRuntime: Promise<LakeDoc> | null = null

function loadLakeScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-lake-src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === "1") { resolve(); return }
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error(`加载失败 ${src}`)), { once: true })
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = false
    script.dataset.lakeSrc = src
    script.addEventListener("load", () => { script.dataset.loaded = "1"; resolve() }, { once: true })
    script.addEventListener("error", () => reject(new Error(`加载失败 ${src}`)), { once: true })
    document.head.appendChild(script)
  })
}

export function ensureLakeStyles() {
  if (typeof document === "undefined") return
  for (const href of ["/lake/doc.css", "/lake/antd.css"] as const) {
    if (document.querySelector(`link[data-lake-style="${href}"]`)) continue
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    link.dataset.lakeStyle = href
    document.head.appendChild(link)
  }
}

export function ensureLakeRuntime() {
  const doc = (window as LakeWindow).Doc
  if (doc?.createOpenViewer) return Promise.resolve(doc)
  if (!lakeRuntime) {
    lakeRuntime = (async () => {
      for (const src of LAKE_SCRIPTS) await loadLakeScript(src)
      const next = (window as LakeWindow).Doc
      if (!next?.createOpenViewer) throw new Error("语雀阅读器加载失败")
      return next
    })()
  }
  return lakeRuntime
}

export function preloadLakeRuntime() {
  if (typeof document === "undefined") return
  for (const href of LAKE_PRELOAD) {
    if (document.querySelector(`link[data-lake-preload="${href}"]`)) continue
    const link = document.createElement("link")
    link.rel = "preload"
    link.as = href.endsWith(".css") ? "style" : "script"
    link.href = href
    link.dataset.lakePreload = href
    document.head.appendChild(link)
  }
}

export function escapeLakeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

type LakeLibraryKind = "image" | "file"
const libraryListeners = new Set<(kind: LakeLibraryKind) => void>()

export function openLakeLibrary(kind: LakeLibraryKind) {
  libraryListeners.forEach((listener) => listener(kind))
}

export function subscribeLakeLibrary(listener: (kind: LakeLibraryKind) => void) {
  libraryListeners.add(listener)
  return () => { libraryListeners.delete(listener) }
}
