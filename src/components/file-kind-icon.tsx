import { File, FileArchive, FileAudio, FileCode, FileImage, FileSpreadsheet, FileText, FileVideo, Presentation } from "lucide-react"

import { cn } from "@/lib/utils"
import { fileExtension, fileKind, fileKindLabel, type FileKind } from "@/lib/file-kind"

const icons: Record<FileKind, typeof FileText> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  archive: FileArchive,
  code: FileCode,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  text: FileText,
  other: File,
}

const tones: Record<FileKind, string> = {
  image: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  video: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  audio: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  pdf: "bg-red-500/12 text-red-600 dark:text-red-400",
  archive: "bg-yellow-500/12 text-yellow-700 dark:text-yellow-400",
  code: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  document: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
  spreadsheet: "bg-green-500/12 text-green-600 dark:text-green-400",
  presentation: "bg-orange-500/12 text-orange-600 dark:text-orange-400",
  text: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
  other: "bg-muted text-muted-foreground",
}

export function FileKindIcon({ name, mime, className, iconClassName, showLabel = true }: {
  name: string
  mime?: string
  className?: string
  iconClassName?: string
  showLabel?: boolean
}) {
  const kind = fileKind(name, mime)
  const Icon = icons[kind]
  const ext = fileExtension(name).toUpperCase()
  return (
    <span className={cn("flex flex-col items-center justify-center gap-1", tones[kind], className)}>
      <Icon className={cn("size-8", iconClassName)} />
      {showLabel && <span className="text-[10px] font-medium tracking-wide">{ext || fileKindLabel(kind)}</span>}
    </span>
  )
}
