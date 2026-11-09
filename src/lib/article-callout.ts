export const calloutKinds = {
  note: "注意",
  tip: "提示",
  important: "重要",
  warning: "警告",
  caution: "小心",
} as const

export type CalloutKind = keyof typeof calloutKinds

const calloutPattern = /\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i

export function parseCallout(text: string) {
  const match = calloutPattern.exec(text)
  if (!match) return null
  const kind = match[1].toLowerCase() as CalloutKind
  const body = `${text.slice(0, match.index)}${text.slice(match.index + match[0].length)}`
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n")
  return { kind, label: calloutKinds[kind], body }
}
