import { assetHref } from "@/lib/api"
import { FileKindIcon } from "@/components/file-kind-icon"
import { VideoPlayer } from "@/components/video-player"
import { previewMode } from "@/lib/file-kind"

export function MediaPreview({ src, name, mime, className }: {
  src: string
  name: string
  mime?: string
  className?: string
}) {
  const href = assetHref(src)
  const mode = previewMode(name, mime)
  if (mode === "image") return <img src={href} alt={name} className={className || "max-h-[70vh] w-full object-contain"} />
  if (mode === "video") return <VideoPlayer src={href} title={name} className={className} />
  if (mode === "audio") return <audio src={href} controls preload="metadata" className={className || "w-full"} />
  if (mode === "pdf") return <iframe src={href} title={name} className={className || "h-[70vh] w-full rounded-md border bg-background"} />
  return <div className="flex flex-col items-center gap-3 py-10">
    <FileKindIcon name={name} mime={mime} className="size-24 rounded-2xl" iconClassName="size-10" />
    <a href={href} download={name} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4">下载 {name}</a>
  </div>
}

export function MediaThumb({ src, name, mime, className }: {
  src: string
  name: string
  mime?: string
  className?: string
}) {
  const href = assetHref(src)
  const mode = previewMode(name, mime)
  if (mode === "image") return <img src={href} alt={name} loading="lazy" className={className || "size-full object-contain"} />
  if (mode === "video") return <video src={href} muted preload="metadata" className={className || "size-full object-cover"} />
  return <FileKindIcon name={name} mime={mime} className="size-full" />
}
