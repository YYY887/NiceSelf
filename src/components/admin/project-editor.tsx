import * as React from "react"
import { closestCenter, DndContext } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ArrowLeft, ImagePlus, Images, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { ArticleImagePicker } from "@/components/admin/article-image-picker"
import { FloatingSaveBar } from "@/components/admin/floating-save-bar"
import { SortableContentRow } from "@/components/admin/sortable-content-row"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { assetHref, deleteResource, saveResource, type ProjectRecord, type UploadRecord } from "@/lib/api"
import { useLocalEditorDraft } from "@/hooks/use-local-editor-draft"
import { useContentOrder } from "@/hooks/use-content-order"

type ProjectDraft = ProjectRecord & { technologyText: string }
function projectURL(value: string) {
  const url = value.trim()
  if (!url || url.startsWith("/") || /^[a-z][a-z\d+.-]*:\/\//i.test(url)) return url
  return /^[^\s/?#]+\.[^\s/?#]+(?:[/?#].*)?$/.test(url) ? `https://${url}` : url
}
function validProjectURL(value: string) {
  if (!value || (value.startsWith("/") && !value.startsWith("//"))) return true
  try { const url = new URL(value); return url.protocol === "https:" && Boolean(url.hostname) }
  catch { return false }
}
function snapshot(project: ProjectDraft) {
  return JSON.stringify({ title: project.title, slug: project.slug, summary: project.summary, markdown: project.markdown, coverUrl: project.coverUrl, logoUrl: project.logoUrl, screenshots: project.screenshots, siteUrl: project.siteUrl, siteLabel: project.siteLabel, repoUrl: project.repoUrl, repoLabel: project.repoLabel, links: project.links || [], technologyText: project.technologyText, status: project.status, sortOrder: project.sortOrder })
}

function emptyProject(): ProjectRecord {
  return {
    id: 0, slug: "", title: "", summary: "", markdown: "", coverUrl: "", logoUrl: "",
    screenshots: [], videos: [], siteUrl: "", siteLabel: "查看网站", repoUrl: "", repoLabel: "GitHub", links: [], technologies: [], status: "draft",
    sortOrder: 0, createdAt: "", updatedAt: "",
  }
}

export function ProjectEditor({ projects, uploads, refresh }: { projects: ProjectRecord[]; uploads: UploadRecord[]; refresh: () => Promise<void> }) {
  const draft = useLocalEditorDraft<ProjectDraft>("project", snapshot)
  const { editing, setEditing } = draft
  const [message, setMessage] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [picker, setPicker] = React.useState<"screenshots" | "logo" | null>(null)
  const order = useContentOrder(projects, "projects", refresh)

  function open(project: ProjectRecord) {
    draft.open({ ...project, screenshots: [...(project.screenshots || [])], links: [...(project.links || [])], technologyText: project.technologies.join(", ") })
    setMessage("")
  }

  function update<K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) {
    setEditing((project) => project ? { ...project, [key]: value } : project)
  }

  function updateLink(index: number, key: "label" | "url", value: string) {
    setEditing((project) => project ? {
      ...project,
      links: (project.links || []).map((link, position) => position === index ? { ...link, [key]: value } : link),
    } : project)
  }

  async function save(status: ProjectRecord["status"]) {
    if (!editing) return
    if ((editing.links || []).some((link) => !link.label.trim() || !link.url.trim())) {
      toast.error("自定义按钮需要同时填写名称和链接")
      return
    }
    const addresses = [
      ["网站地址", editing.siteUrl], ["GitHub 仓库地址", editing.repoUrl],
      ...(editing.links || []).map((link, index) => [`其他链接 ${index + 1}`, link.url] as const),
    ] as const
    const invalid = addresses.find(([, value]) => !validProjectURL(projectURL(value)))
    if (invalid) { toast.error(`${invalid[0]}无效，请填写 https:// 开头的网址`); return }
    setBusy(true)
    setMessage("")
    try {
      const slug = editing.slug || editing.title.trim().toLowerCase()
        .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "")
        || `project-${Date.now().toString(36)}`
      const { technologyText, ...record } = editing
      const saved = await saveResource<ProjectRecord>("projects", {
        ...record, status, slug,
        siteUrl: projectURL(record.siteUrl), repoUrl: projectURL(record.repoUrl),
        links: (record.links || []).map((link) => ({ label: link.label.trim(), url: projectURL(link.url) })),
        technologies: technologyText.split(",").map((value) => value.trim()).filter(Boolean),
      })
      draft.markSaved({ ...saved, technologyText: saved.technologies.join(", ") }, editing.id)
      toast.success(status === "published" ? "项目已保存并发布" : "项目草稿已保存")
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!editing?.id || !window.confirm(`确定删除项目“${editing.title}”？`)) return
    try {
      await deleteResource("projects", editing.id)
      draft.remove()
      await refresh()
      toast.success("项目已删除")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败")
    }
  }

  function addScreenshots(urls: string[]) {
    setEditing((project) => {
      if (!project) return project
      const extra = urls.filter((url) => !project.screenshots.includes(url))
      if (!extra.length) return project
      return {
        ...project,
        screenshots: [...project.screenshots, ...extra],
        coverUrl: project.coverUrl || extra[0],
      }
    })
    setMessage("已从文件库加入截图，保存项目后生效")
  }

  function setLogo(url: string) {
    update("logoUrl", url)
    setMessage("已从文件库选择 Logo，保存项目后生效")
  }

  function removeScreenshot(index: number) {
    setEditing((project) => {
      if (!project) return project
      const screenshots = project.screenshots.filter((_, position) => position !== index)
      return {
        ...project, screenshots,
        coverUrl: project.coverUrl === project.screenshots[index] ? (screenshots[0] || "") : project.coverUrl,
      }
    })
  }

  if (!editing) {
    return <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">项目列表</h2><p className="mt-1 text-sm text-muted-foreground">共 {projects.length} 个项目 · 拖动左侧把手调整展示顺序</p></div>
        <Button onClick={() => open(emptyProject())}><Plus data-icon="inline-start" />新建项目</Button>
      </div>
      <DndContext sensors={order.sensors} collisionDetection={closestCenter} onDragEnd={order.onDragEnd}>
        <SortableContext items={order.ordered.map((project) => project.id)} strategy={verticalListSortingStrategy}>
      <div className="overflow-hidden rounded-xl border bg-card/80">
        <Table>
          <TableHeader><TableRow><TableHead className="w-12"><span className="sr-only">排序</span></TableHead><TableHead>项目</TableHead><TableHead>状态</TableHead><TableHead className="hidden sm:table-cell">截图</TableHead><TableHead className="w-20 text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>{order.ordered.map((project) => <SortableContentRow key={project.id} id={project.id} title={project.title} disabled={order.busy} onOpen={() => open(project)}>
            <TableCell><div className="font-medium">{project.title}</div><div className="mt-1 max-w-xl truncate text-xs text-muted-foreground">{project.summary}</div></TableCell>
            <TableCell><Badge variant={project.status === "published" ? "secondary" : "outline"}>{project.status === "published" ? "已发布" : "草稿"}</Badge></TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">{project.screenshots?.length || (project.coverUrl ? 1 : 0)} 张</TableCell>
            <TableCell className="text-right text-muted-foreground">编辑 →</TableCell>
          </SortableContentRow>)}</TableBody>
        </Table>
        {projects.length === 0 && <p className="p-12 text-center text-sm text-muted-foreground">暂无项目</p>}
      </div>
        </SortableContext>
      </DndContext>
    </div>
  }

  return <div className="max-w-6xl space-y-6 pb-28">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" onClick={draft.close}><ArrowLeft data-icon="inline-start" />返回项目列表</Button>
      <Badge variant="outline">{editing.status === "published" ? "已发布" : "草稿"}</Badge>
    </div>

    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{editing.id ? "编辑项目" : "新建项目"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">按信息、介绍和素材分别配置项目。</p>
    </div>

    <Card>
      <CardHeader><CardTitle>基本信息</CardTitle><CardDescription>访客在项目列表中首先看到的内容。</CardDescription></CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2"><span className="text-sm font-medium">项目名称</span><Input value={editing.title} onChange={(event) => update("title", event.target.value)} placeholder="例如：QianQiu-MySelf" /></label>
        <label className="space-y-2 md:col-span-2"><span className="text-sm font-medium">一句话介绍</span><Textarea rows={2} value={editing.summary} onChange={(event) => update("summary", event.target.value)} placeholder="简要介绍项目解决了什么问题" /></label>
        <label className="space-y-2"><span className="text-sm font-medium">链接标识</span><Input value={editing.slug} onChange={(event) => update("slug", event.target.value.toLowerCase())} placeholder="默认根据项目名称生成" /></label>
        <label className="space-y-2"><span className="text-sm font-medium">技术栈</span><Input value={editing.technologyText} onChange={(event) => update("technologyText", event.target.value)} placeholder="React, Go, SQLite" /><span className="block text-xs text-muted-foreground">多个技术用逗号分隔</span></label>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>项目说明</CardTitle><CardDescription>介绍功能、设计思路或开发过程，支持 Markdown。</CardDescription></CardHeader>
      <CardContent><Textarea className="min-h-52 resize-y font-mono leading-7" value={editing.markdown} onChange={(event) => update("markdown", event.target.value)} placeholder="写下项目的详细介绍…" /></CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>项目截图</CardTitle>
        <CardDescription>从文件库选择或上传多张截图，并为项目指定一张封面。</CardDescription>
        <CardAction>
          <Button variant="outline" disabled={busy} onClick={() => { setPicker("screenshots"); void refresh() }}><Images data-icon="inline-start" />从文件库选择</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {editing.screenshots.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {editing.screenshots.map((url, index) => <div key={`${url}-${index}`} className="overflow-hidden rounded-lg border bg-muted/20">
            <img src={assetHref(url)} alt={`${editing.title || "项目"}截图 ${index + 1}`} className="aspect-video w-full object-cover" />
            <div className="flex items-center justify-between gap-2 p-2">
              <Button size="sm" variant={editing.coverUrl === url ? "secondary" : "ghost"} onClick={() => update("coverUrl", url)}>{editing.coverUrl === url ? "封面" : "设为封面"}</Button>
              <Button size="icon-sm" variant="ghost" aria-label={`移除第 ${index + 1} 张截图`} onClick={() => removeScreenshot(index)}><X /></Button>
            </div>
          </div>)}
        </div> : <button type="button" className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-sm text-muted-foreground hover:bg-muted/30" onClick={() => { setPicker("screenshots"); void refresh() }}>
          <ImagePlus className="size-6" /><span>还没有截图，从文件库选择或上传</span>
        </button>}
      </CardContent>
    </Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>项目 Logo</CardTitle><CardDescription>可选图片，显示在项目介绍旁。</CardDescription></CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
            {editing.logoUrl ? <img src={assetHref(editing.logoUrl)} alt="项目 Logo 预览" className="size-full object-contain" /> : <ImagePlus className="size-6 text-muted-foreground" />}
          </div>
          <Button variant="outline" disabled={busy} onClick={() => { setPicker("logo"); void refresh() }}>{editing.logoUrl ? "更换 Logo" : "从文件库选择"}</Button>
          {editing.logoUrl && <Button variant="ghost" onClick={() => update("logoUrl", "")}>移除</Button>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>链接与按钮</CardTitle><CardDescription>填写地址才会在项目详情显示按钮，可自行修改按钮名称。</CardDescription></CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field><FieldLabel htmlFor="project-site-url">网站地址</FieldLabel><Input id="project-site-url" value={editing.siteUrl} onChange={(event) => update("siteUrl", event.target.value)} placeholder="qianqiu.dev 或 https://…" /></Field>
              <Field><FieldLabel htmlFor="project-site-label">网站按钮名称</FieldLabel><Input id="project-site-label" value={editing.siteLabel || ""} onChange={(event) => update("siteLabel", event.target.value)} placeholder="查看网站" /></Field>
              <Field><FieldLabel htmlFor="project-repo-url">GitHub 仓库地址</FieldLabel><Input id="project-repo-url" value={editing.repoUrl} onChange={(event) => update("repoUrl", event.target.value)} placeholder="https://github.com/…" /></Field>
              <Field><FieldLabel htmlFor="project-repo-label">GitHub 按钮名称</FieldLabel><Input id="project-repo-label" value={editing.repoLabel || ""} onChange={(event) => update("repoLabel", event.target.value)} placeholder="GitHub" /></Field>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-medium">其他链接</p><p className="text-xs text-muted-foreground">例如文档、下载地址或演示页面。</p></div>
              <Button variant="outline" size="sm" onClick={() => update("links", [...(editing.links || []), { label: "", url: "" }])}><Plus data-icon="inline-start" />添加按钮</Button>
            </div>
            {(editing.links || []).map((link, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <Field><FieldLabel htmlFor={`project-link-label-${index}`}>按钮名称 {index + 1}</FieldLabel><Input id={`project-link-label-${index}`} value={link.label} onChange={(event) => updateLink(index, "label", event.target.value)} placeholder="查看文档" /></Field>
                  <Field><FieldLabel htmlFor={`project-link-url-${index}`}>链接地址 {index + 1}</FieldLabel><Input id={`project-link-url-${index}`} value={link.url} onChange={(event) => updateLink(index, "url", event.target.value)} placeholder="https://…" /></Field>
                </div>
                <Button variant="ghost" size="icon" aria-label={`删除第 ${index + 1} 个按钮`} onClick={() => update("links", (editing.links || []).filter((_, position) => position !== index))}><X /></Button>
              </div>
            ))}
          </FieldGroup>
        </CardContent>
      </Card>
    </div>

    {editing.id > 0 && <Card><CardHeader><CardTitle>管理项目</CardTitle><CardDescription>删除后，此项目将从网站和后台列表中移除。</CardDescription></CardHeader><CardContent><Button variant="destructive" onClick={remove}><Trash2 data-icon="inline-start" />删除项目</Button></CardContent></Card>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    <FloatingSaveBar kind="项目" busy={busy} canSave={Boolean(editing.title.trim())} dirty={draft.dirty} isDraft={editing.status === "draft" && (editing.id > 0 || draft.dirty)} onSaveDraft={() => save(editing.status)} onPublish={() => save("published")} onDiscard={draft.discard} />
    <ArticleImagePicker
      open={picker === "screenshots"}
      onOpenChange={(open) => setPicker(open ? "screenshots" : null)}
      uploads={uploads}
      refreshUploads={refresh}
      multiple
      excludeUrls={editing.screenshots}
      title="从文件库选择截图"
      description="勾选已有图片加入项目，也可以直接上传新截图。"
      onSelect={(url) => addScreenshots([url])}
      onSelectMany={(items) => addScreenshots(items.map((item) => item.url))}
    />
    <ArticleImagePicker
      open={picker === "logo"}
      onOpenChange={(open) => setPicker(open ? "logo" : null)}
      uploads={uploads}
      refreshUploads={refresh}
      excludeUrls={editing.logoUrl ? [editing.logoUrl] : []}
      title="从文件库选择 Logo"
      description="选择已有图片作为项目 Logo，也可以上传新图片。"
      onSelect={(url) => setLogo(url)}
    />
  </div>
}
