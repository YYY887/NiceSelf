import { hrefFileKind } from "@/lib/file-kind"

export function isCompleteHttpUrl(href: string) {
  try {
    const url = new URL(href)
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".")
  } catch {
    return false
  }
}

export function isArticleAttachment(href: string) {
  try {
    const url = new URL(href, "https://local.invalid")
    if (url.pathname.includes("/api/uploads/") || /\/file\//.test(url.pathname)) return true
    const kind = hrefFileKind(href)
    return kind !== "other" && kind !== "image"
  } catch {
    return false
  }
}
