import * as React from "react"
import { Check, ImagePlus, Paperclip, Search, UploadCloud } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { FileKindIcon } from "@/components/file-kind-icon"
import { MediaThumb } from "@/components/media-preview"
import { uploadAsset, type UploadRecord } from "@/lib/api"
import { previewMode } from "@/lib/file-kind"

type ArticleImagePickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  uploads: UploadRecord[]
  refreshUploads: () => Promise<void>
  onSelect: (url: string, name: string, item: UploadRecord) => void
  onSelectMany?: (items: { url: string; name: string }[]) => void
  multiple?: boolean
  excludeUrls?: string[]
  kind?: "image" | "file"
  title?: string
  description?: string
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ArticleImagePicker({
  open,
  onOpenChange,
  uploads,
  refreshUploads,
  onSelect,
  onSelectMany,
  multiple = false,
  excludeUrls = [],
  kind = "image",
  title,
  description,
}: ArticleImagePickerProps) {
  const filesOnly = kind === "file"
  const heading = title || (filesOnly ? "从文件库插入附件" : "从文件库插入图片")
  const detail = description || (filesOnly ? "选择文件插入为可下载附件，也可以上传新文件。" : "选择已有图片插入文章，也可以上传新图片。插入后默认宽度为 60%。")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [picked, setPicked] = React.useState<Set<number>>(new Set())
  const excluded = React.useMemo(() => new Set(excludeUrls), [excludeUrls])
  const images = uploads.filter((item) => {
    if (!filesOnly && !item.mime.startsWith("image/")) return false
    return item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  })

  React.useEffect(() => {
    if (open) {
      setQuery("")
      setPicked(new Set())
    }
  }, [open])

  function close() {
    onOpenChange(false)
  }

  function select(item: UploadRecord) {
    onSelect(item.url, item.name, item)
    close()
  }

  function toggle(id: number) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function confirmMany() {
    const items = images.filter((item) => picked.has(item.id)).map((item) => ({ url: item.url, name: item.name }))
    if (!items.length) {
      toast.info(filesOnly ? "请先选择文件" : "请先选择图片")
      return
    }
    onSelectMany?.(items)
    close()
  }

  async function upload(file?: File) {
    if (!file) return
    setBusy(true)
    try {
      const item = await uploadAsset(file)
      if (!filesOnly && !item.mime.startsWith("image/")) {
        toast.error("该文件不是图片，请选择图片文件")
        return
      }
      await refreshUploads()
      if (multiple) {
        if (!excluded.has(item.url)) setPicked((current) => new Set(current).add(item.id))
        toast.success(item.duplicate ? "已选中文件库中的现有文件" : filesOnly ? "文件已上传，可继续选择" : "图片已上传，可继续选择")
      } else {
        select(item)
        toast.success(item.duplicate ? "已使用文件库中的现有文件" : filesOnly ? "文件已上传并插入" : "图片已上传并插入")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : filesOnly ? "文件上传失败" : "图片上传失败")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[min(80svh,48rem)] w-[min(92vw,52rem)] max-w-[min(92vw,52rem)] flex-col gap-4 sm:max-w-[min(92vw,52rem)]">
      <DialogHeader>
        <DialogTitle>{heading}</DialogTitle>
        <DialogDescription>{detail}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-center gap-2 pr-8">
        <div className="relative min-w-40 flex-1">
          <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={filesOnly ? "搜索文件库附件" : "搜索文件库图片"} placeholder={filesOnly ? "搜索文件名" : "搜索图片文件名"} className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <input ref={inputRef} type="file" accept={filesOnly ? undefined : "image/png,image/jpeg,image/webp,image/gif,image/svg+xml"} className="sr-only" aria-label={filesOnly ? "上传新文件" : "上传新图片"} multiple={multiple} onChange={(event) => {
          const files = Array.from(event.target.files || [])
          if (!files.length) return
          void (async () => {
            for (const file of files) await upload(file)
          })()
        }} />
        <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}><UploadCloud data-icon="inline-start" />{busy ? "上传中…" : filesOnly ? "上传新文件" : "上传新图片"}</Button>
      </div>
      <div className="min-h-0 overflow-y-auto">
        {images.length ? <div className="grid grid-cols-2 gap-3 pb-1 sm:grid-cols-3 md:grid-cols-4">
          {images.map((item) => {
            const already = excluded.has(item.url)
            const selected = picked.has(item.id)
            const mode = previewMode(item.name, item.mime)
            return <button key={item.id} type="button" disabled={already} onClick={() => multiple ? toggle(item.id) : select(item)} className={`group relative min-w-0 overflow-hidden rounded-lg border bg-card text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${already ? "cursor-not-allowed opacity-55" : "hover:border-primary"} ${selected ? "border-primary ring-2 ring-primary/30" : ""}`} title={already ? `${item.name}（已添加）` : `选择 ${item.name}`}>
              <span className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/50">{mode === "image" || mode === "video" ? <MediaThumb src={item.url} name={item.name} mime={item.mime} className="size-full object-contain transition-transform group-hover:scale-105" /> : <FileKindIcon name={item.name} mime={item.mime} className="size-full" iconClassName="size-8" />}</span>
              <span className="block truncate px-2 pt-2 text-xs" title={item.name}>{item.name}</span>
              <span className="block truncate px-2 pb-2 text-[10px] text-muted-foreground">{sizeLabel(item.size)}</span>
              {already && <span className="absolute top-2 left-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">已添加</span>}
              {selected && <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
            </button>
          })}
        </div> : <Empty className="min-h-56"><EmptyHeader><EmptyMedia variant="icon">{filesOnly ? <Paperclip /> : <ImagePlus />}</EmptyMedia><EmptyTitle>{query ? (filesOnly ? "没有找到匹配的文件" : "没有找到匹配的图片") : (filesOnly ? "文件库还没有附件" : "文件库还没有图片")}</EmptyTitle><EmptyDescription>{query ? (filesOnly ? "换个文件名试试，或者上传新文件。" : "换个文件名试试，或者上传新图片。") : (filesOnly ? "点击“上传新文件”，上传后可以直接插入文章。" : "点击“上传新图片”，上传后可以直接使用。")}</EmptyDescription></EmptyHeader></Empty>}
      </div>
      {multiple && <DialogFooter>
        <Button variant="outline" onClick={close}>取消</Button>
        <Button disabled={!picked.size} onClick={confirmMany}>添加所选（{picked.size}）</Button>
      </DialogFooter>}
    </DialogContent>
  </Dialog>
}
