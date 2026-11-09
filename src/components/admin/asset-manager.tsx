import * as React from "react"
import { ChevronLeft, ChevronRight, LayoutGrid, List, UploadCloud } from "lucide-react"

import { CopyButton } from "@/components/copy-button"
import { FileKindIcon } from "@/components/file-kind-icon"
import { MediaPreview, MediaThumb } from "@/components/media-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { assetHref, deleteResource, uploadAsset, type UploadRecord } from "@/lib/api"
import { previewMode } from "@/lib/file-kind"

type PendingUpload = { file: File; preview: string | null; progress: number }

const pageSize = 12

function sizeLabel(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB` }
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

export function AssetManager({ uploads, refresh }: { uploads: UploadRecord[]; refresh: () => Promise<void> }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState<PendingUpload | null>(null)
  const [removing, setRemoving] = React.useState<UploadRecord | null>(null)
  const [previewing, setPreviewing] = React.useState<UploadRecord | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const needle = query.trim().toLocaleLowerCase()
  const visible = uploads.filter((item) => [item.name, item.storedName, item.url, storageLabel(item)].some((value) => value.toLocaleLowerCase().includes(needle)))
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paged = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const previewRef = React.useRef<string | null>(null)
  previewRef.current = pending?.preview ?? null
  React.useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }, [])
  React.useEffect(() => { setPage(1) }, [query, view])

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
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current)
        previewRef.current = null
      }
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
    <Card className="bg-card/85"><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4"><div><CardTitle>文件库</CardTitle><CardDescription>共 {uploads.length} 个文件。按内容检查重复上传，已有文件会直接复用。</CardDescription></div><div className="flex items-center gap-3"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文件名或链接" aria-label="搜索文件名或链接" className="h-9 w-36 rounded-md border bg-background px-3 text-sm sm:w-48" /><ToggleGroup type="single" value={view} onValueChange={(value) => { if (value === "grid" || value === "list") setView(value) }} size="sm" variant="outline" aria-label="文件库视图"><ToggleGroupItem value="grid" aria-label="网格视图" title="网格视图"><LayoutGrid className="size-4" /></ToggleGroupItem><ToggleGroupItem value="list" aria-label="列表视图" title="列表视图"><List className="size-4" /></ToggleGroupItem></ToggleGroup></div></CardHeader><CardContent className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" : "flex flex-col"}>
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
        const meta = <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
          <p className="truncate text-xs text-muted-foreground" title={item.storedName}>存储名 {item.storedName}</p>
          <p className="truncate text-xs text-muted-foreground" title={href}>{item.url}</p>
        </div>
        const actions = <div className="flex items-center gap-1">
          <CopyButton text={() => href} size="icon-sm" variant="ghost" title="复制链接" aria-label={`复制 ${item.name} 的链接`} />
          <Button size="sm" variant="ghost" onClick={() => openFile(item)}>{canPreview(item.name, item.mime) ? "预览" : "查看"}</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRemoving(item)}>删除</Button>
        </div>
        return view === "grid" ? <div key={item.id} className="min-w-0 overflow-hidden rounded-xl border bg-card">
          <button type="button" className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted/60" onClick={() => openFile(item)} aria-label={`${canPreview(item.name, item.mime) ? "预览" : "查看"} ${item.name}`}>
            <FileThumb src={href} name={item.name} mime={item.mime} className="size-full object-contain" />
          </button>
          <div className="space-y-3 p-3">{meta}<div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-1"><Badge variant="secondary">{sizeLabel(item.size)}</Badge><Badge variant="outline">{storageLabel(item)}</Badge></div>{actions}</div></div>
        </div> : <div key={item.id}>{(index > 0 || pending) && <Separator />}<div className="flex flex-wrap items-center gap-4 py-4">
          <button type="button" className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted" onClick={() => openFile(item)} aria-label={`${canPreview(item.name, item.mime) ? "预览" : "查看"} ${item.name}`}>
            <FileThumb src={href} name={item.name} mime={item.mime} className="size-full object-cover" />
          </button>
          <div className="min-w-0 flex-1">{meta}</div>
          <Badge variant="secondary">{sizeLabel(item.size)}</Badge>
          <Badge variant="outline">{storageLabel(item)}</Badge>
          <CopyButton text={() => href} size="sm" variant="outline">复制链接</CopyButton>
          <Button size="sm" variant="ghost" onClick={() => openFile(item)}>{canPreview(item.name, item.mime) ? "预览" : "查看"}</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRemoving(item)}>删除</Button>
        </div></div>
      })}
      {visible.length === 0 && !pending && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{uploads.length ? "没有找到匹配的文件。" : "还没有上传文件。"}</p>}
      {visible.length > pageSize && <div className="col-span-full mt-2 flex items-center justify-center gap-3">
        <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft data-icon="inline-start" />上一页</Button>
        <span className="text-xs text-muted-foreground">第 {currentPage} / {pageCount} 页</span>
        <Button size="sm" variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页<ChevronRight data-icon="inline-end" /></Button>
      </div>}
    </CardContent></Card>
    <Dialog open={Boolean(previewing)} onOpenChange={(open) => { if (!open) setPreviewing(null) }}>
      <DialogContent className="sm:max-w-3xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{previewing?.name || "预览"}</DialogTitle>
          <DialogDescription>{previewing ? `${previewing.storedName} · ${sizeLabel(previewing.size)}` : ""}</DialogDescription>
        </DialogHeader>
        {previewing && <MediaPreview src={previewing.url} name={previewing.name} mime={previewing.mime} />}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(removing)} onOpenChange={(open) => { if (!open && !deleting) setRemoving(null) }}>
      <DialogContent showCloseButton={!deleting} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>删除这个文件？</DialogTitle>
          <DialogDescription>使用此地址的文章或项目图片会失效，删除后无法恢复。</DialogDescription>
        </DialogHeader>
        {removing && <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background"><FileThumb src={assetHref(removing.url)} name={removing.name} mime={removing.mime} className="size-full object-contain" /></div>
          <div className="min-w-0"><p className="truncate text-sm font-medium">{removing.name}</p><p className="truncate text-xs text-muted-foreground">{removing.storedName}</p></div>
        </div>}
        <DialogFooter>
          <Button variant="outline" disabled={deleting} onClick={() => setRemoving(null)}>取消</Button>
          <Button variant="destructive" disabled={deleting} onClick={() => void confirmRemove()}>{deleting ? "删除中…" : "确认删除"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
