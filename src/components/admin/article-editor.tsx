import * as React from "react"
import { closestCenter, DndContext } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ArrowLeft, FileUp, ImagePlus, Paperclip, Plus, Search, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ArticleBodyEditor, ArticleEditorModeSwitch } from "@/components/admin/article-body-editor"
import { articleBodyHeadings, editorModeForArticle, type ArticleEditorMode } from "@/lib/article-format"
import { openLakeLibrary } from "@/lib/lake-runtime"
import { cn } from "@/lib/utils"
import { FloatingSaveBar } from "@/components/admin/floating-save-bar"
import { SortableContentRow } from "@/components/admin/sortable-content-row"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api, deleteResource, saveResource, uploadAsset, type ArticleRecord, type CategoryRecord, type TagRecord, type UploadRecord } from "@/lib/api"
import { useLocalEditorDraft } from "@/hooks/use-local-editor-draft"
import { useContentOrder } from "@/hooks/use-content-order"

function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
function emptyArticle(): ArticleRecord { return { id: 0, slug: "", title: "", summary: "", markdown: "", category: "essays", tags: [], status: "draft", date: today(), readingMinutes: 1, sortOrder: 0, createdAt: "", updatedAt: "" } }
function slugify(value: string) { return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "") || `post-${Date.now().toString(36)}` }
function snapshot(article: ArticleRecord) {
  return JSON.stringify({ title: article.title, slug: article.slug, summary: article.summary, markdown: article.markdown, category: article.category, tags: article.tags, status: article.status, date: article.date, readingMinutes: article.readingMinutes })
}

export function ArticleEditor({ articles, categories, tags, uploads, refresh, onLogout }: { articles: ArticleRecord[]; categories: CategoryRecord[]; tags: TagRecord[]; uploads: UploadRecord[]; refresh: () => Promise<void>; onLogout?: () => void }) {
  const draft = useLocalEditorDraft<ArticleRecord>("article", snapshot)
  const { editing, setEditing } = draft
  const [revision, setRevision] = React.useState(0)
  const [editorMode, setEditorMode] = React.useState<ArticleEditorMode>("yuque")
  const [query, setQuery] = React.useState("")
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)
  const order = useContentOrder(articles, "articles", refresh)
  const visible = order.ordered.filter((item) => `${item.title} ${item.summary} ${item.slug}`.toLowerCase().includes(query.toLowerCase()))
  function open(item: ArticleRecord) {
    draft.open({ ...item, tags: [...(item.tags ?? [])] })
    setEditorMode(editorModeForArticle(item.markdown))
    setRevision((v) => v + 1)
    setMessage("")
  }
  function update<K extends keyof ArticleRecord>(key: K, value: ArticleRecord[K]) { setEditing((item) => item ? { ...item, [key]: value } : item) }

  async function save(status: ArticleRecord["status"], latest?: { markdown?: string; title?: string }) {
    if (!editing || busy) return
    const article = { ...editing, ...latest }
    if (!article.title.trim()) { toast.error("请先填写文章标题"); return }
    setBusy(true); setMessage("")
    try { const saved = await saveResource<ArticleRecord>("articles", { ...article, status, slug: article.slug || slugify(article.title) }); draft.markSaved(saved, editing.id); setRevision((v) => v + 1); toast.success(status === "published" ? "文章已保存并发布" : "文章草稿已保存"); await refresh() }
    catch (error) { toast.error(error instanceof Error ? error.message : "保存失败") }
    finally { setBusy(false) }
  }
  React.useEffect(() => {
    if (!editing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void save(editing.status)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })
  async function remove() {
    if (!editing?.id || !window.confirm(`确定删除《${editing.title}》？`)) return
    try { await deleteResource("articles", editing.id); draft.remove(); await refresh(); toast.success("文章已删除") }
    catch (error) { toast.error(error instanceof Error ? error.message : "删除失败") }
  }
  async function importMarkdown(file?: File) {
    if (!file) return
    setBusy(true); setMessage("")
    try { const article = await api<ArticleRecord>("/admin/articles/import", { method: "POST", body: (() => { const form = new FormData(); form.append("file", file); return form })() }); open(article); await refresh(); try { await uploadAsset(file); await refresh(); setMessage("Markdown 已导入为草稿，原文件也已保存到文件库") } catch { setMessage("文章已导入，但原文件未能保存到文件库") } }
    catch (error) { setMessage(error instanceof Error ? error.message : "导入失败") }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = "" }
  }

  const outline = editing ? articleBodyHeadings(editing.markdown) : []
  const yuqueKey = editing && editorMode === "yuque" ? (editing.id > 0 ? String(editing.id) : `new-${revision}`) : "warm"

  const listPage = <div className="space-y-6 px-5 py-8 md:px-8 lg:px-10 lg:py-10">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">文章列表</h2><p className="mt-1 text-sm text-muted-foreground">共 {articles.length} 篇 · 选择文章进入写作台</p></div><div className="flex gap-2"><SidebarTrigger className="md:hidden" /><input ref={fileRef} type="file" accept=".md,text/markdown" className="sr-only" aria-label="导入 Markdown 文件" onChange={(event) => importMarkdown(event.target.files?.[0])} /><Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}><FileUp data-icon="inline-start" />导入 .md</Button><Button onClick={() => open(emptyArticle())}><Plus data-icon="inline-start" />新建文章</Button>{onLogout && <Button size="sm" variant="outline" onClick={onLogout}>退出</Button>}</div></div>
    <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="搜索文章" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <p className="text-xs text-muted-foreground">拖动左侧把手调整文章顺序，松开后自动保存。{query && "清空搜索后可排序。"}</p>
    <DndContext sensors={order.sensors} collisionDetection={closestCenter} onDragEnd={order.onDragEnd}>
      <SortableContext items={visible.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="overflow-hidden rounded-xl border bg-card/80"><Table><TableHeader><TableRow><TableHead className="w-12"><span className="sr-only">排序</span></TableHead><TableHead>标题</TableHead><TableHead className="hidden sm:table-cell">分类</TableHead><TableHead>状态</TableHead><TableHead className="hidden md:table-cell">日期</TableHead><TableHead className="w-20 text-right">操作</TableHead></TableRow></TableHeader><TableBody>{visible.map((item) => <SortableContentRow key={item.id} id={item.id} title={item.title} disabled={Boolean(query) || order.busy} onOpen={() => open(item)}><TableCell><div className="font-medium">{item.title}</div><div className="mt-1 max-w-lg truncate text-xs text-muted-foreground">{item.summary || item.slug}</div></TableCell><TableCell className="hidden sm:table-cell text-muted-foreground">{categories.find((category) => category.slug === item.category)?.name || item.category}</TableCell><TableCell><Badge variant={item.status === "published" ? "secondary" : "outline"}>{item.status === "published" ? "已发布" : "草稿"}</Badge></TableCell><TableCell className="hidden md:table-cell text-muted-foreground">{item.date}</TableCell><TableCell className="text-right text-muted-foreground">继续写作 →</TableCell></SortableContentRow>)}</TableBody></Table>{visible.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">没有找到文章</div>}</div>
      </SortableContext>
    </DndContext>{message && <p role="status" className="text-sm text-destructive">{message}</p>}
  </div>

  function jumpOutline(title: string) {
    if (editorMode === "yuque") {
      const frame = document.querySelector<HTMLIFrameElement>("iframe.article-yuque-frame")
      frame?.contentWindow?.postMessage({ source: "qianqiu-parent", type: "scroll-heading", title }, "*")
      return
    }
    const headings = document.querySelectorAll(".article-visual-editor h1, .article-visual-editor h2, .article-visual-editor h3, .article-visual-editor h4, .article-visual-editor h5, .article-visual-editor h6")
    headings.forEach((node) => {
      if (node.textContent?.replace(/\s+/g, " ").trim() === title) {
        node.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    })
  }

  return <>
    {!editing && listPage}
    <div className={cn("article-studio", (!editing || editorMode === "yuque") && "is-yuque-flush", !editing && "is-warm")} aria-hidden={!editing}>
      {editing && editorMode !== "yuque" && (
        <aside className="article-studio-list">
          <div className="article-studio-list-head">
            <Button variant="ghost" size="sm" onClick={draft.close}><ArrowLeft data-icon="inline-start" />返回</Button>
            <Button size="icon-xs" variant="ghost" aria-label="新建文章" onClick={() => open(emptyArticle())}><Plus /></Button>
          </div>
          <div className="article-studio-docs">
            {(editing.id === 0 ? [editing, ...order.ordered] : order.ordered).map((item) => {
              const active = item.id === editing.id
              const title = (active ? editing.title : item.title).trim() || "无标题文档"
              return <button key={item.id || "new"} type="button" className={active ? "article-studio-doc is-active" : "article-studio-doc"} onClick={() => { if (!active) open(item) }}>{title}</button>
            })}
          </div>
        </aside>
      )}
      <div className="article-studio-canvas">
        {editing && (
          <div className={editorMode === "yuque" ? "article-studio-toolbar is-overlay" : "article-studio-toolbar"}>
            <Button variant="ghost" size="sm" className={editorMode === "yuque" ? "article-studio-back-mobile" : "mr-auto"} onClick={draft.close}><ArrowLeft data-icon="inline-start" />返回</Button>
            {editorMode === "yuque" && <>
              <Button size="sm" variant="ghost" onClick={() => { openLakeLibrary("image"); void refresh() }}><ImagePlus data-icon="inline-start" />图片库</Button>
              <Button size="sm" variant="ghost" onClick={() => { openLakeLibrary("file"); void refresh() }}><Paperclip data-icon="inline-start" />附件库</Button>
            </>}
            <ArticleEditorModeSwitch mode={editorMode} onChange={setEditorMode} />
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}><Settings2 data-icon="inline-start" />设置</Button>
            <Badge variant="outline">{editing.status === "published" ? "已发布" : "草稿"}</Badge>
          </div>
        )}
        <div className={(!editing || editorMode === "yuque") ? "article-studio-page is-yuque" : "article-studio-page is-markdown"}>
          {editing && editorMode === "markdown" ? (
            <div className="article-studio-page-inner">
              <Input aria-label="文章标题" className="article-studio-title shadow-none focus-visible:ring-0 dark:bg-transparent" placeholder="请输入标题" value={editing.title} onChange={(event) => update("title", event.target.value)} />
              <p className="article-studio-hint">直接输入正文，也可使用工具栏或输入 / 插入内容</p>
              <ArticleBodyEditor key={`${editing.id}-${revision}-${editorMode}`} mode={editorMode} title={editing.title} onTitleChange={(title) => update("title", title)} markdown={editing.markdown} onChange={(value) => update("markdown", value)} uploads={uploads} refreshUploads={refresh} />
            </div>
          ) : (
            <ArticleBodyEditor key="yuque-studio" articleKey={yuqueKey} mode="yuque" title={editing?.title ?? ""} onTitleChange={(title) => { if (editing) update("title", title) }} markdown={editing && editorMode === "yuque" ? editing.markdown : ""} onChange={(value) => { if (editing && editorMode === "yuque") update("markdown", value) }} onSave={(markdown, title) => { if (editing) void save(editing.status, { markdown, title }) }} uploads={uploads} refreshUploads={refresh} />
          )}
        </div>
      </div>
      {editing && (
        <aside className="article-studio-outline">
          <div className="article-studio-outline-head">大纲</div>
          <div className="article-studio-outline-list">
            {outline.length === 0 ? <p className="article-studio-outline-empty">添加标题后会显示在这里</p> : outline.map((item) => (
              <button key={item.id} type="button" className="article-studio-outline-item" style={{ paddingLeft: `${0.85 + Math.min(item.level - 1, 4) * 0.7}rem` }} onClick={() => jumpOutline(item.title)}>{item.title}</button>
            ))}
          </div>
        </aside>
      )}
    </div>
    {editing && <>
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>文章设置</SheetTitle>
            <SheetDescription>正文之外的展示信息</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
            <label className="block space-y-2 text-sm font-medium">摘要<Textarea rows={3} value={editing.summary} onChange={(event) => update("summary", event.target.value)} placeholder="简短介绍这篇文章" /></label>
            <label className="block space-y-2 text-sm font-medium">链接标识<Input value={editing.slug} onChange={(event) => update("slug", event.target.value.toLowerCase())} placeholder="默认根据标题生成" /></label>
            <div className="space-y-2 text-sm font-medium"><span>分类</span><Select value={editing.category} onValueChange={(value) => update("category", value)}><SelectTrigger className="w-full"><SelectValue placeholder="选择分类" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.slug} value={category.slug}>{category.name}</SelectItem>)}</SelectContent></Select></div>
            <label className="block space-y-2 text-sm font-medium">发布日期<Input type="date" value={editing.date} onChange={(event) => update("date", event.target.value)} /></label>
            <label className="block space-y-2 text-sm font-medium">预计阅读分钟<Input type="number" min="1" value={editing.readingMinutes} onChange={(event) => update("readingMinutes", Number(event.target.value))} /></label>
            <div className="space-y-2 text-sm font-medium"><span>标签</span><div className="flex flex-wrap gap-1.5">{tags.map((tag) => <Button key={tag.slug} size="sm" variant={editing.tags.includes(tag.slug) ? "secondary" : "outline" } onClick={() => update("tags", editing.tags.includes(tag.slug) ? editing.tags.filter((value) => value !== tag.slug) : [...editing.tags, tag.slug])}>{tag.name}</Button>)}</div></div>
            {editing.id > 0 && <><Separator /><Button size="sm" variant="ghost" className="text-destructive" onClick={remove}><Trash2 data-icon="inline-start" />删除文章</Button></>}
          </div>
        </SheetContent>
      </Sheet>
      <FloatingSaveBar kind="文章" busy={busy} canSave={Boolean(editing.title.trim())} dirty={draft.dirty} isDraft={editing.status === "draft" && (editing.id > 0 || draft.dirty)} onSaveDraft={() => save(editing.status)} onPublish={() => save("published")} onDiscard={() => { draft.discard(); setRevision((v) => v + 1) }} />
    </>}
  </>
}
