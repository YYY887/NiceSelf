import * as React from "react"
import { toast } from "sonner"

type RecordWithId = { id: number }
type StoredDraft<T> = { version: 1; value: T }

function draftKey(kind: string, id: number) {
  return `qianqiu:admin-draft:${kind}:${id || "new"}`
}

function readDraft<T>(kind: string, id: number): T | null {
  try {
    const raw = localStorage.getItem(draftKey(kind, id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDraft<T>
    return parsed.version === 1 && parsed.value ? parsed.value : null
  } catch {
    return null
  }
}

function removeDraft(kind: string, id: number) {
  try { localStorage.removeItem(draftKey(kind, id)) } catch { /* Storage may be unavailable. */ }
}

export function useLocalEditorDraft<T extends RecordWithId>(kind: string, snapshot: (value: T) => string) {
  const [editing, setEditing] = React.useState<T | null>(null)
  const source = React.useRef<T | null>(null)
  const [baseline, setBaseline] = React.useState("")
  const storageWarningShown = React.useRef(false)
  const dirty = editing !== null && snapshot(editing) !== baseline

  React.useEffect(() => {
    if (!editing) return
    const key = draftKey(kind, editing.id)
    try {
      if (dirty) localStorage.setItem(key, JSON.stringify({ version: 1, value: editing } satisfies StoredDraft<T>))
      else localStorage.removeItem(key)
    } catch {
      if (!storageWarningShown.current) {
        toast.error("浏览器暂存失败，请及时手动保存")
        storageWarningShown.current = true
      }
    }
  }, [editing, dirty, kind])

  function open(value: T) {
    const restored = readDraft<T>(kind, value.id)
    const hasChanges = restored !== null && snapshot(restored) !== snapshot(value)
    source.current = value
    setBaseline(snapshot(value))
    setEditing(hasChanges ? restored : value)
    if (hasChanges) toast.info("已恢复上次未保存的本地内容")
    return hasChanges
  }

  function markSaved(saved: T, previousId: number) {
    removeDraft(kind, previousId)
    removeDraft(kind, saved.id)
    source.current = saved
    setBaseline(snapshot(saved))
    setEditing(saved)
  }

  function discard() {
    if (editing) removeDraft(kind, editing.id)
    if (source.current) setEditing({ ...source.current })
  }

  function remove() {
    if (editing) removeDraft(kind, editing.id)
    setEditing(null)
    source.current = null
    setBaseline("")
  }

  function close() {
    setEditing(null)
    source.current = null
    setBaseline("")
  }

  return { editing, setEditing, dirty, open, markSaved, discard, remove, close }
}
