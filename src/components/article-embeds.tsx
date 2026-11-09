import * as React from "react"
import { ArrowUpRight, CalendarDays, ChevronDown, Download, Info, Lightbulb, Lock, TriangleAlert } from "lucide-react"

import { CopyButton } from "@/components/copy-button"
import { FileKindIcon } from "@/components/file-kind-icon"
import { VideoPlayer } from "@/components/video-player"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { assetHref, loadLinkPreview, type LinkPreview } from "@/lib/api"
import { formatDateChip, parseHighlight, type HighlightColor } from "@/lib/article-blocks"
import { parseCallout } from "@/lib/article-callout"
import { fileExtension, fileKindLabel, hrefFileKind, previewMode } from "@/lib/file-kind"

function labelText(label?: React.ReactNode): string {
  if (typeof label === "string" || typeof label === "number") return String(label).trim()
  if (Array.isArray(label)) return label.map(labelText).join("").trim()
  return ""
}

function attachmentName(href: string, label?: React.ReactNode) {
  const text = labelText(label)
  if (text && text !== href) return text
  try {
    return decodeURIComponent(new URL(href, "https://local.invalid").pathname.split("/").pop() || "附件")
  } catch {
    return "附件"
  }
}

export function ArticleMedia({ href, label }: { href: string; label?: React.ReactNode }) {
  const name = attachmentName(href, label)
  const src = assetHref(href)
  const mode = previewMode(name) || previewMode(href)
  if (mode === "video") {
    return <figure className="article-media">
      <VideoPlayer src={src} title={name} />
    </figure>
  }
  if (mode === "audio") {
    return <figure className="article-media article-audio">
      <div className="article-embed">
        <FileKindIcon name={name} className="size-10 shrink-0 rounded-lg" iconClassName="size-5" showLabel={false} />
        <div className="min-w-0 flex-1 space-y-2">
          <strong className="block truncate text-sm font-medium">{name}</strong>
          <audio src={src} controls preload="metadata" className="w-full" />
        </div>
      </div>
    </figure>
  }
  if (mode === "pdf") {
    return <figure className="article-media">
      <iframe src={src} title={name} className="article-pdf-frame" />
      <figcaption className="flex items-center justify-between gap-3">
        <span>{name}</span>
        <a href={src} download={name} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-4">下载 PDF</a>
      </figcaption>
    </figure>
  }
  return <ArticleFileCard href={href} label={label} />
}

export function ArticleFileCard({ href, label }: { href: string; label?: React.ReactNode }) {
  const name = attachmentName(href, label)
  const src = assetHref(href)
  const kind = hrefFileKind(href)
  const ext = fileExtension(name) || fileExtension(href)
  return <div className="article-embed">
    <a href={src} download={name} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-start gap-3 text-inherit no-underline">
      <FileKindIcon name={name} className="size-10 shrink-0 rounded-lg" iconClassName="size-5" showLabel={false} />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-medium">{name}</strong>
        <span className="mt-1 block text-xs text-muted-foreground">{fileKindLabel(kind)}{ext ? ` · ${ext.toUpperCase()}` : ""}</span>
      </span>
    </a>
    <CopyButton text={() => src} size="icon-sm" variant="ghost" className="shrink-0" aria-label="复制附件链接" title="复制链接" />
    <a href={src} download={name} target="_blank" rel="noreferrer" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background/60 hover:text-foreground" aria-label={`下载 ${name}`} title="下载">
      <Download className="size-4" />
    </a>
  </div>
}

export function ArticleLinkCard({ href, label }: { href: string; label?: React.ReactNode }) {
  const url = React.useMemo(() => { try { return new URL(href) } catch { return null } }, [href])
  const fallbackTitle = labelText(label)
  const [preview, setPreview] = React.useState<LinkPreview | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    if (!url) return
    const controller = new AbortController()
    loadLinkPreview(url.href, controller.signal)
      .then(setPreview)
      .catch(() => setFailed(true))
    return () => controller.abort()
  }, [url])

  if (!url) return null
  const title = preview?.title || (fallbackTitle && fallbackTitle !== href ? fallbackTitle : url.hostname.replace(/^www\./, ""))
  const description = preview?.description || ""
  const icon = preview?.icon || `${url.origin}/favicon.ico`
  const image = preview?.image || ""
  return <a className="article-embed article-link-embed group" href={url.href} target="_blank" rel="noreferrer">
    {image ? <img src={image} alt="" className="article-link-thumb" /> : <img src={icon} alt="" className="article-link-icon" onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none" }} />}
    <span className="min-w-0 flex-1">
      <strong className="block truncate text-sm font-medium">{title}</strong>
      {description && <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{description}</span>}
      <span className="mt-1 block truncate text-xs text-muted-foreground">{preview?.siteName || url.hostname}</span>
    </span>
    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    {!preview && !failed && <span className="sr-only">正在读取链接信息</span>}
  </a>
}

export function ArticleCopyPanel({ text }: { text: string }) {
  return (
    <div className="article-copy-panel">
      <div className="article-block-head">
        <span>复制</span>
        <CopyButton text={text} size="icon-xs" variant="ghost" className="ml-auto" aria-label="复制文本" title="复制文本" />
      </div>
      <pre><code>{text}</code></pre>
    </div>
  )
}

export function ArticleDateChip({ iso }: { iso: string }) {
  return (
    <p className="article-date-chip">
      <CalendarDays className="size-3.5" aria-hidden="true" />
      <time dateTime={iso}>{formatDateChip(iso)}</time>
    </p>
  )
}

export function ArticleHighlight({ color, children }: { color: HighlightColor; children?: React.ReactNode }) {
  const text = children ?? ""
  return <div className={`article-highlight article-highlight-${color}`}>{typeof text === "string" ? text : children}</div>
}

export function ArticleFoldBlock({ title, body }: { title: string; body: string }) {
  return (
    <details className="article-fold">
      <summary>
        <ChevronDown className="article-fold-chevron" aria-hidden="true" />
        <span>{title}</span>
      </summary>
      <div className="article-fold-body">{body.trim() ? body.split("\n").map((line, index) => <p key={index}>{line || "\u00a0"}</p>) : <p className="text-muted-foreground">暂无内容</p>}</div>
    </details>
  )
}

export function ArticleLockBlock({ password, body }: { password: string; body: string }) {
  const [unlocked, setUnlocked] = React.useState(!password)
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState("")

  if (!unlocked) {
    return (
      <div className="article-lock">
        <div className="article-block-head">
          <Lock className="size-3.5" aria-hidden="true" />
          <span>加密内容</span>
        </div>
        <form
          className="article-lock-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (value === password) {
              setUnlocked(true)
              setError("")
            } else setError("密码不正确")
          }}
        >
          <p>该内容已加密，请输入密码查看</p>
          <input type="password" value={value} onChange={(event) => setValue(event.target.value)} placeholder="输入密码" autoComplete="off" />
          <button type="submit">查看</button>
          {error && <span>{error}</span>}
        </form>
      </div>
    )
  }

  return (
    <div className="article-lock is-open">
      <div className="article-block-head">
        <Lock className="size-3.5" aria-hidden="true" />
        <span>{password ? "已解锁" : "密码块"}</span>
      </div>
      <pre><code>{body}</code></pre>
    </div>
  )
}

function nodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join("\n")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return nodeText(node.props.children)
  return ""
}

const calloutIcons = {
  note: Info,
  tip: Lightbulb,
  important: Info,
  warning: TriangleAlert,
  caution: TriangleAlert,
} as const

export function ArticleQuote({ children }: { children: React.ReactNode }) {
  const text = nodeText(children)
  const highlight = parseHighlight(text)
  if (highlight) {
    const lines = highlight.body.split("\n").filter((line) => line.trim())
    return <div className={`article-highlight article-highlight-${highlight.color}`}>{lines.map((line, index) => <p key={index}>{line}</p>)}</div>
  }
  const parsed = parseCallout(text)
  if (!parsed) return <blockquote>{children}</blockquote>
  const Icon = calloutIcons[parsed.kind]
  return <Alert className={`article-callout article-callout-${parsed.kind}`}>
    <Icon className="size-4" />
    <AlertTitle>{parsed.label}</AlertTitle>
    <AlertDescription>
      {parsed.body.split("\n").filter((line) => line.trim()).map((line, index) => <p key={index}>{line}</p>)}
    </AlertDescription>
  </Alert>
}
