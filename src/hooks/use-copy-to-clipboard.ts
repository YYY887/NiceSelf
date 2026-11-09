import { useCallback, useRef, useState } from "react"
import { useTiks } from "@rexa-developer/tiks/react"
import { useWebHaptics } from "web-haptics/react"

export type CopyState = "idle" | "done" | "error"

export type UseCopyToClipboardOptions = {
  onCopySuccess?: (text: string) => void
  onCopyError?: (error: Error) => void
  resetDelay?: number
}

export function useCopyToClipboard({
  onCopySuccess,
  onCopyError,
  resetDelay = 1500,
}: UseCopyToClipboardOptions = {}) {
  const [state, setState] = useState<CopyState>("idle")
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { trigger: haptic } = useWebHaptics()
  const { success: tiksSuccess, error: tiksError } = useTiks()

  const copy = useCallback(
    async (text: string | (() => string)) => {
      // Clear any pending reset
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }

      try {
        const finalText = typeof text === "function" ? text() : text
        await writeClipboardText(finalText)

        setState("done")

        haptic("success")
        tiksSuccess()

        onCopySuccess?.(finalText)
      } catch (error) {
        setState("error")

        haptic("error")
        tiksError()

        onCopyError?.(error instanceof Error ? error : new Error("Copy failed"))
      } finally {
        // Schedule reset to idle
        resetTimeoutRef.current = setTimeout(() => {
          setState("idle")
        }, resetDelay)
      }
    },
    [onCopySuccess, onCopyError, haptic, tiksSuccess, tiksError, resetDelay]
  )

  return { state, copy } as const
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch { /* fall through to execCommand */ }
  }
  const field = document.createElement("textarea")
  field.value = text
  field.setAttribute("readonly", "")
  field.style.position = "fixed"
  field.style.left = "-9999px"
  document.body.appendChild(field)
  field.select()
  const ok = document.execCommand("copy")
  field.remove()
  if (!ok) throw new Error("Copy failed")
}
