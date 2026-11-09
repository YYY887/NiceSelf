import * as React from "react"
import { cn } from "@/lib/utils"

import { ImageLightbox } from "@/components/image-lightbox"
import { MacbookPro } from "@/components/ui/macbook-pro"
import ScreenshotCapture from "@/components/ui/screenshot-capture"

type ProjectGalleryProps = {
  title: string
  coverUrl: string
  screenshots: string[]
}

export function ProjectGallery({ title, coverUrl, screenshots }: ProjectGalleryProps) {
  const [coverOrientation, setCoverOrientation] = React.useState<{
    src: string
    portrait: boolean
  } | null>(null)

  React.useEffect(() => {
    if (!coverUrl) return
    const image = new Image()
    image.onload = () => setCoverOrientation({
      src: coverUrl,
      portrait: image.naturalHeight > image.naturalWidth,
    })
    image.src = coverUrl
    return () => { image.onload = null }
  }, [coverUrl])

  const otherScreenshots = screenshots.filter((url) => url !== coverUrl)
  if (!coverUrl && !otherScreenshots.length) return null

  const portraitCover = coverOrientation?.src === coverUrl && coverOrientation.portrait
  const galleryImages = coverUrl && portraitCover
    ? [coverUrl, ...otherScreenshots]
    : otherScreenshots

  return (
    <div className="mt-10">
      {coverUrl && !portraitCover && (
        <div className="mx-auto aspect-[13/8] w-full max-w-2xl">
          <ImageLightbox src={coverUrl} alt={`${title} 项目封面截图`} className="size-full">
            <MacbookPro
              src={coverUrl}
              className="size-full"
              role="img"
              aria-label={`${title} 项目封面截图`}
            />
          </ImageLightbox>
        </div>
      )}
      {galleryImages.length > 0 && (
        <div className={cn(
          "grid items-start gap-8 sm:grid-cols-2",
          galleryImages.length > 2 && "lg:grid-cols-3",
          coverUrl && !portraitCover && "mt-8"
        )}>
          {galleryImages.map((url, index) => (
            <ImageLightbox key={`${url}-${index}`} src={url} alt={`${title} 项目截图 ${index + 1}`} className="w-full">
              <ScreenshotCapture src={url} alt={`${title} 项目截图 ${index + 1}`} />
            </ImageLightbox>
          ))}
        </div>
      )}
    </div>
  )
}
