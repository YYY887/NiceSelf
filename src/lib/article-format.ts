import { marked } from "marked"
import TurndownService from "turndown"

import { articleHeadings, headingId, type ArticleHeading } from "@/lib/article-headings"

export type ArticleEditorMode = "yuque" | "markdown"

export const YUQUE_PREFIX = "<!--editor:yuque-->"

const MODE_KEY = "qianqiu:article-editor-mode"

marked.setOptions({ gfm: true, breaks: false })

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
})

export function readArticleEditorMode(): ArticleEditorMode {
  try {
    const value = localStorage.getItem(MODE_KEY)
    if (value === "markdown" || value === "yuque") return value
  } catch { /* ignore */ }
  return "yuque"
}

export function writeArticleEditorMode(mode: ArticleEditorMode) {
  try { localStorage.setItem(MODE_KEY, mode) } catch { /* ignore */ }
}

export function isLakeDocument(text: string) {
  const value = text.trimStart().toLowerCase()
  return value.startsWith("<!doctype lake") || value.includes("data-lakeid") || /name="doc-version"/i.test(text.slice(0, 800))
}

export function isYuqueBody(text: string) {
  const value = text.trimStart()
  return value.startsWith(YUQUE_PREFIX) || isLakeDocument(value)
}

export function unwrapYuqueBody(text: string) {
  return text.replace(new RegExp(`^${YUQUE_PREFIX}\\s*`), "")
}

export function wrapYuqueBody(content: string) {
  return `${YUQUE_PREFIX}\n${unwrapYuqueBody(content).trim()}`
}

export function unwrapArticleBody(text: string) {
  if (isYuqueBody(text)) return { mode: "yuque" as const, content: unwrapYuqueBody(text) }
  return { mode: "markdown" as const, content: text }
}

export function editorModeForArticle(markdown: string): ArticleEditorMode {
  if (isYuqueBody(markdown)) return "yuque"
  if (markdown.trim()) return "markdown"
  return readArticleEditorMode()
}

export function markdownToHtml(markdown: string) {
  const html = marked.parse(markdown || "", { async: false })
  return typeof html === "string" ? html : ""
}

function attr(source: string, name: string) {
  return new RegExp(`(?:^|\\s)${name}="([^"]*)"`, "i").exec(source)?.[1] || ""
}

function decodeLakeValue(raw: string): Record<string, unknown> {
  const payload = raw.replace(/^data:(?:application\/json,)?/i, "")
  if (!payload) return {}
  try { return JSON.parse(decodeURIComponent(payload)) as Record<string, unknown> } catch { /* ignore */ }
  try { return JSON.parse(payload) as Record<string, unknown> } catch { return {} }
}

function lakeText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

function markdownLink(label: string, href: string) {
  const name = (label || "附件").replace(/[[\]()]/g, " ").trim() || "附件"
  return `[${name}](${href})`
}

function lakeCardToMarkdown(attrs: string) {
  const name = attr(attrs, "name").toLowerCase()
  const data = decodeLakeValue(attr(attrs, "value"))
  const src = lakeText(data.src || data.url || data.href || (data.original as { src?: string } | undefined)?.src)
  const title = lakeText(data.name || data.title || data.fileName || data.label) || src.split("/").pop() || "附件"
  if (name === "image" && src) {
    const width = Number(data.width) || 0
    const origin = Number(data.originWidth) || width
    const ratio = origin > 0 && width > 0 ? Math.max(0.2, Math.min(1, width / origin)) : 0.6
    const alt = Number.isFinite(ratio) ? ratio.toFixed(2) : "0.60"
    return `\n\n![${alt}](${src} "${title.replace(/"/g, "")}")\n\n`
  }
  if ((name === "file" || name === "localdoc" || name === "attachment") && src) return `\n\n${markdownLink(title, src)}\n\n`
  if ((name === "video" || name === "audio") && src) return `\n\n${markdownLink(title, src)}\n\n`
  if (name === "bookmark" || name === "thirdparty" || name === "yuque") return src ? `\n\n${markdownLink(title || src, src)}\n\n` : ""
  if (name === "codeblock" || name === "code") {
    const language = lakeText(data.mode || data.language || data.syntax) || "text"
    const code = String(data.code || data.value || data.text || "").replace(/\n$/, "")
    return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`
  }
  if (name === "hr") return "\n\n---\n\n"
  if (name === "label") return lakeText(data.label || title)
  if (name === "math") return String(data.code || data.src || data.value || "")
  return src ? `\n\n${markdownLink(title, src)}\n\n` : ""
}

export function lakeToMarkdown(raw: string) {
  let html = unwrapYuqueBody(raw)
    .replace(/<!doctype lake[^>]*>/i, "")
    .replace(/<meta[^>]*>/gi, "")
    .trim()
  if (!html) return ""
  html = html.replace(/<card\b([^>]*)>(?:[\s\S]*?)<\/card>/gi, (_full, attrs: string) => lakeCardToMarkdown(attrs))
  html = html.replace(/<card\b([^>]*)\/?>/gi, (_full, attrs: string) => lakeCardToMarkdown(attrs))
  html = html.replace(/<heading\b([^>]*)>([\s\S]*?)<\/heading>/gi, (_full, attrs: string, inner: string) => {
    const level = attr(attrs, "level") || "2"
    return `<h${level}>${inner}</h${level}>`
  })
  html = html.replace(/<\/?ne-[a-z0-9-]+\b[^>]*>/gi, "")
  return turndown.turndown(html).replace(/\n{3,}/g, "\n\n").trim()
}

export function htmlToMarkdown(html: string) {
  if (isYuqueBody(html) || isLakeDocument(html) || /<card\b/i.test(html)) return lakeToMarkdown(html)
  const cleaned = html.replace(/<!doctype lake[^>]*>/i, "").replace(/<meta[^>]*>/gi, "").trim()
  if (!cleaned) return ""
  return turndown.turndown(cleaned).trim()
}

export function articleDisplayMarkdown(body: string) {
  return isYuqueBody(body) ? lakeToMarkdown(body) : body
}

export function lakeCardAssets(raw: string) {
  const cards = new Map<string, { name: string; src: string; title: string }>()
  unwrapYuqueBody(raw).replace(/<card\b([^>]*)>/gi, (_full, attrs: string) => {
    const name = attr(attrs, "name").toLowerCase()
    const data = decodeLakeValue(attr(attrs, "value"))
    const src = lakeText(data.src || data.url || data.href || (data.original as { src?: string } | undefined)?.src)
    const id = lakeText(data.id)
    const title = lakeText(data.name || data.title || data.fileName)
    if (id && src) cards.set(id, { name, src, title })
    return ""
  })
  return cards
}

function pushHeading(found: ArticleHeading[], used: Map<string, number>, level: number, raw: string, line: number) {
  const title = raw.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
  if (!title) return
  const base = headingId(title) || "section"
  const occurrence = used.get(base) || 0
  used.set(base, occurrence + 1)
  const id = occurrence ? `${base}-${occurrence + 1}` : base
  found.push({ title, id, href: `#${id}`, level, line })
}

export function yuqueHeadings(content: string): ArticleHeading[] {
  const found: ArticleHeading[] = []
  const used = new Map<string, number>()
  const source = unwrapYuqueBody(content)
  let line = 1
  const html = /<(?:h|ne-h)([1-6])\b[^>]*>([\s\S]*?)<\/(?:h|ne-h)\1>/gi
  let match: RegExpExecArray | null
  while ((match = html.exec(source))) {
    pushHeading(found, used, Number(match[1]), match[2], line)
    line += 1
  }
  const lake = /<heading\b[^>]*\blevel="([1-6])"[^>]*>([\s\S]*?)<\/heading>/gi
  while ((match = lake.exec(source))) {
    pushHeading(found, used, Number(match[1]), match[2], line)
    line += 1
  }
  return found
}

export function articleBodyHeadings(body: string) {
  return articleHeadings(articleDisplayMarkdown(body))
}

export function bodyForEditor(mode: ArticleEditorMode, stored: string) {
  const parsed = unwrapArticleBody(stored)
  if (mode === "yuque") {
    if (parsed.mode === "yuque") return parsed.content
    return markdownToHtml(parsed.content)
  }
  if (parsed.mode === "markdown") return parsed.content
  return htmlToMarkdown(parsed.content)
}

export function storeEditorBody(mode: ArticleEditorMode, content: string) {
  return mode === "yuque" ? wrapYuqueBody(content) : content
}
