import type { SiteContent } from "@/lib/api"
import { fileKind, fileKindLabel, type FileKind } from "@/lib/file-kind"

/** 一个文件被哪些文章、项目引用。 */
export type FileUsage = { articles: { slug: string; title: string }[]; projects: { slug: string; title: string }[] }

/** 列表顶部的快捷分类。 */
export type FileGroup = "all" | "image" | "media" | "document" | "other" | "unused"

export const fileGroups: { id: FileGroup; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "image", label: "图片" },
  { id: "media", label: "音视频" },
  { id: "document", label: "文档" },
  { id: "other", label: "其他" },
  { id: "unused", label: "未使用" },
]

export function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function byteTotal(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function inGroup(kind: FileKind, group: FileGroup) {
  if (group === "all" || group === "unused") return true
  if (group === "image") return kind === "image"
  if (group === "media") return kind === "video" || kind === "audio"
  if (group === "document") return kind === "pdf" || kind === "document" || kind === "spreadsheet" || kind === "presentation" || kind === "text"
  return kind === "archive" || kind === "code" || kind === "other"
}

export function kindLabel(name: string, mime: string) {
  return fileKindLabel(fileKind(name, mime))
}

/**
 * 扫描所有文章正文与项目的封面、Logo、截图、视频字段，记录每个上传地址被谁引用。
 * 只做字符串匹配，因此后台按地址插入的图片、正文里的裸链接都能识别。
 */
export function collectFileUsage(content: SiteContent | null) {
  const usage = new Map<string, FileUsage>()
  const hit = (url: string) => {
    const value = (url || "").trim()
    if (!value) return null
    let entry = usage.get(value)
    if (!entry) {
      entry = { articles: [], projects: [] }
      usage.set(value, entry)
    }
    return entry
  }
  for (const article of content?.articles || []) {
    const found = new Set<string>()
    const text = article.markdown || ""
    for (const match of text.matchAll(/\/api\/uploads\/[A-Za-z0-9._-]+/g)) found.add(match[0])
    for (const match of text.matchAll(/https?:\/\/[^\s)\]"'<>]+/g)) found.add(match[0])
    for (const url of found) {
      const entry = hit(url)
      if (entry && !entry.articles.some((item) => item.slug === article.slug)) entry.articles.push({ slug: article.slug, title: article.title })
    }
  }
  for (const project of content?.projects || []) {
    const found = new Set<string>([project.coverUrl, project.logoUrl, ...(project.screenshots || []), ...(project.videos || [])])
    for (const url of found) {
      const entry = hit(url)
      if (entry && !entry.projects.some((item) => item.slug === project.slug)) entry.projects.push({ slug: project.slug, title: project.title })
    }
  }
  return usage
}

export function usedByLabel(usage: FileUsage | undefined) {
  if (!usage) return ""
  return [usage.articles.length ? `${usage.articles.length} 篇文章` : "", usage.projects.length ? `${usage.projects.length} 个项目` : ""].filter(Boolean).join("、")
}

/** 删除前说明这个文件被谁用着，方便先改文章或项目。 */
export function usageDetail(usage: FileUsage | undefined) {
  if (!usage) return ""
  const names = [
    ...usage.articles.slice(0, 3).map((item) => `文章《${item.title}》`),
    ...usage.projects.slice(0, 3).map((item) => `项目「${item.title}」`),
  ]
  const rest = usage.articles.length + usage.projects.length - names.length
  return names.join("、") + (rest > 0 ? ` 等 ${rest} 处` : "")
}

/** 复制给文章用的片段：图片给 Markdown 与 HTML，其他文件给 Markdown 链接。 */
export function snippetFor(item: { url: string; name: string; storedName: string; mime: string }, kind: "url" | "markdown" | "html", href: string, width: number) {
  const isImage = fileKind(item.name, item.mime) === "image"
  const label = item.name.replace(/[[\]]/g, "")
  if (kind === "markdown") return isImage ? `![${label}](${href})` : `[${label}](${href})`
  if (kind === "html") return isImage ? `<img src="${href}" alt="${label}" width="${width}" />` : `<a href="${href}">${label}</a>`
  return href
}
