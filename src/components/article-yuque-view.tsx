import * as React from "react"
import { toast } from "sonner"

import { assetHref } from "@/lib/api"
import { isLakeDocument, lakeCardAssets, unwrapYuqueBody } from "@/lib/article-format"
import { ensureLakeRuntime } from "@/lib/lake-runtime"
import "@/styles/article-markdown.css"

type LakeViewer = {
  setDocument: (type: string, content: string) => void
}

export type ArticleYuqueViewHandle = {
  findHeading: (title: string) => Element | null
}

const VIEWER_LAYOUT = `
:host { display: block; width: 100%; }
#root, .ne-editor, .ne-editor-wrap, .ne-editor-wrap-content, .ne-editor-outer-wrap-box,
.ne-engine, .ne-engine-view, .ne-viewer {
  height: auto !important;
  min-height: 0 !important;
  background: transparent !important;
}
.ne-ui-toolbar, .toolbar-container, .ne-editor-header { display: none !important; }
ne-h1, ne-h2, ne-h3, ne-h4, ne-h5, ne-h6 { scroll-margin-top: 7rem; }
.ne-layout-mode-fixed .ne-editor-wrap,
.ne-layout-mode-adapt .ne-editor-wrap {
  padding: 0 !important;
  overflow: visible !important;
}
.ne-layout-mode-fixed .ne-engine,
.ne-layout-mode-adapt .ne-engine,
.ne-engine-view, .ne-viewer {
  padding: 0 !important;
  max-width: 100% !important;
  margin: 0 !important;
}
ne-card[data-card-name='file'],
ne-card[data-card-name='localdoc'],
.ne-card-file { cursor: pointer; }
:host(.dark) {
  --lakex-editor-background: transparent;
  --lakex-editor-background-primary: transparent;
  --lakex-editor-text-color: var(--foreground);
  --lakex-editor-text-secondary: var(--muted-foreground);
  --lakex-editor-text-caption: var(--muted-foreground);
  --lakex-editor-text-link: #69b1ff;
}
:host(.dark) .ne-editor,
:host(.dark) .ne-viewer,
:host(.dark) .ne-engine,
:host(.dark) .ne-engine-view,
:host(.dark) .lakex-default-theme {
  color: var(--foreground) !important;
}
:host(.dark) ne-card[data-card-name='file'] .ne-card-file[data-status='done'],
:host(.dark) ne-card[data-card-name='file'] .ne-card-file-name {
  color: #69b1ff !important;
}
`

function applyDocument(viewer: LakeViewer, value: string) {
  const body = unwrapYuqueBody(value).trim()
  if (!body) return
  if (isLakeDocument(body)) viewer.setDocument("text/lake", body)
  else viewer.setDocument("text/html", body)
}

function headingText(node: Element) {
  return (node.querySelector("ne-heading-content")?.textContent || node.textContent || "").replace(/\s+/g, " ").trim()
}

function controlLabel(node: Element) {
  return `${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""} ${node.textContent || ""} ${String((node as HTMLElement).className || "")}`.replace(/\s+/g, " ")
}

function isCopyControl(node: Element) {
  const control = node.closest("button, [role='button'], a, [class*='copy']")
  if (!control) return null
  const label = controlLabel(control).toLowerCase()
  if (!/\bcopy\b|复制/.test(label)) return null
  if (/库|转换|markdown/.test(label)) return null
  return control
}

function codeTextFrom(control: Element) {
  const block = control.closest("ne-card[data-card-name='codeblock'], .ne-codeblock, pre, figure")
  const lines = block?.querySelectorAll(".cm-content .cm-line")
  if (lines?.length) return Array.from(lines, (line) => line.textContent || "").join("\n").replace(/\u00a0/g, " ")
  return (block?.querySelector("pre, code, .ne-codeblock-content, .ne-code-content")?.textContent || "").replace(/\u00a0/g, " ").trim()
}

function copyText(text: string, control?: Element) {
  const value = text.trim()
  if (!value) {
    toast.error("没有可复制的内容")
    return
  }
  void navigator.clipboard.writeText(value).then(
    () => {
      control?.setAttribute("data-copied", "true")
      window.setTimeout(() => control?.removeAttribute("data-copied"), 1500)
      toast.success("已复制")
    },
    () => toast.error("复制失败"),
  )
}

function detachGlobalLakeStyles() {
  document.querySelectorAll("link[data-lake-style]").forEach((node) => node.remove())
}

export const ArticleYuqueView = React.forwardRef<ArticleYuqueViewHandle, { value: string }>(function ArticleYuqueView({ value }, ref) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const viewerRef = React.useRef<LakeViewer | null>(null)
  const valueRef = React.useRef(value)
  valueRef.current = value

  React.useImperativeHandle(ref, () => ({
    findHeading(title: string) {
      const root = rootRef.current
      if (!root || !title) return null
      const want = title.replace(/\s+/g, " ").trim()
      const nodes = root.querySelectorAll("h1,h2,h3,h4,h5,h6,ne-h1,ne-h2,ne-h3,ne-h4,ne-h5,ne-h6")
      for (const node of nodes) {
        if (headingText(node) === want) return node
      }
      return null
    },
  }), [])

  React.useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    detachGlobalLakeStyles()
    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" })
    shadow.replaceChildren()
    for (const href of ["/lake/doc.css", "/lake/antd.css"]) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = href
      shadow.appendChild(link)
    }
    const codeSkin = document.createElement("link")
    codeSkin.rel = "stylesheet"
    codeSkin.href = "/lake/viewer-code.css?v=3"
    shadow.appendChild(codeSkin)
    const skin = document.createElement("style")
    skin.textContent = VIEWER_LAYOUT
    shadow.appendChild(skin)
    const root = document.createElement("div")
    root.id = "root"
    shadow.appendChild(root)
    rootRef.current = root

    function syncTheme() {
      host?.classList.toggle("dark", document.documentElement.classList.contains("dark"))
    }
    syncTheme()
    const themeWatch = new MutationObserver(syncTheme)
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    function onClick(event: Event) {
      const node = event.target as Element | null
      if (!node?.closest) return
      const copyControl = isCopyControl(node)
      if (copyControl) {
        event.preventDefault()
        event.stopPropagation()
        copyText(codeTextFrom(copyControl), copyControl)
        return
      }
      const card = node.closest("ne-card")
      if (!card) return
      const name = (card.getAttribute("data-card-name") || card.getAttribute("name") || "").toLowerCase()
      if (!["file", "localdoc", "attachment", "video"].includes(name)) return
      const assets = lakeCardAssets(valueRef.current)
      const media = card.querySelector("a[href], video[src], source[src]") as HTMLAnchorElement | HTMLVideoElement | HTMLSourceElement | null
      const href = assets.get(card.id)?.src || media?.getAttribute("href") || media?.getAttribute("src") || ""
      if (!href) return
      event.preventDefault()
      event.stopPropagation()
      window.open(assetHref(href), "_blank", "noopener,noreferrer")
      toast.success(name === "video" ? "已打开视频" : "已打开附件")
    }
    shadow.addEventListener("click", onClick, true)

    void ensureLakeRuntime().then((Lake) => {
      if (cancelled || !root.isConnected) return
      const viewer = Lake.createOpenViewer(root, {
        scrollNode: () => document.scrollingElement || document.documentElement,
      })
      viewerRef.current = viewer
      applyDocument(viewer, valueRef.current)
      syncTheme()
    }).catch(() => { /* keep empty */ })

    return () => {
      cancelled = true
      themeWatch.disconnect()
      shadow.removeEventListener("click", onClick, true)
      viewerRef.current = null
      rootRef.current = null
      shadow.replaceChildren()
    }
  }, [])

  React.useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    applyDocument(viewer, value)
  }, [value])

  return <div ref={hostRef} className="article-yuque-view" />
})
