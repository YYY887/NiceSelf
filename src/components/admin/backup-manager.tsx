import * as React from "react"
import { DatabaseBackup, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { api, type BackupRecord } from "@/lib/api"

export function BackupManager({ backups, refresh }: { backups: BackupRecord[]; refresh: () => Promise<void> }) {
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState("")

  async function create() {
    setBusy(true); setMessage("")
    try { await api<BackupRecord>("/admin/backups", { method: "POST" }); await refresh(); setMessage("数据快照已创建，可从下方下载。") }
    catch (error) { setMessage(error instanceof Error ? error.message : "备份失败") }
    finally { setBusy(false) }
  }

  return <div className="flex flex-col gap-6">
    <Card className="bg-card/85"><CardHeader><CardTitle>数据备份</CardTitle><CardDescription>创建当前内容库的快照并下载保存。本地 Go 为 SQLite 文件，线上 Cloudflare 为 JSON 快照。</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center gap-3">
      <Button disabled={busy} onClick={create}><DatabaseBackup data-icon="inline-start" />{busy ? "正在创建…" : "创建备份"}</Button>
      <span className="text-xs text-muted-foreground">备份包含文章、项目、配置与评论；上传的实体文件保存在独立目录。</span>
      {message && <p role="status" className="w-full text-sm text-muted-foreground">{message}</p>}
    </CardContent></Card>
    <Card className="bg-card/85"><CardHeader><CardTitle>备份记录</CardTitle><CardDescription>仅管理员可下载；请妥善保存数据库文件。</CardDescription></CardHeader><CardContent className="flex flex-col">
      {backups.map((item, index) => <div key={item.name}>{index > 0 && <Separator />}<div className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("zh-CN")} · {(item.size / 1024).toFixed(0)} KB</p></div><Button size="sm" variant="outline" asChild><a href={`/api/admin/backups/${item.name}`} download><Download data-icon="inline-start" />下载</a></Button></div></div>)}
      {backups.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">还没有备份。</p>}
    </CardContent></Card>
  </div>
}
