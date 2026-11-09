import * as React from "react"
import { FileText, Sparkles } from "lucide-react"

import { ArticleVisualEditor } from "@/components/admin/article-visual-editor"
import { ArticleYuqueEditor } from "@/components/admin/article-yuque-editor"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  bodyForEditor,
  readArticleEditorMode,
  storeEditorBody,
  writeArticleEditorMode,
  type ArticleEditorMode,
} from "@/lib/article-format"
import type { UploadRecord } from "@/lib/api"

export function ArticleEditorModeSwitch({
  mode,
  onChange,
}: {
  mode: ArticleEditorMode
  onChange: (mode: ArticleEditorMode) => void
}) {
  return (
    <Tabs value={mode} onValueChange={(value) => onChange(value === "markdown" ? "markdown" : "yuque")}>
      <TabsList>
        <TabsTrigger value="yuque"><Sparkles data-icon="inline-start" />语雀富文本</TabsTrigger>
        <TabsTrigger value="markdown"><FileText data-icon="inline-start" />Markdown</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export function ArticleBodyEditor({
  articleKey = "new",
  markdown,
  onChange,
  uploads,
  refreshUploads,
  mode,
  title,
  onTitleChange,
  onSave,
}: {
  articleKey?: string
  markdown: string
  onChange: (value: string) => void
  uploads: UploadRecord[]
  refreshUploads: () => Promise<void>
  mode: ArticleEditorMode
  title?: string
  onTitleChange?: (title: string) => void
  onSave?: (markdown: string, title: string) => void
}) {
  const editorValue = React.useMemo(() => bodyForEditor(mode, markdown), [mode, markdown])
  const previousMode = React.useRef(mode)

  React.useEffect(() => {
    if (previousMode.current === mode) return
    previousMode.current = mode
    writeArticleEditorMode(mode)
    onChange(storeEditorBody(mode, bodyForEditor(mode, markdown)))
  }, [mode, markdown, onChange])

  return (
    <div className="article-body-editor">
      {mode === "yuque" ? (
        <ArticleYuqueEditor articleKey={articleKey} value={editorValue} title={title} onChange={(lake) => onChange(storeEditorBody("yuque", lake))} onTitleChange={onTitleChange} onSave={(lake, nextTitle) => onSave?.(storeEditorBody("yuque", lake), nextTitle)} uploads={uploads} refreshUploads={refreshUploads} />
      ) : (
        <ArticleVisualEditor markdown={editorValue} onChange={(value) => onChange(storeEditorBody("markdown", value))} uploads={uploads} refreshUploads={refreshUploads} />
      )}
    </div>
  )
}

export { readArticleEditorMode }
