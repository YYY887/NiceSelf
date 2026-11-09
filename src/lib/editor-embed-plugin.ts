import { Plugin, PluginKey } from "@milkdown/kit/prose/state"
import type { Node } from "@milkdown/kit/prose/model"
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view"
import { $prose } from "@milkdown/kit/utils"

import { isArticleAttachment, isCompleteHttpUrl } from "@/lib/article-links"
import { formatDateChip, parseDateToken, parseHighlight } from "@/lib/article-blocks"
import { parseCallout } from "@/lib/article-callout"
import { assetHref, loadLinkPreview } from "@/lib/api"
import { fileExtension, fileKindLabel, hrefFileKind, previewMode } from "@/lib/file-kind"
import { createVideoPlayer } from "@/lib/video-player"

const key = new PluginKey("ARTICLE_EMBEDS")
const previewCache = new Map<string, { title: string; description: string; icon: string; image: string; siteName: string }>()
const markerPattern = /\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|HL|HIGHLIGHT)(?::\w+)?\]/i

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
}

function loneLink(node: Node) {
  let href = ""
  let label = ""
  let bits = 0
  node.forEach((child) => {
    if (child.type.name === "hardbreak") return
    if (child.isText) {
      const text = child.text || ""
      const link = child.marks.find((mark) => mark.type.name === "link")
      if (link) {
        bits += 1
        href = String(link.attrs.href || "")
        label = text
        return
      }
      if (text.trim()) bits += 2
      return
    }
    bits += 2
  })
  if (bits === 1 && href) return { href, label: label.trim() || href }
  const text = node.textContent.trim()
  if (node.childCount === 1 && node.firstChild?.isText && isCompleteHttpUrl(text)) return { href: text, label: text }
  return null
}

function fillLinkCard(wrap: HTMLElement, href: string, fallback: string) {
  let host = href
  try { host = new URL(href).hostname } catch { /* keep href */ }
  const cached = previewCache.get(href)
  const title = cached?.title || fallback
  const description = cached?.description || ""
  const icon = cached?.icon || ""
  const image = cached?.image || ""
  const site = cached?.siteName || host
  wrap.innerHTML = `${image ? `<img src="${escapeAttr(image)}" alt="" class="editor-link-thumb">` : icon ? `<img src="${escapeAttr(icon)}" alt="" class="editor-link-icon">` : ""}<span class="editor-embed-copy"><strong>${escapeText(title)}</strong>${description ? `<span class="editor-embed-desc">${escapeText(description)}</span>` : ""}<span class="editor-embed-meta">${escapeText(site)}</span></span>`
}

function createWidget(href: string, label: string) {
  const wrap = document.createElement("div")
  wrap.className = "editor-embed-preview"
  wrap.contentEditable = "false"
  wrap.style.display = "block"
  wrap.style.width = "100%"
  wrap.addEventListener("mousedown", (event) => {
    if ((event.target as HTMLElement).closest("video, audio, iframe, a, button, .site-player, input, .site-player-full")) {
      event.stopPropagation()
      return
    }
    event.preventDefault()
  })

  const src = assetHref(href)
  const mode = previewMode(label) || previewMode(href)
  if (mode === "video") {
    wrap.append(createVideoPlayer(src, { title: label }))
    return wrap
  }
  if (mode === "audio") {
    wrap.classList.add("article-embed")
    wrap.innerHTML = `<span class="editor-file-badge">${escapeText((fileExtension(label) || "AUDIO").toUpperCase())}</span><span class="editor-embed-copy"><strong>${escapeText(label)}</strong><audio src="${escapeAttr(src)}" controls preload="metadata"></audio></span>`
    return wrap
  }
  if (mode === "pdf") {
    wrap.innerHTML = `<iframe src="${escapeAttr(src)}" title="${escapeAttr(label)}" class="editor-pdf-frame"></iframe><span class="editor-embed-caption">${escapeText(label)}</span>`
    return wrap
  }
  if (isArticleAttachment(href)) {
    wrap.classList.add("article-embed")
    const kind = hrefFileKind(href)
    const ext = (fileExtension(label) || fileExtension(href)).toUpperCase()
    wrap.innerHTML = `<span class="editor-file-badge">${escapeText(ext || "FILE")}</span><span class="editor-embed-copy"><strong>${escapeText(label)}</strong><span class="editor-embed-meta">${escapeText(fileKindLabel(kind))}${ext ? ` · ${ext}` : ""}</span></span>`
    return wrap
  }
  wrap.classList.add("article-embed")
  fillLinkCard(wrap, href, label === href ? href : label)
  if (!previewCache.has(href)) {
    loadLinkPreview(href)
      .then((data) => {
        previewCache.set(href, data)
        if (wrap.isConnected) fillLinkCard(wrap, href, label)
      })
      .catch(() => {})
  }
  return wrap
}

function decorationsFor(doc: Node) {
  const decorations: Decoration[] = []
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const match = markerPattern.exec(node.text)
      if (match?.index != null) {
        decorations.push(Decoration.inline(pos + match.index, pos + match.index + match[0].length, { class: "editor-callout-marker" }))
      }
    }
    if (node.type.name === "code_block") {
      const language = String(node.attrs.language || "").toLowerCase()
      if (language) decorations.push(Decoration.node(pos, pos + node.nodeSize, { "data-language": language }))
    }
    if (node.type.name === "blockquote") {
      const highlight = parseHighlight(node.textContent)
      if (highlight) {
        decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: `editor-highlight editor-highlight-${highlight.color}` }))
        const lead = node.firstChild
        if (lead?.type.name === "paragraph" && parseHighlight(lead.textContent)?.body === "") {
          decorations.push(Decoration.node(pos + 1, pos + 1 + lead.nodeSize, { class: "editor-callout-lead" }))
        }
      } else {
        const parsed = parseCallout(node.textContent)
        if (parsed) {
          decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: `editor-callout editor-callout-${parsed.kind}`, "data-callout": parsed.kind }))
          const lead = node.firstChild
          if (lead?.type.name === "paragraph" && parseCallout(lead.textContent)?.body === "") {
            decorations.push(Decoration.node(pos + 1, pos + 1 + lead.nodeSize, { class: "editor-callout-lead" }))
          }
        }
      }
    }
    if (node.type.name === "table") return false
    if (node.type.name === "paragraph") {
      const date = parseDateToken(node.textContent)
      if (date) {
        decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: "editor-has-date" }))
        decorations.push(Decoration.widget(pos + node.nodeSize, () => {
          const chip = document.createElement("p")
          chip.className = "article-date-chip editor-date-chip"
          chip.contentEditable = "false"
          chip.innerHTML = `<span class="editor-date-icon" aria-hidden="true"></span><time datetime="${escapeAttr(date)}">${escapeText(formatDateChip(date))}</time>`
          return chip
        }, { key: `date:${date}:${pos}`, side: -1, ignoreSelection: true }))
        return
      }
      const embed = loneLink(node)
      if (!embed) return
      const media = Boolean(previewMode(embed.label) || previewMode(embed.href))
      const file = isArticleAttachment(embed.href)
      const site = isCompleteHttpUrl(embed.href)
      if (!media && !file && !site) return
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: media ? "editor-has-embed editor-has-embed-media" : "editor-has-embed" }))
      decorations.push(Decoration.widget(pos + node.nodeSize, () => createWidget(embed.href, embed.label), { key: `embed:${embed.href}:${embed.label}`, side: -1, ignoreSelection: true }))
    }
  })
  return DecorationSet.create(doc, decorations)
}

export const editorEmbedPlugin = $prose(() => new Plugin({
  key,
  props: {
    decorations: (state) => decorationsFor(state.doc),
  },
}))
