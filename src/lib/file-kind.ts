export type FileKind = "image" | "video" | "audio" | "pdf" | "archive" | "code" | "document" | "spreadsheet" | "presentation" | "text" | "other"
export type PreviewMode = "image" | "video" | "audio" | "pdf"

const kinds: Record<FileKind, string[]> = {
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"],
  video: ["mp4", "webm", "mov", "m4v", "ogv", "mkv"],
  audio: ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"],
  pdf: ["pdf"],
  archive: ["zip", "rar", "7z", "gz", "tar", "bz2", "xz"],
  code: ["js", "mjs", "ts", "tsx", "jsx", "py", "go", "rs", "java", "c", "cpp", "h", "css", "html", "htm", "json", "yml", "yaml", "toml", "xml", "sql", "sh"],
  document: ["doc", "docx", "rtf", "odt", "pages"],
  spreadsheet: ["xls", "xlsx", "csv", "ods", "numbers"],
  presentation: ["ppt", "pptx", "odp", "key"],
  text: ["txt", "md", "markdown", "log"],
  other: [],
}

const extKind = new Map<string, FileKind>()
for (const [kind, exts] of Object.entries(kinds) as [FileKind, string[]][]) {
  for (const ext of exts) extKind.set(ext, kind)
}

export function fileExtension(name: string) {
  const base = name.split(/[\\/]/).pop() || name
  const dot = base.lastIndexOf(".")
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ""
}

export function fileKind(name: string, mime = ""): FileKind {
  const type = mime.toLowerCase()
  if (type.startsWith("image/")) return "image"
  if (type.startsWith("video/")) return "video"
  if (type.startsWith("audio/")) return "audio"
  if (type === "application/pdf") return "pdf"
  if (type.includes("zip") || type.includes("compressed") || type.includes("tar")) return "archive"
  if (type.includes("spreadsheet") || type.includes("excel")) return "spreadsheet"
  if (type.includes("presentation") || type.includes("powerpoint")) return "presentation"
  if (type.includes("word") || type.includes("msword") || type.includes("opendocument.text")) return "document"
  return extKind.get(fileExtension(name)) || "other"
}

export function previewMode(name: string, mime = ""): PreviewMode | null {
  const kind = fileKind(name, mime)
  if (kind === "image" || kind === "video" || kind === "audio" || kind === "pdf") return kind
  return null
}

export function fileKindLabel(kind: FileKind) {
  return {
    image: "图片",
    video: "视频",
    audio: "音频",
    pdf: "PDF",
    archive: "压缩包",
    code: "代码",
    document: "文档",
    spreadsheet: "表格",
    presentation: "演示文稿",
    text: "文本",
    other: "文件",
  }[kind]
}

export function hrefFileKind(href: string) {
  try {
    return fileKind(new URL(href, "https://local.invalid").pathname)
  } catch {
    return fileKind(href)
  }
}
