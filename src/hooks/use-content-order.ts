import * as React from "react"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { toast } from "sonner"

import { api } from "@/lib/api"

export function useContentOrder<T extends { id: number }>(items: T[], resource: "articles" | "projects", refresh: () => Promise<void>) {
  const [optimistic, setOptimistic] = React.useState<{ source: T[]; ids: number[] } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ordered = React.useMemo(() => {
    const orderIds = optimistic?.source === items ? optimistic.ids : items.map((item) => item.id)
    const byId = new Map(items.map((item) => [item.id, item]))
    const known = orderIds.map((id) => byId.get(id)).filter((item): item is T => Boolean(item))
    const added = items.filter((item) => !orderIds.includes(item.id))
    return [...known, ...added]
  }, [items, optimistic])

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (busy || !over || active.id === over.id) return
    const previous = ordered.map((item) => item.id)
    const from = previous.indexOf(Number(active.id))
    const to = previous.indexOf(Number(over.id))
    if (from < 0 || to < 0) return
    const next = arrayMove(previous, from, to)
    setOptimistic({ source: items, ids: next })
    setBusy(true)
    try {
      await api(`/admin/${resource}/order`, { method: "PUT", body: JSON.stringify({ ids: next }) })
      await refresh()
      toast.success(resource === "articles" ? "文章顺序已保存" : "项目顺序已保存")
    } catch (error) {
      setOptimistic(null)
      toast.error(error instanceof Error ? error.message : "排序保存失败")
    } finally {
      setBusy(false)
    }
  }

  return { ordered, busy, sensors, onDragEnd }
}
