import * as React from "react"
import { Crepe } from "@milkdown/crepe"
import { editorViewCtx } from "@milkdown/kit/core"
import type { Node } from "@milkdown/kit/prose/model"
import { createCodeBlockCommand, toggleEmphasisCommand, toggleStrongCommand, wrapInBlockquoteCommand, wrapInHeadingCommand } from "@milkdown/kit/preset/commonmark"
import { callCommand, insert } from "@milkdown/kit/utils"
import { Bold, Code2, Copy, Heading2, ImagePlus, Italic, Lightbulb, Link2, Paperclip, Quote, Table2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ArticleImagePicker } from "@/components/admin/article-image-picker"
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu"
import { uploadAsset, type UploadRecord } from "@/lib/api"
import { parseCallout } from "@/lib/article-callout"
import { siteCodeTheme } from "@/lib/editor-code-theme"
import { editorEmbedPlugin } from "@/lib/editor-embed-plugin"
import { cn } from "@/lib/utils"
import "@milkdown/crepe/theme/common/style.css"
import "@/styles/code-block.css"
import "@/styles/admin-editor.css"
import "@/styles/video-player.css"

const menuItemClass = "relative flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

const structuralBlocks = new Set(["image-block", "image", "code_block", "table", "blockquote", "bullet_list", "ordered_list", "heading"])

function describeBlock(node: Node) {
  const name = node.type.name
  if (name === "image" || name === "image-block") {
    const ratio = name === "image-block" ? Number(node.attrs.ratio) : Number(node.attrs.alt)
    return {
      label: "这张图片",
      image: {
        kind: name as "image" | "image-block",
        src: String(node.attrs.src || ""),
        ratio: Number.isFinite(ratio) && ratio > 0 ? ratio : 0.6,
      },
    }
  }
  if (name === "code_block") {
    const language = String(node.attrs.language || "").toLowerCase()
    return { label: language === "copy" || language === "copytext" ? "这个复制块" : "这个代码块" }
  }
  if (name === "table") return { label: "这张表格" }
  if (name === "blockquote") return { label: parseCallout(node.textContent) ? "这个提示框" : "这个引用" }
  if (name === "bullet_list" || name === "ordered_list") return { label: "这个列表" }
  if (name === "heading") return { label: "这个标题" }
  return { label: "这个块" }
}

function withDefaultImageSize(markdown: string) {
  return markdown.replace(/^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)$/gm, (_match, alt: string, url: string, caption?: string) => {
    if (/^0\.\d{1,2}$|^1(?:\.0{1,2})?$/.test(alt)) return _match
    return `![0.60](${url}${caption || alt ? ` "${caption || alt}"` : ""})`
  })
}

export function ArticleVisualEditor({ markdown, onChange, uploads, refreshUploads }: { markdown: string; onChange: (value: string) => void; uploads: UploadRecord[]; refreshUploads: () => Promise<void> }) {
  const root = React.useRef<HTMLDivElement>(null)
  const editor = React.useRef<Crepe | null>(null)
  const onChangeRef = React.useRef(onChange)
  const [error, setError] = React.useState("")
  const [pickerKind, setPickerKind] = React.useState<"image" | "file" | null>(null)
  const [selectedBlock, setSelectedBlock] = React.useState<{ pos: number; size: number; label: string; image?: { kind: "image" | "image-block"; src: string; ratio: number } } | null>(null)
  const [slash, setSlash] = React.useState<{ x: number; y: number; from: number } | null>(null)
  const [slashIndex, setSlashIndex] = React.useState(0)
  const [slashQuery, setSlashQuery] = React.useState("/")
  React.useEffect(() => { onChangeRef.current = onChange }, [onChange])

  React.useEffect(() => {
    if (!root.current) return
    let disposed = false
    let ready = false
    const crepe = new Crepe({
      root: root.current,
      defaultValue: withDefaultImageSize(markdown),
      features: {
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.BlockEdit]: false,
      },
      featureConfigs: {
        [Crepe.Feature.CodeMirror]: { theme: siteCodeTheme },
        [Crepe.Feature.ImageBlock]: {
          onUpload: async (file) => (await uploadAsset(file)).url,
        },
        [Crepe.Feature.Placeholder]: { text: "从这里开始写作… 输入 / 或右键插入内容", mode: "doc" },
      },
    })
    editor.current = crepe
    crepe.editor.use(editorEmbedPlugin)
    const syncCodeBlocks = () => {
      root.current?.querySelectorAll<HTMLElement>(".milkdown-code-block").forEach((block) => {
        const language = (block.querySelector(".language-button")?.childNodes[0]?.textContent || "").trim().toLowerCase()
        block.dataset.language = language
        const text = (block.querySelector(".cm-content")?.textContent || block.querySelector(".milkdown-code-block-placeholder")?.textContent || "").replace(/\u200b/g, "").trim()
        block.classList.toggle("is-empty", !text)
      })
    }
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, value) => {
        onChangeRef.current(value)
        syncCodeBlocks()
      })
    })
    const observer = new MutationObserver(syncCodeBlocks)
    void crepe.create().then(() => {
      ready = true
      if (disposed) {
        void crepe.destroy()
        return
      }
      if (root.current) observer.observe(root.current, { subtree: true, childList: true, characterData: true })
      syncCodeBlocks()
    }).catch(() => {
      if (!disposed) setError("编辑器加载失败，请刷新页面重试")
    })
    return () => {
      disposed = true
      observer.disconnect()
      if (editor.current === crepe) editor.current = null
      if (ready) void crepe.destroy()
    }
    // The editor is rebuilt only when a different article is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectContextTarget(event: React.MouseEvent<HTMLDivElement>) {
    if (!editor.current) { setSelectedBlock(null); return }
    let next: typeof selectedBlock = null
    editor.current.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const target = event.target as Element
      const embed = target.closest(".editor-embed-preview")
      const host = embed?.previousElementSibling instanceof HTMLElement ? embed.previousElementSibling : target.closest(".milkdown-code-block, .milkdown-table-block, .milkdown-image-block, .milkdown-image-inline, blockquote, .editor-has-embed, h1, h2, h3, h4, h5, h6")
      let pos = -1
      try {
        if (host) pos = view.posAtDOM(host, 0)
      } catch { /* coords fallback */ }
      if (pos < 0) {
        const hit = view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (!hit) return
        pos = hit.inside >= 0 ? hit.inside : hit.pos
      }
      const $pos = view.state.doc.resolve(Math.min(pos, view.state.doc.content.size))
      let picked: { node: Node; pos: number } | null = null
      for (let depth = $pos.depth; depth >= 1; depth--) {
        const node = $pos.node(depth)
        const at = $pos.before(depth)
        if (structuralBlocks.has(node.type.name)) { picked = { node, pos: at }; break }
        if (node.type.name === "paragraph" && !picked) picked = { node, pos: at }
      }
      if (!picked) return
      const info = describeBlock(picked.node)
      next = { pos: picked.pos, size: picked.node.nodeSize, label: info.label, image: info.image }
    })
    setSelectedBlock(next)
  }

  function resizeImage(percent: number) {
    if (!selectedBlock?.image || !editor.current) return
    const { pos, image } = selectedBlock
    editor.current.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const node = view.state.doc.nodeAt(pos)
      if (!node || node.type.name !== image.kind || node.attrs.src !== image.src) return
      const attribute = image.kind === "image-block" ? "ratio" : "alt"
      const value = image.kind === "image-block" ? percent / 100 : (percent / 100).toFixed(2)
      view.dispatch(view.state.tr.setNodeAttribute(pos, attribute, value))
    })
    setSelectedBlock({ ...selectedBlock, image: { ...image, ratio: percent / 100 } })
  }

  function removeBlock() {
    if (!selectedBlock || !editor.current) return
    let removed = false
    editor.current.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const node = view.state.doc.nodeAt(selectedBlock.pos)
      if (!node || node.nodeSize !== selectedBlock.size) return
      const { tr, schema, doc } = view.state
      if (doc.childCount === 1) view.dispatch(tr.replaceWith(0, doc.content.size, schema.nodes.paragraph.create()))
      else view.dispatch(tr.delete(selectedBlock.pos, selectedBlock.pos + selectedBlock.size))
      removed = true
    })
    setSelectedBlock(null)
    if (removed) toast.success(`已删除${selectedBlock.label}`)
    else toast.error("这个块的位置已变化，请重新右键选择")
  }

  function insertImageUrl(url: string, name: string) {
    const alt = name.replace(/\.[^.]+$/, "").replace(/\[|\]|"/g, "")
    editor.current?.editor.action(insert(`![0.60](${url} "${alt}")`))
  }

  function insertFileUrl(url: string, name: string) {
    const label = name.replace(/\[|\]|\(|\)/g, "").trim() || "附件"
    editor.current?.editor.action(insert(`\n[${label}](${url})\n\n`))
    toast.success(`已插入附件 ${label}`)
  }

  function openPicker(kind: "image" | "file") {
    setPickerKind(kind)
    void refreshUploads()
  }

  async function copySelectedText() {
    if (!editor.current) return
    let selectedText = ""
    editor.current.editor.action((ctx) => {
      const { state } = ctx.get(editorViewCtx)
      selectedText = state.doc.textBetween(state.selection.from, state.selection.to, "\n")
    })
    if (!selectedText) { toast.info("请先选中要复制的文字"); return }
    try { await navigator.clipboard.writeText(selectedText); toast.success("文字已复制") }
    catch { toast.error("复制失败，请使用 Ctrl+C") }
  }

  function insertBlock(kind: "note" | "link" | "copy" | "table") {
    const snippet = kind === "note" ? '\n> [!NOTE]\n> \n\n' : kind === "link" ? '\nhttps://example.com\n\n' : kind === "table" ? '\n| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n|     |     |     |\n|     |     |     |\n\n' : '\n```copy\n\n```\n\n'
    editor.current?.editor.action(insert(snippet))
    toast.info(kind === "note" ? "已插入提示框" : kind === "link" ? "已插入链接卡片，请改成实际网址" : kind === "table" ? "已插入表格，点击单元格即可填写" : "已插入复制文本块")
  }

  const commands = [
    { group: "文字格式", label: "加粗", icon: Bold, run: () => editor.current?.editor.action(callCommand(toggleStrongCommand.key)) },
    { group: "文字格式", label: "斜体", icon: Italic, run: () => editor.current?.editor.action(callCommand(toggleEmphasisCommand.key)) },
    { group: "文字格式", label: "二级标题", icon: Heading2, run: () => editor.current?.editor.action(callCommand(wrapInHeadingCommand.key, 2)) },
    { group: "文字格式", label: "引用", icon: Quote, run: () => editor.current?.editor.action(callCommand(wrapInBlockquoteCommand.key)) },
    { group: "文字格式", label: "代码块", icon: Code2, run: () => editor.current?.editor.action(callCommand(createCodeBlockCommand.key)) },
    { group: "插入", label: "从文件库插入图片", icon: ImagePlus, run: () => openPicker("image") },
    { group: "插入", label: "从文件库插入附件", icon: Paperclip, run: () => openPicker("file") },
    { group: "插入", label: "插入提示框", icon: Lightbulb, run: () => insertBlock("note") },
    { group: "插入", label: "插入链接卡片", icon: Link2, run: () => insertBlock("link") },
    { group: "插入", label: "插入复制文本块", icon: Copy, run: () => insertBlock("copy") },
    { group: "插入", label: "插入表格", icon: Table2, run: () => insertBlock("table") },
  ]
  const needle = slashQuery.slice(1).trim().toLowerCase()
  const filtered = commands.filter((item) => !needle || item.label.toLowerCase().includes(needle) || item.group.includes(needle))

  function readSlashQuery(from: number) {
    let text = "/"
    editor.current?.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      text = view.state.doc.textBetween(from, view.state.selection.from)
    })
    return text
  }

  function consumeSlash() {
    const from = slash?.from
    setSlash(null)
    setSlashQuery("/")
    if (from == null || !editor.current) return
    editor.current.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const to = view.state.selection.from
      if (to > from && view.state.doc.textBetween(from, to).startsWith("/")) {
        view.dispatch(view.state.tr.delete(from, to))
      }
    })
  }

  function runCommand(item: (typeof commands)[number]) {
    consumeSlash()
    item.run()
  }

  function onEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.closest(".cm-editor, .cm-content, input, textarea")) return

    if (slash) {
      if (event.key === "Escape") {
        event.preventDefault()
        setSlash(null)
        return
      }
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setSlashIndex((index) => (filtered.length ? (index + 1) % filtered.length : 0))
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setSlashIndex((index) => (filtered.length ? (index - 1 + filtered.length) % filtered.length : 0))
        return
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        const item = filtered[slashIndex] ?? filtered[0]
        if (item) runCommand(item)
        return
      }
      window.setTimeout(() => {
        if (!slash) return
        const query = readSlashQuery(slash.from)
        if (!query.startsWith("/")) {
          setSlash(null)
          return
        }
        setSlashQuery(query)
        setSlashIndex(0)
      }, 0)
      return
    }

    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
    window.setTimeout(() => {
      if (!editor.current) return
      editor.current.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { from } = view.state.selection
        const $from = view.state.selection.$from
        const textBefore = $from.parent.textBetween(0, $from.parentOffset)
        if (!textBefore.endsWith("/")) return
        const prev = textBefore.slice(0, -1)
        if (prev && !/[\s\u00a0]$/.test(prev)) return
        const coords = view.coordsAtPos(from)
        setSlash({ x: coords.left, y: coords.bottom + 6, from: from - 1 })
        setSlashQuery("/")
        setSlashIndex(0)
      })
    }, 0)
  }

  React.useEffect(() => {
    if (!slash) return
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-editor-slash]")) setSlash(null)
    }
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [slash])

  return <div className="article-visual-editor">
    <ContextMenu>
      <ContextMenuTrigger className="block select-text">
        <div ref={root} aria-label="文章正文编辑器" onContextMenuCapture={selectContextTarget} onKeyDownCapture={onEditorKeyDown} />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {selectedBlock?.image ? <>
          <ContextMenuGroup>
            <ContextMenuLabel>图片宽度</ContextMenuLabel>
            <ContextMenuRadioGroup value={String(Math.round(selectedBlock.image.ratio * 100))} onValueChange={(value) => resizeImage(Number(value))}>
              {[40, 60, 80, 100].map((percent) => <ContextMenuRadioItem key={percent} value={String(percent)}>{percent}%</ContextMenuRadioItem>)}
            </ContextMenuRadioGroup>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup><ContextMenuItem variant="destructive" onSelect={removeBlock}><Trash2 />删除{selectedBlock.label}</ContextMenuItem></ContextMenuGroup>
        </> : <>
          <ContextMenuGroup>
            <ContextMenuLabel>文字格式</ContextMenuLabel>
            <ContextMenuItem onSelect={() => editor.current?.editor.action(callCommand(toggleStrongCommand.key))}><Bold />加粗<ContextMenuShortcut>Ctrl+B</ContextMenuShortcut></ContextMenuItem>
            <ContextMenuItem onSelect={() => editor.current?.editor.action(callCommand(toggleEmphasisCommand.key))}><Italic />斜体<ContextMenuShortcut>Ctrl+I</ContextMenuShortcut></ContextMenuItem>
            <ContextMenuItem onSelect={() => editor.current?.editor.action(callCommand(wrapInHeadingCommand.key, 2))}><Heading2 />二级标题</ContextMenuItem>
            <ContextMenuItem onSelect={() => editor.current?.editor.action(callCommand(wrapInBlockquoteCommand.key))}><Quote />引用</ContextMenuItem>
            <ContextMenuItem onSelect={() => editor.current?.editor.action(callCommand(createCodeBlockCommand.key))}><Code2 />代码块</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem onSelect={() => void copySelectedText()}><Copy />复制选中文字<ContextMenuShortcut>Ctrl+C</ContextMenuShortcut></ContextMenuItem>
            <ContextMenuItem onSelect={() => openPicker("image")}><ImagePlus />从文件库插入图片</ContextMenuItem>
            <ContextMenuItem onSelect={() => openPicker("file")}><Paperclip />从文件库插入附件</ContextMenuItem>
            <ContextMenuItem onSelect={() => insertBlock("note")}><Lightbulb />插入提示框</ContextMenuItem>
            <ContextMenuItem onSelect={() => insertBlock("link")}><Link2 />插入链接卡片</ContextMenuItem>
            <ContextMenuItem onSelect={() => insertBlock("copy")}><Copy />插入复制文本块</ContextMenuItem>
            <ContextMenuItem onSelect={() => insertBlock("table")}><Table2 />插入表格</ContextMenuItem>
          </ContextMenuGroup>
          {selectedBlock && <>
            <ContextMenuSeparator />
            <ContextMenuGroup><ContextMenuItem variant="destructive" onSelect={removeBlock}><Trash2 />删除{selectedBlock.label}</ContextMenuItem></ContextMenuGroup>
          </>}
        </>}
      </ContextMenuContent>
    </ContextMenu>
    <div className="mt-10 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => openPicker("image")}><ImagePlus data-icon="inline-start" />插入图片</Button>
      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => openPicker("file")}><Paperclip data-icon="inline-start" />插入附件</Button>
      <Button size="sm" variant="ghost" onClick={() => insertBlock("note")}><Lightbulb data-icon="inline-start" />提示框</Button>
      <Button size="sm" variant="ghost" onClick={() => insertBlock("link")}><Link2 data-icon="inline-start" />链接卡片</Button>
      <Button size="sm" variant="ghost" onClick={() => insertBlock("copy")}><Copy data-icon="inline-start" />复制块</Button>
      <Button size="sm" variant="ghost" onClick={() => insertBlock("table")}><Table2 data-icon="inline-start" />表格</Button>
      <span>{error || "直接在正文中编辑 · 输入 / 或右键插入内容"}</span>
    </div>
    {slash && (
      <div
        data-editor-slash
        role="menu"
        className="fixed z-50 w-52 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        style={{ left: slash.x, top: slash.y }}
      >
        {filtered.length === 0 ? <p className="px-1.5 py-2 text-xs text-muted-foreground">没有匹配的插入项</p> : filtered.map((item, index) => {
          const prev = filtered[index - 1]
          return (
            <React.Fragment key={item.label}>
              {item.group !== prev?.group && <div className="px-1.5 py-1 text-xs text-muted-foreground">{item.group}</div>}
              <button
                type="button"
                role="menuitem"
                className={cn(menuItemClass, index === slashIndex && "bg-accent text-accent-foreground")}
                onMouseEnter={() => setSlashIndex(index)}
                onClick={() => runCommand(item)}
              >
                <item.icon />
                {item.label}
              </button>
            </React.Fragment>
          )
        })}
      </div>
    )}
    <ArticleImagePicker open={pickerKind !== null} kind={pickerKind || "image"} onOpenChange={(open) => { if (!open) setPickerKind(null) }} uploads={uploads} refreshUploads={refreshUploads} onSelect={(url, name) => pickerKind === "file" ? insertFileUrl(url, name) : insertImageUrl(url, name)} />
  </div>
}
