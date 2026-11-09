import * as React from "react"
import { Link, useNavigate, useParams } from "react-router"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { AdminSidebar, type AdminSection } from "@/components/admin/admin-sidebar"
import { AssetManager } from "@/components/admin/asset-manager"
import { BackupManager } from "@/components/admin/backup-manager"
import { ArticleEditor } from "@/components/admin/article-editor"
import { CommentModeration } from "@/components/admin/comment-moderation"
import { ProjectEditor } from "@/components/admin/project-editor"
import { SiteSettingsEditor } from "@/components/admin/site-settings"
import { TaxonomyEditor } from "@/components/admin/taxonomy-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AdminFallback } from "@/components/page-fallback"
import { PageEnter } from "@/components/reveal"
import { adminLogin, api, type AuthUser, type BackupRecord, type CommentRecord, type SiteContent, type UploadRecord } from "@/lib/api"
import { preloadLakeRuntime } from "@/lib/lake-runtime"

const sectionInfo: Record<AdminSection, { title: string; description: string }> = {
  overview: { title: "工作台", description: "站点内容与写作进度，一眼看清。" },
  articles: { title: "文章", description: "写作、导入 Markdown、保存草稿与发布。" },
  projects: { title: "项目", description: "展示作品，维护截图和项目说明。" },
  taxonomy: { title: "分类与标签", description: "整理文章的主题和检索线索。" },
  files: { title: "文件库", description: "上传图片与附件，分别保存本地名、存储名和链接。" },
  comments: { title: "评论", description: "查看、隐藏、恢复或删除读者评论。" },
  backups: { title: "数据备份", description: "创建内容库快照并下载保存。" },
  settings: { title: "站点设置", description: "更新站点文案、GitHub 登录与附件 WebDAV 存储。" },
}

export function AdminPage() {
  const { section: sectionParam } = useParams()
  const navigate = useNavigate()
  const section: AdminSection = sectionParam && sectionParam in sectionInfo ? sectionParam as AdminSection : "overview"
  const selectSection = React.useCallback((next: AdminSection) => navigate(next === "overview" ? "/admin" : `/admin/${next}`), [navigate])
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [content, setContent] = React.useState<SiteContent | null>(null)
  const [comments, setComments] = React.useState<CommentRecord[]>([])
  const [uploads, setUploads] = React.useState<UploadRecord[]>([])
  const [backups, setBackups] = React.useState<BackupRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const refresh = React.useCallback(async () => {
    const nextContent = await api<SiteContent>("/admin/content")
    setContent(nextContent)
    const [nextComments, nextUploads, nextBackups] = await Promise.all([
      api<CommentRecord[]>("/admin/comments").catch(() => []),
      api<UploadRecord[]>("/admin/uploads").catch(() => []),
      api<BackupRecord[]>("/admin/backups").catch(() => []),
    ])
    setComments(nextComments)
    setUploads(nextUploads)
    setBackups(nextBackups)
  }, [])

  React.useEffect(() => {
    api<{ user: AuthUser | null }>("/auth/me")
      .then(async (auth) => {
        setUser(auth.user)
        if (auth.user?.role === "admin") {
          preloadLakeRuntime()
          await refresh()
        }
      })
      .catch(() => setError("无法连接 API，请先启动后端。"))
      .finally(() => setLoading(false))
  }, [refresh])

  async function login(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const auth = await adminLogin(username, password)
      setUser(auth.user)
      setPassword("")
      preloadLakeRuntime()
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "登录失败")
    } finally {
      setSubmitting(false)
    }
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" })
    window.location.reload()
  }

  if (loading) return <AdminFallback />
  if (!user || user.role !== "admin") return <main className="mx-auto max-w-xl px-6 pt-36 pb-20"><Card><CardHeader><CardTitle>管理后台</CardTitle><CardDescription>使用管理员账号密码登录。初始账号为 admin / qianqiu123，登录后请尽快修改。</CardDescription></CardHeader><CardContent>
    <form onSubmit={login}><FieldGroup>
      <Field><FieldLabel htmlFor="admin-username">账号</FieldLabel><Input id="admin-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></Field>
      <Field><FieldLabel htmlFor="admin-password">密码</FieldLabel><Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3"><Button type="submit" disabled={submitting || !username || !password}>{submitting ? "登录中…" : "登录"}</Button><Button asChild variant="outline"><Link to="/">返回首页</Link></Button></div>
    </FieldGroup></form>
  </CardContent></Card></main>
  if (!content) return <main className="mx-auto max-w-5xl px-6 pt-36">{error || "内容读取失败，请刷新重试。"}</main>

  return <TooltipProvider><SidebarProvider className="relative z-10 bg-background">
    <AdminSidebar active={section} onSelect={(next) => { selectSection(next); if (next === "files" || next === "backups") void refresh() }} user={user} content={content} commentCount={comments.length} uploadCount={uploads.length} />
    <SidebarInset className="relative min-h-0 min-w-0 overflow-auto bg-background">
      {section === "articles" ? (
        <ArticleEditor articles={content.articles} categories={content.categories} tags={content.tags} uploads={uploads} refresh={refresh} onLogout={logout} />
      ) : (
        <div className="w-full min-w-0 px-5 py-8 md:px-8 lg:px-10 lg:py-10">
          <div className="mb-8 flex items-start justify-between gap-4"><div>{section !== "projects" && section !== "taxonomy" && <><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{sectionInfo[section].title}</h1><p className="mt-2 text-sm text-muted-foreground">{sectionInfo[section].description}</p></>}</div><div className="flex items-center gap-2"><SidebarTrigger className="md:hidden" /><Button size="sm" variant="outline" onClick={logout}>退出</Button></div></div>
          <PageEnter key={section}>
            {section === "overview" && <AdminDashboard content={content} comments={comments} onSelect={selectSection} />}
            {section === "projects" && <ProjectEditor projects={content.projects} uploads={uploads} refresh={refresh} />}
            {section === "taxonomy" && <TaxonomyEditor categories={content.categories} tags={content.tags} refresh={refresh} />}
            {section === "files" && <AssetManager uploads={uploads} content={content} refresh={refresh} />}
            {section === "comments" && <CommentModeration comments={comments} articles={content.articles} refresh={refresh} />}
            {section === "backups" && <BackupManager backups={backups} refresh={refresh} />}
            {section === "settings" && <SiteSettingsEditor settings={content.settings} user={user} refresh={refresh} />}
          </PageEnter>
        </div>
      )}
    </SidebarInset>
    <Toaster richColors position="top-right" />
  </SidebarProvider></TooltipProvider>
}
