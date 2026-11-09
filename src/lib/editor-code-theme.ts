import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { tags as t } from "@lezer/highlight"

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--code-block-fg)",
  },
  ".cm-content": {
    caretColor: "var(--editor-caret)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--editor-caret)",
  },
  ".cm-selectionLayer": {
    zIndex: "1",
    pointerEvents: "none",
  },
  ".cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, var(--foreground) 28%, transparent) !important",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, var(--foreground) 28%, transparent) !important",
  },
  ".cm-content ::selection": {
    backgroundColor: "color-mix(in oklab, var(--foreground) 28%, transparent) !important",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--muted-foreground)",
    border: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--foreground)",
  },
})

const highlight = HighlightStyle.define([
  { tag: t.comment, color: "var(--syntax-comment)" },
  { tag: t.lineComment, color: "var(--syntax-comment)" },
  { tag: t.keyword, color: "var(--syntax-keyword)" },
  { tag: t.controlKeyword, color: "var(--syntax-keyword)" },
  { tag: t.definitionKeyword, color: "var(--syntax-keyword)" },
  { tag: t.string, color: "var(--syntax-string)" },
  { tag: t.special(t.string), color: "var(--syntax-string)" },
  { tag: t.number, color: "var(--syntax-number)" },
  { tag: t.bool, color: "var(--syntax-number)" },
  { tag: t.function(t.variableName), color: "var(--syntax-function)" },
  { tag: t.definition(t.variableName), color: "var(--syntax-function)" },
  { tag: t.function(t.propertyName), color: "var(--syntax-function)" },
  { tag: t.propertyName, color: "var(--syntax-property)" },
  { tag: t.attributeName, color: "var(--syntax-property)" },
  { tag: t.typeName, color: "var(--syntax-function)" },
  { tag: t.className, color: "var(--syntax-function)" },
  { tag: t.operator, color: "var(--syntax-punctuation)" },
  { tag: t.punctuation, color: "var(--syntax-punctuation)" },
  { tag: t.processingInstruction, color: "var(--syntax-punctuation)" },
])

export const siteCodeTheme = [editorTheme, syntaxHighlighting(highlight)]
