import type { ReactNode } from "react"
import { ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type ImageLightboxProps = {
  src: string
  alt: string
  children: ReactNode
  className?: string
}

export function ImageLightbox({ src, alt, children, className }: ImageLightboxProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={`放大查看${alt}`} className={cn("group relative block cursor-zoom-in", className)}>
          {children}
          <span aria-hidden="true" className="pointer-events-none absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-background/85 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ZoomIn className="size-4" /></span>
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,90rem)] max-w-[min(96vw,90rem)] border-0 bg-background/95 p-3 shadow-2xl sm:max-w-[min(96vw,90rem)]">
        <DialogTitle className="sr-only">{alt || "放大图片"}</DialogTitle>
        <img src={src} alt={alt} className="mx-auto max-h-[86svh] max-w-full object-contain" />
      </DialogContent>
    </Dialog>
  )
}
