import { BookOpenText, FilePenLine, FolderKanban, MessageSquareText, Tags } from "lucide-react"

import { Stagger, StaggerItem } from "@/components/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { AdminSection } from "@/components/admin/admin-sidebar"
import type { CommentRecord, SiteContent } from "@/lib/api"

export function AdminDashboard({ content, comments, onSelect }: {
  content: SiteContent
  comments: CommentRecord[]
  onSelect: (section: AdminSection) => void
}) {
  const publishedArticles = content.articles.filter((item) => item.status === "published").length
  const draftArticles = content.articles.length - publishedArticles
  const publishedProjects = content.projects.filter((item) => item.status === "published").length
  const visibleComments = comments.filter((item) => item.status === "published").length
  const stats = [
    { label: "文章", value: content.articles.length, detail: `${publishedArticles} 已发布 · ${draftArticles} 草稿`, icon: BookOpenText },
    { label: "项目", value: content.projects.length, detail: `${publishedProjects} 已发布`, icon: FolderKanban },
    { label: "分类与标签", value: content.categories.length + content.tags.length, detail: `${content.categories.length} 分类 · ${content.tags.length} 标签`, icon: Tags },
    { label: "评论", value: comments.length, detail: `${visibleComments} 公开 · ${comments.length - visibleComments} 隐藏`, icon: MessageSquareText },
  ]
  const recent = [...content.articles].sort((a, b) => (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date)).slice(0, 5)

  return <div className="flex flex-col gap-7">
    <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, detail, icon: Icon }) => <StaggerItem key={label}><Card className="bg-card/85">
        <CardHeader className="flex flex-row items-center justify-between"><CardDescription>{label}</CardDescription><Icon aria-hidden="true" className="size-4 text-muted-foreground" /></CardHeader>
        <CardContent><p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p></CardContent>
      </Card></StaggerItem>)}
    </Stagger>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
      <Card className="bg-card/85"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>最近文章</CardTitle><CardDescription>从这里继续写作或检查发布状态。</CardDescription></div><Button size="sm" variant="outline" onClick={() => onSelect("articles")}>管理文章</Button></CardHeader><CardContent className="flex flex-col">
        {recent.map((article, index) => <div key={article.id}>{index > 0 && <Separator />}<button type="button" onClick={() => onSelect("articles")} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:text-primary"><span className="min-w-0"><span className="block truncate font-medium">{article.title}</span><span className="text-xs text-muted-foreground">{article.date} · {article.readingMinutes} 分钟阅读</span></span><Badge variant={article.status === "published" ? "secondary" : "outline"}>{article.status === "published" ? "已发布" : "草稿"}</Badge></button></div>)}
        {recent.length === 0 && <p className="py-8 text-sm text-muted-foreground">还没有文章。去写第一篇吧。</p>}
      </CardContent></Card>
      <Card className="bg-card/85"><CardHeader><CardTitle>开始工作</CardTitle><CardDescription>常用操作集中在这里。</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">
        <Button variant="outline" className="justify-start" onClick={() => onSelect("articles")}><FilePenLine data-icon="inline-start" />写一篇文章</Button>
        <Button variant="outline" className="justify-start" onClick={() => onSelect("projects")}><FolderKanban data-icon="inline-start" />整理项目</Button>
        <Button variant="outline" className="justify-start" onClick={() => onSelect("comments")}><MessageSquareText data-icon="inline-start" />查看评论</Button>
        <Separator className="my-2" />
        <p className="text-xs leading-6 text-muted-foreground">文章和项目的数据来自当前 Go 服务。保存后，公开页面会读取已发布的内容。</p>
      </CardContent></Card>
    </div>
  </div>
}
