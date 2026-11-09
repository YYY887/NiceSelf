export const highlightColors = ["blue", "red", "green", "yellow", "gray"] as const
export type HighlightColor = (typeof highlightColors)[number]

const highlightPattern = /\[!(?:HL|HIGHLIGHT)(?::(blue|red|green|yellow|gray))?\]/i
const dateTokenPattern = /^\[date:(\d{4}-\d{2}-\d{2})\]$/
const lockPasswordPattern = /^password:\s*(.*)\r?\n?/

export function todayIso() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function formatDateChip(iso: string) {
  const [, month, day] = iso.split("-")
  return `${Number(month)}月${Number(day)}日`
}

export function parseDateToken(text: string) {
  const match = dateTokenPattern.exec(text.trim())
  return match ? match[1] : null
}

export function parseHighlight(text: string) {
  const match = highlightPattern.exec(text)
  if (!match) return null
  const color = (match[1]?.toLowerCase() || "blue") as HighlightColor
  const body = `${text.slice(0, match.index)}${text.slice(match.index + match[0].length)}`
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n")
  return { color, body }
}

export function parseSpecialFence(language: string, code: string) {
  const lang = language.trim().toLowerCase()
  const text = code.replace(/\n$/, "")
  if (lang === "copy" || lang === "copytext") return { kind: "copy" as const, text }
  if (lang === "fold" || lang.startsWith("fold")) {
    const lines = text.split("\n")
    return { kind: "fold" as const, title: lines[0]?.trim() || "折叠块", body: lines.slice(1).join("\n") }
  }
  if (lang === "lock" || lang.startsWith("lock")) {
    const match = lockPasswordPattern.exec(text)
    return {
      kind: "lock" as const,
      password: match ? match[1].trim() : "",
      body: match ? text.slice(match[0].length) : text,
    }
  }
  return null
}

export const editorSnippets = {
  note: "\n> [!NOTE]\n> \n\n",
  highlight: "\n> [!HL:blue]\n> \n\n",
  fold: "\n```fold\n折叠标题\n在这里输入内容\n```\n\n",
  lock: "\n```lock\n在这里输入加密内容\n```\n\n",
  copy: "\n```copy\n\n```\n\n",
  link: "\nhttps://example.com\n\n",
  table: "\n| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n|     |     |     |\n|     |     |     |\n\n",
  task: "\n- [ ] \n",
  date: () => `\n[date:${todayIso()}]\n\n`,
} as const
