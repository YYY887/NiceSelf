import * as React from "react"
import { Link } from "react-router"
import { MessageSquareText, Search } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api, deleteResource, type ArticleRecord, type CommentRecord } from "@/lib/api"

type StatusFilter = "all" | "published" | "hidden"

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("zh-CN", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function CommentModeration({ comments, articles, refresh }: {
  comments: CommentRecord[]
  articles: ArticleRecord[]
  refresh: () => Promise<void>
}) {
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<StatusFilter>("all")
  const [removing, setRemoving] = React.useState<CommentRecord | null>(null)
  const [busyId, setBusyId] = React.useState<number | null>(null)
  const titles = React.useMemo(() => new Map(articles.map((article) => [article.slug, article.title])), [articles])
  const needle = query.trim().toLocaleLowerCase()
  const visible = comments.filter((comment) => {
    if (filter !== "all" && comment.status !== filter) return false
    if (!needle) return true
    const title = titles.get(comment.articleSlug) || ""
    return [comment.body, comment.user.login, comment.user.name, comment.articleSlug, title].some((value) => value.toLocaleLowerCase().includes(needle))
  })
  const hiddenCount = comments.filter((comment) => comment.status === "hidden").length

  async function change(comment: CommentRecord, status: "published" | "hidden") {
    setBusyId(comment.id)
    try {
      await api(`/admin/comments/${comment.id}`, { method: "PUT", body: JSON.stringify({ status }) })
      await refresh()
      toast.success(status === "hidden" ? "评论已隐藏，前台不再显示" : "评论已恢复公开")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败")
    } finally {
      setBusyId(null)
    }
  }

  async function confirmRemove() {
    if (!removing) return
    setBusyId(removing.id)
    try {
      await deleteResource("comments", removing.id)
      await refresh()
      toast.success("评论已删除")
      setRemoving(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败")
    } finally {
      setBusyId(null)
    }
  }

  return <div className="flex flex-col gap-6">
    <Card className="bg-card/85">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>读者评论</CardTitle>
          <CardDescription>共 {comments.length} 条，{hiddenCount} 条已隐藏。隐藏后前台不可见，删除后无法恢复。</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="搜索评论" placeholder="搜索内容、作者或文章" className="h-9 w-48 pl-9 sm:w-56" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <ToggleGroup type="single" value={filter} onValueChange={(value) => { if (value === "all" || value === "published" || value === "hidden") setFilter(value) }} size="sm" variant="outline" aria-label="评论状态">
            <ToggleGroupItem value="all">全部</ToggleGroupItem>
            <ToggleGroupItem value="published">公开</ToggleGroupItem>
            <ToggleGroupItem value="hidden">已隐藏</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {visible.map((comment, index) => {
          const title = titles.get(comment.articleSlug) || comment.articleSlug
          const busy = busyId === comment.id
          return <div key={comment.id}>
            {index > 0 && <Separator />}
            <div className="flex gap-3 py-5">
              <Avatar className="size-9">
                <AvatarImage src={comment.user.avatarUrl} alt="" />
                <AvatarFallback>{(comment.user.login || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <strong>{comment.user.name || comment.user.login}</strong>
                  <span className="text-muted-foreground">@{comment.user.login}</span>
                  <Badge variant={comment.status === "published" ? "secondary" : "outline"}>{comment.status === "published" ? "公开" : "已隐藏"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <Link to={`/blog/${comment.articleSlug}`} className="hover:text-foreground">{title}</Link>
                  <span> · {formatTime(comment.createdAt)}</span>
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{comment.body}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void change(comment, comment.status === "published" ? "hidden" : "published")}>
                    {comment.status === "published" ? "隐藏" : "恢复公开"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => setRemoving(comment)}>删除</Button>
                </div>
              </div>
            </div>
          </div>
        })}
        {visible.length === 0 && <Empty className="min-h-56">
          <EmptyHeader>
            <EmptyMedia variant="icon"><MessageSquareText /></EmptyMedia>
            <EmptyTitle>{comments.length === 0 ? "还没有评论" : "没有符合条件的评论"}</EmptyTitle>
            <EmptyDescription>{comments.length === 0 ? "读者在文章页用 GitHub 登录后即可留言，新评论会出现在这里。" : "换个关键词，或切换公开 / 已隐藏筛选。"}</EmptyDescription>
          </EmptyHeader>
        </Empty>}
      </CardContent>
    </Card>
    <Dialog open={Boolean(removing)} onOpenChange={(open) => { if (!open && busyId === null) setRemoving(null) }}>
      <DialogContent showCloseButton={busyId === null} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>删除这条评论？</DialogTitle>
          <DialogDescription>删除后无法恢复，文章页也不会再显示这条留言。</DialogDescription>
        </DialogHeader>
        {removing && <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-sm font-medium">@{removing.user.login}</p>
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{removing.body}</p>
        </div>}
        <DialogFooter>
          <Button variant="outline" disabled={busyId !== null} onClick={() => setRemoving(null)}>取消</Button>
          <Button variant="destructive" disabled={busyId !== null} onClick={() => void confirmRemove()}>{busyId !== null ? "删除中…" : "确认删除"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
