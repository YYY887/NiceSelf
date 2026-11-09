import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function FloatingSaveBar({ kind, busy, canSave, dirty, isDraft, onSaveDraft, onPublish, onDiscard }: {
  kind: "文章" | "项目"
  busy: boolean
  canSave: boolean
  dirty: boolean
  isDraft: boolean
  onSaveDraft: () => void
  onPublish: () => void
  onDiscard: () => void
}) {
  if (!dirty && !isDraft) return null

  return <Card className="fixed bottom-5 left-1/2 z-50 w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-0 border bg-popover/95 p-0 shadow-xl backdrop-blur-md">
    <CardContent className="flex flex-wrap items-center justify-center gap-2 p-2 sm:gap-3">
      <Badge variant="secondary">{dirty ? "有未保存修改" : "草稿待发布"}</Badge>
      {dirty && <Button size="sm" variant="ghost" disabled={busy} onClick={onDiscard}>放弃修改</Button>}
      {dirty && <Button size="sm" variant="outline" disabled={busy || !canSave} onClick={onSaveDraft}>{busy ? "保存中…" : isDraft ? "保存草稿" : "保存修改"}</Button>}
      <Button size="sm" disabled={busy || !canSave} onClick={onPublish}>{isDraft ? `发布${kind}` : `更新${kind}`}</Button>
    </CardContent>
  </Card>
}
