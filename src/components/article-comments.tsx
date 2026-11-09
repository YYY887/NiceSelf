import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { api, type AuthUser, type CommentRecord } from "@/lib/api"

export function ArticleComments({ articleSlug }: { articleSlug: string }) {
  const [comments, setComments] = React.useState<CommentRecord[]>([])
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [oauthEnabled, setOauthEnabled] = React.useState(false)
  const [body, setBody] = React.useState("")
  const [error, setError] = React.useState("")
  const [sending, setSending] = React.useState(false)

  React.useEffect(() => {
    api<CommentRecord[]>(`/comments?article=${encodeURIComponent(articleSlug)}`).then(setComments).catch(() => {})
    api<{user: AuthUser | null; oauthEnabled: boolean}>("/auth/me").then((data) => { setUser(data.user && data.user.githubId > 0 ? data.user : null); setOauthEnabled(data.oauthEnabled) }).catch(() => {})
  }, [articleSlug])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSending(true); setError("")
    try {
      const comment = await api<CommentRecord>("/comments", { method: "POST", body: JSON.stringify({ articleSlug, body }) })
      setComments((items) => [comment, ...items]); setBody("")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "评论发布失败") }
    finally { setSending(false) }
  }

  return <section className="mt-20" aria-labelledby="comments-heading">
    <Separator className="mb-8" />
    <h2 id="comments-heading" className="text-xl font-semibold">评论 <span className="text-sm font-normal text-muted-foreground">{comments.length}</span></h2>
    <p className="mt-2 text-sm text-muted-foreground">使用 GitHub 身份参与讨论。</p>
    {user ? <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={4} placeholder="写下你的想法…" aria-label="评论内容" />
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>以 @{user.login} 身份评论</span><Button type="submit" disabled={sending || body.trim().length < 2}>{sending ? "发布中…" : "发布评论"}</Button></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form> : <div className="mt-6">{oauthEnabled ? <Button asChild variant="outline"><a href={`/api/auth/github/start?returnTo=${encodeURIComponent(`/blog/${articleSlug}`)}`}>使用 GitHub 登录后评论</a></Button> : <p className="text-sm text-muted-foreground">站点尚未配置 GitHub 登录，评论暂不可用。</p>}</div>}
    <div className="mt-8 flex flex-col gap-6">{comments.map((comment) => <div key={comment.id} className="flex gap-3 border-t pt-5">
      <Avatar className="size-9"><AvatarImage src={comment.user.avatarUrl} alt="" /><AvatarFallback>{comment.user.login.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-sm"><strong>{comment.user.name || comment.user.login}</strong><span className="text-muted-foreground">@{comment.user.login}</span><time className="text-xs text-muted-foreground">{comment.createdAt.slice(0, 10)}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{comment.body}</p></div>
    </div>)}</div>
  </section>
}
