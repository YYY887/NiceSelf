import * as React from "react"
import { toast } from "sonner"

import { ArticleImagePicker } from "@/components/admin/article-image-picker"
import { Button } from "@/components/ui/button"
import { assetHref, type UploadRecord } from "@/lib/api"
import { isLakeDocument, markdownToHtml, unwrapYuqueBody } from "@/lib/article-format"
import { escapeLakeHtml, LAKE_EDITOR_PAGE, subscribeLakeLibrary } from "@/lib/lake-runtime"
import "@/styles/admin-editor.css"

type LakeEditor = {
  setDocument: (type: string, content: string) => void
  getDocument: (type: string, options?: { includeMeta?: boolean }) => string
  execCommand: (name: string, value?: string, format?: string) => void
  on: (name: string, handler: (...args: never[]) => void) => void
  kernel?: { execCommand: (name: string, value?: string, format?: string) => void }
}

type LakeWindow = Window & {
  Function: FunctionConstructor
  Doc?: { createOpenEditor: (root: HTMLElement, options: object) => LakeEditor }
  __lake?: LakeEditor
  __qianqiuUpload?: (input: unknown, kind: "image" | "video" | "file") => Promise<{ url: string; size: number; filename: string }>
}

function waitForDoc(win: Window, timeout = 20000) {
  const started = Date.now()
  return new Promise<{ createOpenEditor: (root: HTMLElement, options: object) => LakeEditor }>((resolve, reject) => {
    const poll = () => {
      const doc = (win as LakeWindow).Doc
      if (doc?.createOpenEditor) { resolve(doc); return }
      if (Date.now() - started > timeout) { reject(new Error("语雀编辑器脚本加载超时")); return }
      window.setTimeout(poll, 40)
    }
    poll()
  })
}

function insertHtmlInFrame(win: Window, html: string, format = "text/html") {
  const editor = (win as LakeWindow).__lake
  if (!editor || !html) return
  try { editor.execCommand("insertHTML", html, format); return } catch { /* try kernel */ }
  try { editor.kernel?.execCommand("insertHTML", html, format); return } catch { /* try native */ }
  if (format !== "text/html") return
  const engine = win.document.querySelector(".ne-engine") as HTMLElement | null
  engine?.focus()
  win.document.execCommand("insertHTML", false, html)
}

function applyDocument(editor: LakeEditor, value: string) {
  const content = unwrapYuqueBody(value).trim()
  try {
    if (content) {
      if (isLakeDocument(content)) editor.setDocument("text/lake", content)
      else editor.setDocument("text/html", content)
      return
    }
    editor.setDocument("text/html", "<p></p>")
  } catch { /* Lake viewport may not be ready yet */ }
}

function plainHtmlFromText(text: string) {
  return text.split(/\n/).map((line) => `<p>${escapeLakeHtml(line) || "<br>"}</p>`).join("")
}

export function ArticleYuqueEditor({
  articleKey,
  value,
  onChange,
  title = "",
  onTitleChange,
  onSave,
  uploads,
  refreshUploads,
}: {
  articleKey: string
  value: string
  onChange: (lake: string) => void
  title?: string
  onTitleChange?: (title: string) => void
  onSave?: (lake: string, title: string) => void
  uploads: UploadRecord[]
  refreshUploads: () => Promise<void>
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const editorRef = React.useRef<LakeEditor | null>(null)
  const onChangeRef = React.useRef(onChange)
  const onTitleChangeRef = React.useRef(onTitleChange)
  const onSaveRef = React.useRef(onSave)
  const valueRef = React.useRef(value)
  const titleRef = React.useRef(title)
  const articleKeyRef = React.useRef(articleKey)
  const refreshUploadsRef = React.useRef(refreshUploads)
  const loadedKey = React.useRef<string | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = React.useState("")
  const [pickerKind, setPickerKind] = React.useState<"image" | "file" | null>(null)
  const [convertText, setConvertText] = React.useState("")
  React.useEffect(() => {
    onChangeRef.current = onChange
    onTitleChangeRef.current = onTitleChange
    onSaveRef.current = onSave
    valueRef.current = value
    titleRef.current = title
    articleKeyRef.current = articleKey
    refreshUploadsRef.current = refreshUploads
  }, [onChange, onTitleChange, onSave, value, title, articleKey, refreshUploads])

  const syncTitle = React.useCallback(() => {
    const titleInput = iframeRef.current?.contentDocument?.getElementById("doc-title") as HTMLInputElement | null
    if (titleInput && titleInput.value !== titleRef.current) titleInput.value = titleRef.current
  }, [])

  React.useEffect(() => subscribeLakeLibrary((kind) => {
    setPickerKind(kind)
    void refreshUploadsRef.current()
  }), [])

  React.useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: string; text?: string; html?: string; name?: string; message?: string; kind?: string; url?: string; lake?: string; title?: string }
      if (data?.source !== "qianqiu-lake") return
      if (event.source !== iframeRef.current?.contentWindow) return
      const win = iframeRef.current?.contentWindow
      if (data.type === "document-change") {
        if (typeof data.lake === "string") onChangeRef.current(data.lake)
        return
      }
      if (data.type === "save-request") {
        const lake = typeof data.lake === "string" ? data.lake : editorRef.current?.getDocument("text/lake", { includeMeta: true }) || valueRef.current
        onSaveRef.current?.(lake, typeof data.title === "string" ? data.title : titleRef.current)
        return
      }
      if (data.type === "delete-ok") { toast.success("已删除所选内容"); return }
      if (data.type === "delete-fail") { toast.error("删除失败，请重试"); return }
      if (data.type === "copy") {
        const text = String(data.text || "")
        if (!text.trim()) return
        void (async () => {
          try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
            toast.success("已复制")
          } catch {
            toast.error("复制失败")
          }
        })()
        return
      }
      if (data.type === "upload-start") {
        toast.message(`正在上传 ${data.name || "文件"}…`)
        return
      }
      if (data.type === "upload-ok") {
        toast.success(`${data.name || "文件"} 已插入`)
        void refreshUploadsRef.current()
        return
      }
      if (data.type === "upload-fail") {
        toast.error(data.message || "图片上传失败")
        return
      }
      if (data.type === "open-library") {
        setPickerKind(data.kind === "file" ? "file" : "image")
        void refreshUploadsRef.current()
        return
      }
      if (data.type === "open-url") {
        const href = String((data as { url?: string }).url || "")
        if (!href) return
        window.open(assetHref(href), "_blank", "noopener,noreferrer")
        return
      }
      if (data.type === "markdown-prompt") {
        setConvertText(String(data.text || ""))
        return
      }
      if (data.type === "convert-markdown") {
        const html = markdownToHtml(String(data.text || ""))
        if (!html || !win) {
          toast.error("Markdown 转换失败")
          return
        }
        insertHtmlInFrame(win, html)
        setConvertText("")
        toast.success("已转换成正文样式")
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  React.useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    let cancelled = false
    let themeWatch: MutationObserver | null = null
    setStatus("loading")
    setError("")

    const onLoad = () => {
      const win = iframe.contentWindow as LakeWindow | null
      const doc = iframe.contentDocument
      const root = doc?.getElementById("root")
      if (!win || !doc || !root) return
      themeWatch?.disconnect()
      const syncTheme = () => {
        doc.documentElement.classList.toggle("dark", document.documentElement.classList.contains("dark"))
      }
      syncTheme()
      themeWatch = new MutationObserver(syncTheme)
      themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
      const titleInput = doc.getElementById("doc-title") as HTMLInputElement | null
      if (titleInput) {
        titleInput.value = titleRef.current
        titleInput.addEventListener("input", () => {
          onTitleChangeRef.current?.(titleInput.value)
        })
      }
      void waitForDoc(win).then((Lake) => {
        if (cancelled) return
        try {
          const register = new win.Function("Doc", `
            var Factory = Doc.OpenEditorFactory;
            var Command = Doc.Command;
            var SelectionUtil = Doc.SelectionUtil;
            if (!Factory || !Command || !Factory.registerKernelPlugin) return;
            function InsertHTML() {}
            InsertHTML.prototype = Object.create(Command.prototype);
            InsertHTML.prototype.constructor = InsertHTML;
            InsertHTML.prototype.execute = function (editing, html, format) {
              var job = editing.newJob();
              var tree = this.kernel.readData(format || "text/html", html, { from: "insert", self: false, forceText: false });
              if (!tree) return false;
              var normalize = this.kernel.getExtendMethod && this.kernel.getExtendMethod("normalizeINodeTree");
              if (normalize) tree = normalize(job, tree) || tree;
              job.setSelection(SelectionUtil.insertINode(job, job.getSelection(), tree));
              editing.commitJob(job);
              return true;
            };
            function KernelPlugin() {}
            KernelPlugin.PluginName = "StudioInsertHTML";
            KernelPlugin.prototype.init = function (kernel) {
              kernel.registerCommand("insertHTML", new InsertHTML());
            };
            Factory.registerKernelPlugin([KernelPlugin]);
          `)
          register(Lake)
        } catch { /* native insertHTML may already exist */ }
        const next = Lake.createOpenEditor(root, {
          scrollNode: () => doc.querySelector(".ne-editor-wrap"),
          placeholder: "输入 / 插入内容，或使用顶部工具栏",
          defaultFontsize: 15,
          image: {
            createUploadPromise: (request: unknown) => {
              const upload = win.__qianqiuUpload
              if (!upload) return Promise.reject(new Error("编辑器未就绪"))
              return upload(request, "image")
            },
          },
          video: {
            createUploadPromise: (request: unknown) => {
              const upload = win.__qianqiuUpload
              if (!upload) return Promise.reject(new Error("编辑器未就绪"))
              return upload(request, "video")
            },
          },
          file: {
            createUploadPromise: (request: unknown) => {
              const upload = win.__qianqiuUpload
              if (!upload) return Promise.reject(new Error("编辑器未就绪"))
              return upload(request, "file")
            },
          },
        })
        next.on("visitLink", ((url: string) => { window.open(url, "_blank") }) as (...args: never[]) => void)
        next.on("contentchange", (() => {
          onChangeRef.current(next.getDocument("text/lake", { includeMeta: true }))
        }) as (...args: never[]) => void)
        window.setTimeout(() => {
          if (cancelled) return
          const engine = doc.querySelector(".ne-engine")
          const titleWrap = doc.querySelector(".title-wrap")
          if (engine?.parentNode && titleWrap && titleWrap.nextElementSibling !== engine) engine.parentNode.insertBefore(titleWrap, engine)
          applyDocument(next, valueRef.current)
        }, 0)
        editorRef.current = next
        loadedKey.current = articleKeyRef.current
        win.__lake = next
        if (!cancelled) setStatus("ready")
      }).catch((reason: unknown) => {
        if (cancelled) return
        const message = reason instanceof Error ? reason.message : "语雀编辑器加载失败"
        setError(message)
        setStatus("error")
        toast.error(message)
      })
    }

    iframe.addEventListener("load", onLoad)
    iframe.src = LAKE_EDITOR_PAGE
    return () => {
      cancelled = true
      themeWatch?.disconnect()
      iframe.removeEventListener("load", onLoad)
      editorRef.current = null
    }
  }, [LAKE_EDITOR_PAGE])

  React.useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (loadedKey.current === articleKey) {
      syncTitle()
      return
    }
    loadedKey.current = articleKey
    applyDocument(editor, valueRef.current)
    syncTitle()
    setConvertText("")
  }, [articleKey, syncTitle])

  function lakeCardHtml(kind: "image" | "file", item: UploadRecord, dimensions?: { width: number; height: number }) {
    const src = assetHref(item.url)
    const payload = kind === "image"
      ? { src, name: item.name, size: item.size, status: "done", originalType: "binary", from: "ui", style: "none", showTitle: false,
          originWidth: dimensions?.width, originHeight: dimensions?.height,
          width: dimensions ? Math.round(Math.min(dimensions.width, 860) * 0.6) : undefined,
          height: dimensions ? Math.round(Math.min(dimensions.width, 860) * 0.6 * dimensions.height / dimensions.width) : undefined }
      : { src, name: item.name, size: item.size, ext: item.name.split(".").pop()?.toLowerCase(), type: item.mime,
          source: "", status: "done", download: true, taskType: "upload", mode: "title" }
    const value = encodeURIComponent(JSON.stringify(payload))
    return `<p><card type="inline" name="${kind}" value="data:${value}"></card></p>`
  }

  async function insertFromLibrary(item: UploadRecord, kind: "image" | "file") {
    const win = iframeRef.current?.contentWindow as LakeWindow | null
    const editor = win?.__lake
    if (!win || !editor) {
      toast.error("编辑器还在准备，请稍后再插入")
      return
    }
    let dimensions: { width: number; height: number } | undefined
    if (kind === "image") {
      try {
        const image = new Image()
        image.src = assetHref(item.url)
        await image.decode()
        dimensions = { width: image.naturalWidth, height: image.naturalHeight }
      } catch {
        toast.error("图片地址不可访问，请检查后端服务和文件是否存在")
        return
      }
    }
    try {
      const card = lakeCardHtml(kind, item, dimensions)
      const before = editor.getDocument("text/lake", { includeMeta: true })
      insertHtmlInFrame(win, card, "text/lake")
      let after = editor.getDocument("text/lake", { includeMeta: true })
      let appended = false
      for (let attempt = 0; attempt < 5 && after === before; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 100))
        after = editor.getDocument("text/lake", { includeMeta: true })
      }
      if (after === before) {
        editor.setDocument("text/lake", `${before}${card}`)
        after = editor.getDocument("text/lake", { includeMeta: true })
        if (after === before) throw new Error("Lake did not insert the card")
        onChangeRef.current(after)
        appended = true
      }
      toast.success(appended ? `已添加到文末：${item.name}` : kind === "file" ? `已插入附件 ${item.name}` : `已插入图片 ${item.name}`)
    } catch {
      toast.error("插入失败，请重试")
    }
  }

  function applyConvert() {
    const win = iframeRef.current?.contentWindow
    const html = markdownToHtml(convertText)
    if (!html || !win) {
      toast.error("Markdown 转换失败")
      return
    }
    insertHtmlInFrame(win, html)
    setConvertText("")
    toast.success("已转换成正文样式")
  }

  function keepOriginal() {
    const win = iframeRef.current?.contentWindow
    if (win && convertText) insertHtmlInFrame(win, plainHtmlFromText(convertText))
    setConvertText("")
  }

  return (
    <div className="article-yuque-editor">
      {status === "error" && <p className="article-yuque-status is-error">{error}。可切到 Markdown 继续编辑。</p>}
      {convertText && (
        <div className="article-yuque-convert" role="status">
          <span>检测到 Markdown，可以转换成正文样式</span>
          <Button size="sm" onClick={applyConvert}>立即转换</Button>
          <Button size="sm" variant="ghost" onClick={keepOriginal}>保持原样</Button>
        </div>
      )}
      <iframe ref={iframeRef} title="语雀编辑器" className="article-yuque-frame" allow="clipboard-read; clipboard-write" />
      <ArticleImagePicker
        open={pickerKind !== null}
        kind={pickerKind || "image"}
        onOpenChange={(open) => { if (!open) setPickerKind(null) }}
        uploads={uploads}
        refreshUploads={refreshUploads}
        onSelect={(_url, _name, item) => { void insertFromLibrary(item, pickerKind || "image") }}
      />
    </div>
  )
}
