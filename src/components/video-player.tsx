import * as React from "react"

import { createVideoPlayer, type VideoPlayerRoot } from "@/lib/video-player"

export function VideoPlayer({ src, title, className }: { src: string; title?: string; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const host = ref.current
    if (!host) return
    const player = createVideoPlayer(src, { title }) as VideoPlayerRoot
    host.append(player)
    return () => {
      player.dispose?.()
      player.remove()
    }
  }, [src, title])
  return <div ref={ref} className={className} />
}
