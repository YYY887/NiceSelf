import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { deleteResource, saveResource, type CategoryRecord, type TagRecord } from "@/lib/api"

function CollectionEditor<T extends CategoryRecord | TagRecord>({ title, resource, items, refresh, withDescription }: { title: string; resource: "categories" | "tags"; items: T[]; refresh: () => Promise<void>; withDescription?: boolean }) {
  const [editing, setEditing] = React.useState<T | null>(null)
  const [message, setMessage] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  function fresh() { setEditing({ id: 0, slug: "", name: "", ...(withDescription ? { description: "" } : {}) } as T); setMessage("") }
  async function save() {
    if (!editing) return
    setBusy(true); setMessage("")
    try { await saveResource<T>(resource, editing); await refresh(); setEditing(null) }
    catch (error) { setMessage(error instanceof Error ? error.message : "保存失败") }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!editing?.id || !window.confirm(`确定删除“${editing.name}”？`)) return
    setBusy(true)
    try { await deleteResource(resource, editing.id); await refresh(); setEditing(null) }
    catch (error) { setMessage(error instanceof Error ? error.message : "删除失败") }
    finally { setBusy(false) }
  }
  return <section className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">共 {items.length} 个</p></div><Button size="sm" onClick={fresh}><Plus data-icon="inline-start" />新建</Button></div><div className="overflow-hidden rounded-xl border bg-card/80"><Table><TableHeader><TableRow><TableHead>名称</TableHead><TableHead>Slug</TableHead><TableHead className="w-20 text-right">操作</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id} className="cursor-pointer" onClick={() => { setEditing(item); setMessage("") }}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-muted-foreground">{item.slug}</TableCell><TableCell className="text-right text-muted-foreground">编辑 →</TableCell></TableRow>)}</TableBody></Table>{items.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">暂无{title}</p>}</div>
    <Sheet open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}><SheetContent className="sm:max-w-md"><SheetHeader><SheetTitle>{editing?.id ? `编辑${title}` : `新建${title}`}</SheetTitle><SheetDescription>保存后会立即用于文章管理和前台筛选。</SheetDescription></SheetHeader>{editing && <div className="flex-1 space-y-5 overflow-y-auto px-4"><label className="block space-y-2 text-sm font-medium">名称<Input autoFocus value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><label className="block space-y-2 text-sm font-medium">Slug<Input value={editing.slug} onChange={(event) => setEditing({ ...editing, slug: event.target.value.toLowerCase() })} placeholder="用于文章链接和筛选" /></label>{withDescription && <label className="block space-y-2 text-sm font-medium">描述<Textarea rows={3} value={(editing as CategoryRecord).description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label>}{message && <p role="alert" className="text-sm text-destructive">{message}</p>}</div>}<SheetFooter className="flex-row justify-between sm:justify-between">{editing?.id ? <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={remove}><Trash2 data-icon="inline-start" />删除</Button> : <span />}<Button disabled={busy || !editing?.name.trim() || !editing?.slug.trim()} onClick={save}>保存</Button></SheetFooter></SheetContent></Sheet>
  </section>
}

export function TaxonomyEditor({ categories, tags, refresh }: { categories: CategoryRecord[]; tags: TagRecord[]; refresh: () => Promise<void> }) {
  return <div className="grid gap-10 xl:grid-cols-2"><CollectionEditor title="文章分类" resource="categories" items={categories} withDescription refresh={refresh} /><CollectionEditor title="标签" resource="tags" items={tags} refresh={refresh} /></div>
}
