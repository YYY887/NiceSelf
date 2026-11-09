import * as React from "react"

import { articles } from "@/data/articles"
import { blogTopics } from "@/data/blog"
import { articleToMarkdown } from "@/lib/article-text"
import { api, type SiteContent } from "@/lib/api"

const fallback: SiteContent = {
  articles: articles.map((article, index) => ({
    id: index + 1,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    markdown: articleToMarkdown(article).split("\n\n").slice(3).join("\n\n"),
    category: article.category,
    tags: [],
    status: "published",
    date: article.date,
    readingMinutes: article.readingMinutes,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  })),
  categories: blogTopics.map((topic, index) => ({
    id: index + 1,
    slug: topic.slug,
    name: topic.category,
    description: topic.description,
  })),
  tags: [],
  projects: [{
    id: 1,
    slug: "qianqiu-myself",
    title: "QianQiu-MySelf",
    summary: "一个用来写文章、整理项目和记录日常探索的个人空间。",
    markdown: "从首屏的点阵涟漪，到文章阅读页的侧边目录，都围绕轻松阅读来设计。",
    coverUrl: "/projects/qianqiu-myself/home.png",
    logoUrl: "",
    screenshots: ["/projects/qianqiu-myself/home.png"],
    videos: [],
    siteUrl: "/",
    siteLabel: "查看网站",
    repoUrl: "",
    repoLabel: "代码仓库",
    links: [],
    technologies: ["React", "TypeScript", "Tailwind CSS", "shadcn/ui"],
    status: "published",
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  }],
  settings: {
    siteName: "QianQiu-MySelf",
    siteDescription: "写下思考，留下作品。让那些值得记住的瞬间，在这里慢慢生长。",
    aboutIntro: "你好，这里是 QianQiu-MySelf。我用这个空间记录思考、分享实践，也保存一路走来的变化。",
    githubUsername: "yyy887",
  },
}

const ContentContext = React.createContext<SiteContent>(fallback)

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = React.useState(fallback)

  React.useEffect(() => {
    const controller = new AbortController()
    api<SiteContent>("/content", { signal: controller.signal })
      .then(setContent)
      .catch(() => {})
    return () => controller.abort()
  }, [])

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
}

export function useSiteContent() { return React.useContext(ContentContext) }
