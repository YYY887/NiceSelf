import * as React from "react"
import {
  Bold,
  CalendarDays,
  Code2,
  Copy,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Lock,
  Minus,
  Paperclip,
  Plus,
  Quote,
  Redo2,
  SquareChevronRight,
  Strikethrough,
  Table2,
  Undo2,
} from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type EditorInsertKind = "image" | "file" | "note" | "highlight" | "fold" | "lock" | "link" | "copy" | "table" | "date" | "hr" | "code" | "task"
export type EditorFormatKind = "undo" | "redo" | "paragraph" | "h1" | "h2" | "h3" | "h4" | "bold" | "italic" | "strike" | "bullet" | "ordered" | "task" | "link" | "quote" | "code" | "hr" | "date"

const insertGroups = [
  {
    group: "基础",
    items: [
      { kind: "image" as const, label: "图片", icon: ImagePlus },
      { kind: "table" as const, label: "表格", icon: Table2 },
      { kind: "file" as const, label: "附件", icon: Paperclip },
      { kind: "code" as const, label: "代码块", icon: Code2 },
      { kind: "copy" as const, label: "复制块", icon: Copy },
    ],
  },
  {
    group: "卡片",
    items: [
      { kind: "note" as const, label: "提示框", icon: Quote },
      { kind: "highlight" as const, label: "高亮块", icon: Highlighter },
      { kind: "fold" as const, label: "折叠块", icon: SquareChevronRight },
      { kind: "lock" as const, label: "密码块", icon: Lock },
      { kind: "link" as const, label: "链接卡片", icon: Link2 },
    ],
  },
  {
    group: "其他",
    items: [
      { kind: "date" as const, label: "日期", icon: CalendarDays },
      { kind: "hr" as const, label: "分割线", icon: Minus },
      { kind: "task" as const, label: "待办", icon: ListTodo },
    ],
  },
]

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 hover:bg-muted hover:text-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border" />
}

export function ArticleEditorToolbar({
  onFormat,
  onInsert,
}: {
  onFormat: (kind: EditorFormatKind) => void
  onInsert: (kind: EditorInsertKind) => void
}) {
  const [open, setOpen] = React.useState(false)
  const root = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [open])

  return (
    <div className="article-editor-toolbar" onMouseDown={(event) => event.preventDefault()}>
      <div ref={root} className="relative shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="插入"
              aria-expanded={open}
              className="inline-flex size-7 items-center justify-center rounded-full bg-[#00b42a] text-white hover:bg-[#009a25]"
              onClick={() => setOpen((value) => !value)}
            >
              <Plus className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">插入</TooltipContent>
        </Tooltip>
        {open && (
          <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-52 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            {insertGroups.map((section) => (
              <div key={section.group}>
                <div className="px-1.5 py-1 text-xs text-muted-foreground">{section.group}</div>
                {section.items.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    className="relative flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                    onClick={() => {
                      setOpen(false)
                      onInsert(item.kind)
                    }}
                  >
                    <item.icon />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <ToolButton label="撤销" onClick={() => onFormat("undo")}><Undo2 /></ToolButton>
      <ToolButton label="重做" onClick={() => onFormat("redo")}><Redo2 /></ToolButton>
      <Divider />
      <Select
        defaultValue="paragraph"
        onValueChange={(value) => onFormat(value as EditorFormatKind)}
      >
        <SelectTrigger size="sm" className={cn("h-7 min-w-[4.5rem] border-0 bg-transparent px-1.5 shadow-none dark:bg-transparent")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">正文</SelectItem>
          <SelectItem value="h1">标题 1</SelectItem>
          <SelectItem value="h2">标题 2</SelectItem>
          <SelectItem value="h3">标题 3</SelectItem>
          <SelectItem value="h4">标题 4</SelectItem>
        </SelectContent>
      </Select>
      <Divider />
      <ToolButton label="加粗" onClick={() => onFormat("bold")}><Bold /></ToolButton>
      <ToolButton label="斜体" onClick={() => onFormat("italic")}><Italic /></ToolButton>
      <ToolButton label="删除线" onClick={() => onFormat("strike")}><Strikethrough /></ToolButton>
      <Divider />
      <ToolButton label="无序列表" onClick={() => onFormat("bullet")}><List /></ToolButton>
      <ToolButton label="有序列表" onClick={() => onFormat("ordered")}><ListOrdered /></ToolButton>
      <ToolButton label="待办列表" onClick={() => onFormat("task")}><ListTodo /></ToolButton>
      <Divider />
      <ToolButton label="链接" onClick={() => onFormat("link")}><Link2 /></ToolButton>
      <ToolButton label="引用" onClick={() => onFormat("quote")}><Quote /></ToolButton>
      <ToolButton label="代码块" onClick={() => onFormat("code")}><Code2 /></ToolButton>
      <ToolButton label="分割线" onClick={() => onFormat("hr")}><Minus /></ToolButton>
      <ToolButton label="日期" onClick={() => onFormat("date")}><CalendarDays /></ToolButton>
      <ToolButton label="高亮块" onClick={() => onInsert("highlight")}><Highlighter /></ToolButton>
      <ToolButton label="折叠块" onClick={() => onInsert("fold")}><SquareChevronRight /></ToolButton>
      <ToolButton label="密码块" onClick={() => onInsert("lock")}><Lock /></ToolButton>
    </div>
  )
}
