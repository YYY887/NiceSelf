import * as React from "react"
import { ArrowDownWideNarrow, ChevronLeft, ChevronRight, Download, FileText, LayoutGrid, List, UploadCloud } from "lucide-react"
import { toast } from "sonner"

import { CopyButton } from "@/components/copy-button"
import { FileKindIcon } from "@/components/file-kind-icon"
import { MediaPreview, MediaThumb } from "@/components/media-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { assetHref, deleteResource, uploadAsset, type SiteContent, type UploadRecord } from "@/lib/api"
import { byteTotal, collectFileUsage, fileGroups, inGroup, kindLabel, sizeLabel, snippetFor, usageDetail, usedByLabel, type FileGroup } from "@/lib/file-library"
import { fileKind, previewMode } from "@/lib/file-kind"

type PendingUpload = { file: File; preview: string | null; progress: number }
type SortKey = "newest" | "oldest" | "name" | "name-desc" | "largest" | "smallest"

const pageSize = 12

function storageLabel(item: UploadRecord) { return item.storage === "webdav" ? item.storageName || "WebDAV" : "本地" }
function canPreview(name: string, mime?: string) { return Boolean(previewMode(name, mime)) }

function ProgressBar({ value, label }: { value: number; label: string }) {
  return <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label}</span><span>{value}%</span></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${value}%` }} /></div>
  </div>
}

function FileThumb({ src, name, mime, className }: { src: string | null; name: string; mime?: string; className?: string }) {
  if (!src) return <FileKindIcon name={name} mime={mime} className="size-full" />
  return <MediaThumb src={src} name={name} mime={mime} className={className || "size-full object-contain"} />
}

export function AssetManager({ uploads, content, refresh }: { uploads: UploadRecord[]; content: SiteContent | null; refresh: () => Promise<void> }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState<PendingUpload | null>(null)
  const [removing, setRemoving] = React.useState<UploadRecord | null>(null)
  const [previewing, setPreviewing] = React.useState<UploadRecord | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [group, setGroup] = React.useState<FileGroup>("all")
  const [sort, setSort] = React.useState<SortKey>("newest")
  const [query, setQuery] = React.useState("")
  const usage = React.useMemo(() => collectFileUsage(content), [content])
  const needle = query.trim().toLocaleLowerCase()
  const counts = React.useMemo(() => {
    const record: Record<FileGroup, number> = { all: uploads.length, image: 0, media: 0, document: 0, other: 0, unused: 0 }
    for (const item of uploads) {
      const kind = fileKind(item.name, item.mime)
      for (const entry of fileGroups) if (entry.id !== "all" && entry.id !== "unused" && inGroup(kind, entry.id)) record[entry.id] += 1
      if (!hasUsage(item)) record.unused += 1
    }
    return record
    function hasUsage(item: UploadRecord) {
      const entry = usage.get(item.url) || usage.get(assetHref(item.url))
      return Boolean(entry && (entry.articles.length || entry.projects.length))
    }
  }, [uploads, usage])
  const visible = React.useMemo(() => {
    const filtered = uploads.filter((item) => {
      if (!inGroup(fileKind(item.name, item.mime), group)) return false
      if (group === "unused") {
        const entry = usage.get(item.url) || usage.get(assetHref(item.url))
        if (entry && (entry.articles.length || entry.projects.length)) return false
      }
      return [item.name, item.storedName, item.url, storageLabel(item), kindLabel(item.name, item.mime)].some((value) => value.toLocaleLowerCase().includes(needle))
    })
    const byId = (item: UploadRecord) => item.id
    return [...filtered].sort((a, b) => {
      if (sort === "oldest") return byId(a) - byId(b)
      if (sort === "name") return a.name.localeCompare(b.name, "zh-Hans-CN")
      if (sort === "name-desc") return b.name.localeCompare(a.name, "zh-Hans-CN")
      if (sort === "largest") return b.size - a.size
      if (sort === "smallest") return a.size - b.size
      return byId(b) - byId(a)
    })
  }, [uploads, group, needle, sort, usage])
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  // 只记录要跳到第几页，切换搜索词或分类时页数自然回到 1，不需要在 effect 里改状态。
  const [pageTarget, setPageTarget] = React.useState(1)
  const currentPage = Math.min(Math.max(1, pageTarget), pageCount)
  const paged = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const previewRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    previewRef.current = pending?.preview ?? null
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current)
        previewRef.current = null
      }
    }
  }, [pending])

  function usageFor(item: UploadRecord) {
    return usage.get(item.url) || usage.get(assetHref(item.url))
  }

  /** 图片按原始宽度生成 HTML 标签，避免复制出来被拉伸。 */
  async function imageWidth(item: UploadRecord, href: string) {
    if (fileKind(item.name, item.mime) !== "image") return 0
    return await new Promise<number>((resolve) => {
      const probe = new window.Image()
      probe.onload = () => resolve(probe.naturalWidth || 0)
      probe.onerror = () => resolve(0)
      probe.src = href
    })
  }

  async function upload(file?: File) {
    if (!file) return
    const preview = file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : null
    setPending({ file, preview, progress: 0 })
    setMessage("")
    try {
      const result = await uploadAsset(file, (percent) => setPending((current) => current ? { ...current, progress: percent } : current))
      await refresh()
      const originalExt = file.name.match(/\.[^.]+$/)?.[0].toLowerCase()
      const storedExt = result.storedName.match(/\.[^.]+$/)?.[0].toLowerCase()
      const place = storageLabel(result)
      setMessage(result.duplicate
        ? `文件已存在，已复用文件库中的 ${result.name}。`
        : originalExt !== storedExt
          ? `已上传到${place}，本地名 ${file.name}，存储名 ${result.storedName}。`
          : `已上传到${place}，可复制链接用于文章或项目。`)
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "上传失败") }
    finally {
      setPending(null)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function confirmRemove() {
    if (!removing) return
    setDeleting(true)
    try {
      await deleteResource("uploads", removing.id)
      await refresh()
      setMessage("文件已删除")
      setRemoving(null)
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "删除失败") }
    finally { setDeleting(false) }
  }

  function openFile(item: UploadRecord) {
    if (canPreview(item.name, item.mime)) setPreviewing(item)
    else window.open(assetHref(item.url), "_blank", "noopener,noreferrer")
  }

  const pendingLabel = pending ? (pending.progress >= 99 ? "正在保存…" : "正在上传") : ""
  const totalSize = uploads.reduce((sum, item) => sum + (item.size || 0), 0)
  const removingUsage = removing ? usageFor(removing) : undefined
  const removingDetail = usageDetail(removingUsage)

  return <div className="flex flex-col gap-6">
    <Card className="bg-card/85"><CardHeader><CardTitle>上传文件</CardTitle><CardDescription>单个文件最多 50 MB。文件库分别保存本地文件名、存储名和可访问链接；存储位置在站点设置中切换。</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} aria-label="选择要上传的文件" />
        <Button disabled={Boolean(pending)} onClick={() => inputRef.current?.click()}><UploadCloud data-icon="inline-start" />{pending ? "正在上传…" : "选择文件上传"}</Button>
        <span className="text-xs text-muted-foreground">图片、视频、音频和 PDF 可直接预览；其他类型可下载。存储名会保留原来的后缀。</span>
      </div>
      {pending && <div className="flex max-w-xl items-center gap-4 rounded-xl border bg-muted/30 p-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background"><FileThumb src={pending.preview} name={pending.file.name} mime={pending.file.type} className="size-full object-contain" /></div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate text-sm font-medium">{pending.file.name}</p>
          <p className="text-xs text-muted-foreground">{sizeLabel(pending.file.size)}</p>
          <ProgressBar value={pending.progress} label={pendingLabel} />
        </div>
      </div>}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </CardContent></Card>
    <Card className="bg-card/85"><CardHeader className="flex flex-col gap-4"><div className="flex flex-wrap items-start justify-between gap-4"><div>
      <CardTitle>文件库</CardTitle>
      <CardDescription>共 {uploads.length} 个文件 · {byteTotal(totalSize)} · 图片 {counts.image} · 音视频 {counts.media} · 文档 {counts.document} · 其他 {counts.other}{counts.unused ? ` · 未使用 ${counts.unused}` : ""}。按内容检查重复上传，已有文件会直接复用。</CardDescription>
    </div><div className="flex flex-wrap items-center gap-3">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文件名或链接" aria-label="搜索文件名或链接" className="h-9 w-40 rounded-md border bg-background px-3 text-sm sm:w-52" />
      <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}><SelectTrigger className="h-9 w-32" aria-label="文件排序"><ArrowDownWideNarrow className="size-4" /><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="newest">最新上传</SelectItem>
        <SelectItem value="oldest">最早上传</SelectItem>
        <SelectItem value="name">名称正序</SelectItem>
        <SelectItem value="name-desc">名称倒序</SelectItem>
        <SelectItem value="largest">从大到小</SelectItem>
        <SelectItem value="smallest">从小到大</SelectItem>
      </SelectContent></Select>
      <ToggleGroup type="single" value={view} onValueChange={(value) => { if (value === "grid" || value === "list") setView(value) }} size="sm" variant="outline" aria-label="文件库视图"><ToggleGroupItem value="grid" aria-label="网格视图" title="网格视图"><LayoutGrid className="size-4" /></ToggleGroupItem><ToggleGroupItem value="list" aria-label="列表视图" title="列表视图"><List className="size-4" /></ToggleGroupItem></ToggleGroup>
    </div></div>
      <div className="flex flex-wrap items-center gap-2">
        {fileGroups.map((entry) => <Button key={entry.id} size="sm" variant={group === entry.id ? "secondary" : "ghost"} aria-pressed={group === entry.id} onClick={() => setGroup(entry.id)}>{entry.label}<span className="text-xs text-muted-foreground">{counts[entry.id]}</span></Button>)}
      </div>
    </CardHeader><CardContent className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" : "flex flex-col"}>
      {pending && (view === "grid" ? <div className="relative min-w-0 overflow-hidden rounded-xl border bg-card">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/60">
          <FileThumb src={pending.preview} name={pending.file.name} mime={pending.file.type} className="size-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 bg-background/80 p-3 backdrop-blur-sm"><div className="flex items-center gap-2 text-xs"><Spinner className="size-3.5" />{pendingLabel}</div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${pending.progress}%` }} /></div></div>
        </div>
        <div className="space-y-2 p-3"><p className="truncate text-sm font-medium">{pending.file.name}</p><p className="text-xs text-muted-foreground">{sizeLabel(pending.file.size)} · 即将加入文件库</p></div>
      </div> : <div className="flex flex-wrap items-center gap-4 py-4">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted"><FileThumb src={pending.preview} name={pending.file.name} mime={pending.file.type} className="size-full object-cover" /></div>
        <div className="min-w-0 flex-1 space-y-2"><p className="truncate text-sm font-medium">{pending.file.name}</p><ProgressBar value={pending.progress} label={pendingLabel} /></div>
        <Badge variant="outline">上传中</Badge>
      </div>)}
      {paged.map((item, index) => {
        const href = assetHref(item.url)
        const itemUsage = usageFor(item)
        const usedBy = usedByLabel(itemUsage)
        const kind = kindLabel(item.name, item.mime)
        const meta = <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
          <p className="truncate text-xs text-muted-foreground" title={item.storedName}>存储名 {item.storedName}</p>
          <p className="truncate text-xs text-muted-foreground" title={href}>{item.url}</p>
        </div>
        const actions = <div className="flex items-center gap-1">
          <CopyButton text={() => href} size="icon-sm" variant="ghost" title="复制访问地址" aria-label={`复制 ${item.name} 的地址`} />
          <Button size="sm" variant="ghost" title={`复制 Markdown 片段`} aria-label={`复制 ${item.name} 的 Markdown 片段`} onClick={async () => {
            const text = snippetFor(item, "markdown", href, await imageWidth(item, href))
            try {
              await navigator.clipboard.writeText(text)
              toast.success("已复制，可直接粘贴进正文")
            } catch { toast.error("复制失败") }
          }}><FileText className="size-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => openFile(item)}>{canPreview(item.name, item.mime) ? "预览" : "查看"}</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRemoving(item)}>删除</Button>
        </div>
        const badges = <div className="flex min-w-0 flex-wrap items-center gap-1">
          <Badge variant="secondary">{sizeLabel(item.size)}</Badge>
          <Badge variant="outline">{kind}</Badge>
          <Badge variant="outline">{storageLabel(item)}</Badge>
          {usedBy ? <Badge variant="outline" className="border-primary/40 text-primary" title={`被 ${usedBy} 使用`}>被引用 {usedBy}</Badge> : <Badge variant="ghost" className="text-muted-foreground" title="没有文章或项目引用它">未使用</Badge>}
        </div>
        return view === "grid" ? <div key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
          <button type="button" className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted/60" onClick={() => openFile(item)} aria-label={`${canPreview(item.name, item.mime) ? "预览" : "查看"} ${item.name}`}>
            <FileThumb src={href} name={item.name} mime={item.mime} className="size-full object-contain" />
          </button>
          <div className="flex flex-1 flex-col gap-3 p-3">{meta}{badges}<div className="mt-auto flex items-center justify-end gap-2">{actions}</div></div>
        </div> : <div key={item.id}>{(index > 0 || pending) && <Separator />}<div className="flex flex-wrap items-center gap-4 py-4">
          <button type="button" className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted" onClick={() => openFile(item)} aria-label={`${canPreview(item.name, item.mime) ? "预览" : "查看"} ${item.name}`}>
            <FileThumb src={href} name={item.name} mime={item.mime} className="size-full object-cover" />
          </button>
          <div className="min-w-0 flex-1">{meta}{badges}</div>
          <CopyButton text={() => href} size="sm" variant="outline">复制地址</CopyButton>
          <Button size="sm" variant="ghost" onClick={async () => {
            const text = snippetFor(item, "markdown", href, await imageWidth(item, href))
            try {
              await navigator.clipboard.writeText(text)
              toast.success("已复制，可直接粘贴进正文")
            } catch { toast.error("复制失败") }
          }}><FileText data-icon="inline-start" />Markdown</Button>
          <Button size="sm" variant="ghost" onClick={() => openFile(item)}>{canPreview(item.name, item.mime) ? "预览" : "查看"}</Button>
          <Button size="sm" variant="ghost" asChild aria-label={`下载 ${item.name}`}><a href={href} download={item.name} target="_blank" rel="noreferrer"><Download data-icon="inline-start" />下载</a></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRemoving(item)}>删除</Button>
        </div></div>
      })}
      {visible.length === 0 && !pending && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{uploads.length ? "没有找到匹配的文件，试试换个关键词或分类。" : "还没有上传文件。"}</p>}
      {visible.length > pageSize && <div className="col-span-full mt-2 flex items-center justify-center gap-3">
        <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPageTarget(Math.max(1, currentPage - 1))}><ChevronLeft data-icon="inline-start" />上一页</Button>
        <span className="text-xs text-muted-foreground">第 {currentPage} / {pageCount} 页 · 共 {visible.length} 个</span>
        <Button size="sm" variant="outline" disabled={currentPage >= pageCount} onClick={() => setPageTarget(Math.min(pageCount, currentPage + 1))}>下一页<ChevronRight data-icon="inline-end" /></Button>
      </div>}
    </CardContent></Card>
    <Dialog open={Boolean(previewing)} onOpenChange={(open) => { if (!open) setPreviewing(null) }}>
      <DialogContent className="sm:max-w-3xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{previewing?.name || "预览"}</DialogTitle>
          <DialogDescription>{previewing ? `${previewing.storedName} · ${sizeLabel(previewing.size)} · ${usageDetail(previewing ? usageFor(previewing) : undefined) || "尚未被引用"}` : ""}</DialogDescription>
        </DialogHeader>
        {previewing && <MediaPreview src={previewing.url} name={previewing.name} mime={previewing.mime} />}
        <DialogFooter>
          {previewing && <CopyButton text={() => assetHref(previewing.url)} size="sm" variant="outline">复制地址</CopyButton>}
          {previewing && <Button size="sm" variant="outline" asChild><a href={assetHref(previewing.url)} download={previewing.name} target="_blank" rel="noreferrer"><Download data-icon="inline-start" />下载原文件</a></Button>}
          {previewing && <Button size="sm" variant="ghost" onClick={async () => {
            const text = snippetFor(previewing, "markdown", assetHref(previewing.url), await imageWidth(previewing, assetHref(previewing.url)))
            try { await navigator.clipboard.writeText(text); toast.success("已复制，可直接粘贴进正文") } catch { toast.error("复制失败") }
          }}><FileText data-icon="inline-start" />复制 Markdown</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(removing)} onOpenChange={(open) => { if (!open && !deleting) setRemoving(null) }}>
      <DialogContent showCloseButton={!deleting} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>删除这个文件？</DialogTitle>
          <DialogDescription>{removingDetail ? `这个文件正在被${removingDetail}使用，删除后那些位置的图片或附件会失效，删除后无法恢复。` : "删除后无法恢复。"}</DialogDescription>
        </DialogHeader>
        {removing && <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background"><FileThumb src={assetHref(removing.url)} name={removing.name} mime={removing.mime} className="size-full object-contain" /></div>
          <div className="min-w-0"><p className="truncate text-sm font-medium">{removing.name}</p><p className="truncate text-xs text-muted-foreground">{removing.storedName}</p></div>
        </div>}
        {removing && !removingDetail && <p className="text-xs text-muted-foreground">当前没有文章或项目引用它，可以放心删除。</p>}
        <DialogFooter>
          <Button variant="outline" disabled={deleting} onClick={() => setRemoving(null)}>取消</Button>
          <Button variant="destructive" disabled={deleting} onClick={() => void confirmRemove()}>{deleting ? "删除中…" : "确认删除"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
