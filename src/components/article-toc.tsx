import * as React from "react"
import { List } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type TocItem = { title: string; href: string; level: number }

type ArticleTocProps = {
  items: TocItem[]
  onNavigate?: (id: string) => void
  getTarget?: (id: string) => Element | null
}

export function ArticleToc({ items, onNavigate, getTarget }: ArticleTocProps) {
  const slotRef = React.useRef<HTMLDivElement>(null)
  const panelRef = React.useRef<HTMLElement>(null)
  const navigationLock = React.useRef("")
  const navigationTimer = React.useRef<number | undefined>(undefined)
  const [activeHref, setActiveHref] = React.useState<string | undefined>(items[0]?.href)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  React.useLayoutEffect(() => {
    const slot = slotRef.current
    const panel = panelRef.current
    if (!slot || !panel) return

    const placePanel = () => {
      const { left, width } = slot.getBoundingClientRect()
      panel.style.left = `${left}px`
      panel.style.width = `${width}px`
    }

    placePanel()
    const observer = new ResizeObserver(placePanel)
    observer.observe(slot)
    window.addEventListener("resize", placePanel)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", placePanel)
    }
  }, [items.length])

  React.useEffect(() => {
    const updateActive = () => {
      if (navigationLock.current) return
      const targetFor = (id: string) => getTarget?.(id) || document.getElementById(id)
      const visibleItems = items.filter((item) => targetFor(item.href.slice(1)))
      if (
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 16
      ) {
        setActiveHref(visibleItems.at(-1)?.href)
        return
      }

      const current = [...visibleItems].reverse().find((item) => {
        const heading = targetFor(item.href.slice(1))
        return heading && heading.getBoundingClientRect().top <= 180
      })
      setActiveHref(current?.href ?? visibleItems[0]?.href)
    }

    updateActive()
    window.addEventListener("scroll", updateActive, { passive: true })
    return () => {
      window.removeEventListener("scroll", updateActive)
      window.clearTimeout(navigationTimer.current)
    }
  }, [items, getTarget])

  const navigate = (item: TocItem) => {
    const id = item.href.slice(1)
    setActiveHref(item.href)
    setDrawerOpen(false)
    navigationLock.current = item.href
    window.clearTimeout(navigationTimer.current)
    navigationTimer.current = window.setTimeout(() => {
      navigationLock.current = ""
      window.dispatchEvent(new Event("scroll"))
    }, 1100)
    window.history.replaceState(null, "", item.href)
    onNavigate?.(id)
    // The destination may be inside a folded section. Wait for React to reveal it.
    window.requestAnimationFrame(() => {
      ;(getTarget?.(id) || document.getElementById(id))?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const tocLinks = () => (
    <nav className="mt-4 flex min-w-0 flex-col border-l border-border" aria-label="本文章节">
      {items.map((item) => (
        <a
          key={`${item.href}-${item.level}`}
          href={item.href}
          title={item.title}
          aria-current={activeHref === item.href ? "location" : undefined}
          onClick={(event) => { event.preventDefault(); navigate(item) }}
          className={`relative block min-w-0 py-1.5 pr-2 text-sm leading-5 transition-colors ${activeHref === item.href ? "font-semibold text-foreground before:absolute before:inset-y-0 before:-left-px before:w-0.5 before:rounded-full before:bg-foreground" : "text-foreground/80 hover:text-foreground"}`}
          style={{ paddingLeft: `${0.75 + Math.min(item.level - 1, 5) * 0.65}rem` }}
        >
          <span className="line-clamp-2 break-words">{item.title}</span>
        </a>
      ))}
    </nav>
  )

  if (!items.length) return null

  return (
    <>
      <div className="fixed right-5 bottom-6 z-40 lg:hidden">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button size="icon-lg" className="size-12 rounded-full shadow-lg" aria-label="打开文章目录" title="文章目录">
              <List aria-hidden="true" className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(22rem,90vw)]">
            <SheetHeader><SheetTitle>文章目录</SheetTitle></SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{tocLinks()}</div>
          </SheetContent>
        </Sheet>
      </div>
      <div ref={slotRef} className="hidden min-w-0 lg:block">
        <aside ref={panelRef} aria-label="文章目录" className="fixed top-28 max-h-[calc(100svh-8rem)] min-w-0 overflow-y-auto">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><List aria-hidden="true" className="size-3.5" />On this page</p>
          {tocLinks()}
        </aside>
      </div>
    </>
  )
}
