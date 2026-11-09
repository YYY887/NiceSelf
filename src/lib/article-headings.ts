import type { Root } from "mdast"

export type ArticleHeading = { title: string; id: string; level: number; href: string; line: number }

export function headingId(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-")
}

export function articleHeadings(markdown: string): ArticleHeading[] {
  const found: ArticleHeading[] = []
  const used = new Map<string, number>()
  let fence = ""
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]
    if (marker) {
      if (!fence) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = ""
      continue
    }
    if (fence) continue
    const match = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line)
    if (!match) continue
    const title = match[2].trim()
    const base = headingId(title) || "section"
    const occurrence = used.get(base) || 0
    used.set(base, occurrence + 1)
    const id = occurrence ? `${base}-${occurrence + 1}` : base
    found.push({ title, id, href: `#${id}`, level: match[1].length, line: index + 1 })
  }
  return found
}
export function remarkArticleHeadingIds(headings: ArticleHeading[]) {
  return (tree: Root) => {
    for (const node of tree.children) {
      if (node.type !== "heading") continue
      const heading = headings.find((item) => item.line === node.position?.start.line)
      if (!heading) continue
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: heading.id } }
    }
  }
}
