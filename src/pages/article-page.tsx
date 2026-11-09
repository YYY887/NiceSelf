import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Link, useParams } from "react-router"
import { CalendarDays, CalendarClock, ChevronDown } from "lucide-react"

import { ArticleToc } from "@/components/article-toc"
import { ImageLightbox } from "@/components/image-lightbox"
import { ArticleCopyPanel, ArticleFileCard, ArticleLinkCard, ArticleMedia, ArticleQuote } from "@/components/article-embeds"
import { ArticleYuqueView, type ArticleYuqueViewHandle } from "@/components/article-yuque-view"
import { isArticleAttachment, isCompleteHttpUrl } from "@/lib/article-links"
import { previewMode } from "@/lib/file-kind"
import { BlogShell } from "@/components/blog-shell"
import { CopyButton } from "@/components/copy-button"
import { PageEnter } from "@/components/reveal"
import { PageFallback } from "@/components/page-fallback"
import { ArticleComments } from "@/components/article-comments"
import CodeBlock from "@/components/ui/code-block"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { api, assetHref, type ArticleRecord } from "@/lib/api"
import { articleHeadings, remarkArticleHeadingIds, type ArticleHeading } from "@/lib/article-headings"
import { articleDisplayMarkdown, isYuqueBody, yuqueHeadings } from "@/lib/article-format"
import { useSiteContent } from "@/lib/site-content"
import "@/styles/article-markdown.css"

export function MarkdownBody({ markdown, highlightedId, globalHeadings, lineOffset = 0 }: { markdown: string; highlightedId?: string; globalHeadings?: ArticleHeading[]; lineOffset?: number }) {
  const headings = articleHeadings(markdown).map((heading) => {
    const original = globalHeadings?.find((item) => item.line === heading.line + lineOffset)
    return original ? { ...heading, id: original.id, href: original.href } : heading
  })
  const renderHeading = (level: number, children: React.ReactNode, id?: string) => {
    const className = `scroll-mt-28 ${highlightedId === id ? "toc-jump-flash" : ""}`
    if (level === 1) return <h1 id={id} className={className}>{children}</h1>
    if (level === 2) return <h2 id={id} className={className}>{children}</h2>
    if (level === 3) return <h3 id={id} className={className}>{children}</h3>
    if (level === 4) return <h4 id={id} className={className}>{children}</h4>
    if (level === 5) return <h5 id={id} className={className}>{children}</h5>
    return <h6 id={id} className={className}>{children}</h6>
  }
  return (
    <div className="article-markdown max-w-2xl min-w-0 text-base leading-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkArticleHeadingIds, headings]]}
        components={{
          h1: ({ children, node }) => renderHeading(1, children, String(node?.properties?.id || "")),
          h2: ({ children, node }) => renderHeading(2, children, String(node?.properties?.id || "")),
          h3: ({ children, node }) => renderHeading(3, children, String(node?.properties?.id || "")),
          h4: ({ children, node }) => renderHeading(4, children, String(node?.properties?.id || "")),
          h5: ({ children, node }) => renderHeading(5, children, String(node?.properties?.id || "")),
          h6: ({ children, node }) => renderHeading(6, children, String(node?.properties?.id || "")),
          blockquote: ({ children }) => <ArticleQuote>{children}</ArticleQuote>,
          p: ({ children }) => {
            const nodes = React.Children.toArray(children).filter((child) => typeof child !== "string" || child.trim())
            const only = nodes[0]
            if (nodes.length === 1 && React.isValidElement<{ href?: string; children?: React.ReactNode }>(only) && only.props.href) {
              const href = only.props.href
              const name = typeof only.props.children === "string" ? only.props.children : href
              if (previewMode(name) || previewMode(href)) return <ArticleMedia href={href} label={only.props.children} />
              if (isArticleAttachment(href)) return <ArticleFileCard href={href} label={only.props.children} />
              if (isCompleteHttpUrl(href)) return <ArticleLinkCard href={href} label={only.props.children} />
            }
            return <p>{children}</p>
          },
          a: ({ href, children }) => href && isArticleAttachment(href)
            ? <a href={assetHref(href)} download target="_blank" rel="noreferrer" className="underline underline-offset-4">{children}</a>
            : <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4">{children}</a>,
          img: ({ src, alt, title }) => {
            const hasSize = Boolean(alt && /^(?:0?\.\d{1,2}|1(?:\.0{1,2})?)$/.test(alt))
            const ratio = hasSize ? Number(alt) : 0.6
            const width = Math.round(Math.max(0.2, Math.min(1, ratio)) * 100)
            const imageAlt = title || (hasSize ? "文章图片" : alt || "文章图片")
            return <ImageLightbox src={src || ""} alt={imageAlt} className="w-full"><img src={src} alt={imageAlt} className="mx-auto my-6 h-auto max-w-full rounded-xl" style={{ width: `${width}%` }} /></ImageLightbox>
          },
          table: ({ children }) => <div className="table-wrap"><table>{children}</table></div>,
          pre: ({ children }) => {
            const code = React.Children.toArray(children).find(React.isValidElement) as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined
            const language = /language-([\w-]+)/.exec(code?.props.className || "")?.[1] || "text"
            if (language === "copy" || language === "copytext") return <ArticleCopyPanel text={String(code?.props.children ?? "").replace(/\n$/, "")} />
            return <CodeBlock className="my-6 w-full" code={String(code?.props.children ?? "").replace(/\n$/, "")} language={language} filename={language === "text" ? undefined : `example.${language === "typescript" ? "ts" : language}`} />
          },
          code: ({ className, children }) => <code className={className}>{children}</code>,
        }}
      >{markdown}</ReactMarkdown>
    </div>
  )
}

export function ArticlePage() {
  const { slug } = useParams()
  const { articles, categories } = useSiteContent()
  const summary = articles.find((item) => item.slug === slug)
  const [fetched, setFetched] = React.useState<{ slug: string; article: ArticleRecord | null } | null>(null)
  const [highlightedId, setHighlightedId] = React.useState("")
  const [sectionOverrides, setSectionOverrides] = React.useState<Map<string, boolean>>(() => new Map())
  const highlightTimer = React.useRef<number | undefined>(undefined)
  const yuqueRef = React.useRef<ArticleYuqueViewHandle>(null)

  React.useEffect(() => () => window.clearTimeout(highlightTimer.current), [])

  function highlight(id: string) {
    setHighlightedId("")
    window.clearTimeout(highlightTimer.current)
    window.requestAnimationFrame(() => {
      setHighlightedId(id)
      highlightTimer.current = window.setTimeout(() => setHighlightedId(""), 2300)
    })
  }

  React.useEffect(() => {
    if (!slug) return
    const controller = new AbortController()
    api<ArticleRecord>(`/articles/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((item) => setFetched({ slug, article: item }))
      .catch(() => setFetched({ slug, article: summary ?? null }))
    return () => controller.abort()
  }, [slug, summary])

  const article = fetched && fetched.slug === slug ? fetched.article : summary
  const yuque = isYuqueBody(article?.markdown || "")
  const displayMarkdown = React.useMemo(() => articleDisplayMarkdown(article?.markdown || ""), [article?.markdown])
  const headings = React.useMemo(
    () => yuque ? yuqueHeadings(article?.markdown || "") : articleHeadings(article?.markdown || ""),
    [article?.markdown, yuque],
  )
  const getTocTarget = React.useCallback((id: string) => {
    const title = headings.find((heading) => heading.id === id)?.title || ""
    return yuqueRef.current?.findHeading(title) || null
  }, [headings])
  const sections = React.useMemo(() => {
    const lines = displayMarkdown.split(/\r?\n/)
    const roots = headings.filter((heading) => heading.level === 2)
    return {
      intro: roots.length ? lines.slice(0, roots[0].line - 1).join("\n") : lines.join("\n"),
      parts: roots.map((heading, index) => ({
        heading,
        body: lines.slice(heading.line, roots[index + 1] ? roots[index + 1].line - 1 : lines.length).join("\n"),
      })),
    }
  }, [displayMarkdown, headings])

  function isSectionOpen(id: string) {
    return sectionOverrides.get(`${slug}:${id}`) ?? true
  }

  function toggleSection(id: string) {
    setSectionOverrides((current) => {
      const next = new Map(current)
      next.set(`${slug}:${id}`, !(current.get(`${slug}:${id}`) ?? true))
      return next
    })
  }

  function openSectionFor(id: string) {
    if (yuque) {
      highlight(id)
      return
    }
    const target = headings.findIndex((heading) => heading.id === id)
    if (target < 0) return
    const parent = headings.slice(0, target + 1).reverse().find((heading) => heading.level === 2)
    if (parent) setSectionOverrides((current) => new Map(current).set(`${slug}:${parent.id}`, true))
    highlight(id)
  }
  if (!article && fetched?.slug !== slug) return <BlogShell><PageFallback className="pt-10" /></BlogShell>
  if (!article) return <BlogShell><main className="mx-auto flex min-h-[70svh] max-w-3xl flex-col gap-6 px-6 pt-16"><h1 className="text-4xl font-semibold">文章不存在</h1><Button variant="outline" asChild><Link to="/blog">返回博客</Link></Button></main></BlogShell>

  const category = categories.find((topic) => topic.slug === article.category)
  return (
    <BlogShell>
      <PageEnter>
      <main className="px-6 pt-10 pb-24 sm:px-8 lg:pt-16">
        <article className="mx-auto max-w-5xl">
          <header className="flex max-w-2xl flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" />发布于 <time dateTime={article.date}>{article.date}</time></span>
              <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5" aria-hidden="true" />更新于 {article.updatedAt ? article.updatedAt.slice(0, 10) : article.date}</span>
            </div>
            <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{article.title}</h1>
            <p className="text-base leading-relaxed text-muted-foreground">{article.summary}</p>
            <div className="flex flex-wrap items-center gap-2"><CopyButton text={() => `# ${article.title}\n\n${displayMarkdown}`} variant="outline" size="sm" aria-label="复制文章全文">复制 Markdown</CopyButton><Badge variant="outline">{category?.name ?? "文章"}</Badge>{article.tags.map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}</div>
          </header>
          <Separator className="my-10" />
          <div className="grid gap-0 lg:grid-cols-[minmax(0,42rem)_minmax(12rem,1fr)] lg:gap-16">
            <div className="order-2 min-w-0 lg:order-1">{yuque ? <ArticleYuqueView ref={yuqueRef} value={article.markdown} /> : <div className="article-markdown max-w-2xl min-w-0 text-base leading-8">{sections.intro.trim() && <MarkdownBody markdown={sections.intro} highlightedId={highlightedId} globalHeadings={headings} />}{sections.parts.map(({ heading, body }) => <section key={heading.id} className="article-reading-section"><h2 id={heading.id} className={`scroll-mt-28 ${highlightedId === heading.id ? "toc-jump-flash" : ""}`}><button type="button" aria-expanded={isSectionOpen(heading.id)} aria-controls={`section-${heading.id}`} onClick={() => toggleSection(heading.id)} className="flex w-full items-center justify-between gap-3 text-left"><span>{heading.title}</span><ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${isSectionOpen(heading.id) ? "" : "-rotate-90"}`} aria-hidden="true" /></button></h2><div id={`section-${heading.id}`} hidden={!isSectionOpen(heading.id)}>{isSectionOpen(heading.id) && <MarkdownBody markdown={body} highlightedId={highlightedId} globalHeadings={headings} lineOffset={heading.line} />}</div></section>)}</div>}<ArticleComments articleSlug={article.slug} /></div>
            <div className="order-1 lg:order-2 min-w-0"><ArticleToc key={article.slug} items={headings} onNavigate={openSectionFor} getTarget={yuque ? getTocTarget : undefined} /></div>
          </div>
        </article>
      </main>
      </PageEnter>
    </BlogShell>
  )
}
