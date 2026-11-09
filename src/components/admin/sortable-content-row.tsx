import type * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"

export function SortableContentRow({ id, title, disabled, onOpen, children }: {
  id: number
  title: string
  disabled?: boolean
  onOpen: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return <TableRow ref={setNodeRef} onClick={onOpen} className="cursor-pointer" style={{ transform: CSS.Transform.toString(transform), transition, position: "relative", zIndex: isDragging ? 1 : undefined, opacity: isDragging ? 0.85 : undefined }}>
    <TableCell className="w-12 px-2">
      <Button type="button" size="icon-sm" variant="ghost" {...attributes} {...listeners} disabled={disabled} onClick={(event) => event.stopPropagation()} aria-label={`拖动排序：${title}`} title={`拖动排序：${title}`} className="cursor-grab touch-none active:cursor-grabbing"><GripVertical aria-hidden="true" /></Button>
    </TableCell>
    {children}
  </TableRow>
}
