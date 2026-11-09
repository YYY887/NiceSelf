import type { Article } from "@/data/articles"
import { blogTopics } from "@/data/blog"

export function articleToMarkdown(article: Article) {
  const category = blogTopics.find((topic) => topic.slug === article.category)
  const sections = article.sections.map((section) => {
    if (section.type === "heading") return `## ${section.text}`
    if (section.type === "code") {
      return `\`\`\`${section.language}\n${section.code.trim()}\n\`\`\``
    }
    return section.text
  })

  return [
    `# ${article.title}`,
    `${category?.category ?? "文章"} · ${article.date} · ${article.readingMinutes} 分钟阅读`,
    article.summary,
    ...sections,
  ].join("\n\n")
}
