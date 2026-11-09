import * as React from "react"
import { cn } from "@/lib/utils"

type ScreenshotCaptureProps = {
  src: string
  alt: string
  className?: string
}

/** Presents portrait project screenshots in a phone frame and wide ones as images. */
export default function ScreenshotCapture({ src, alt, className }: ScreenshotCaptureProps) {
  const [portrait, setPortrait] = React.useState<boolean | null>(null)

  return <span className={cn("flex items-center justify-center", className)}>
    <span className={cn(portrait && "relative w-full max-w-[280px] rounded-[2.3rem] border-[7px] border-neutral-900 bg-neutral-900 p-1 shadow-[0_24px_70px_-28px_rgba(0,0,0,.55)] dark:border-neutral-700 dark:bg-neutral-700")}>
      {portrait && <span aria-hidden="true" className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-neutral-700" />}
      <img src={src} alt={alt} loading="lazy" onLoad={(event) => setPortrait(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth)} className={cn("block h-auto max-h-[640px] w-full object-contain", portrait ? "rounded-[1.65rem] bg-white" : "rounded-xl border")} />
    </span>
  </span>
}
