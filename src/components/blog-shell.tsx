import * as React from "react"
import { BookOpenText, Menu } from "lucide-react"
import { NavLink } from "react-router"

import { Button } from "@/components/ui/button"
import { CategoryDrawer } from "@/components/category-drawer"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useSiteContent } from "@/lib/site-content"
import { cn } from "@/lib/utils"

function BlogNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { articles } = useSiteContent()
  return (
    <nav aria-label="博客文章导航" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 px-3 text-xs font-medium text-muted-foreground">
          <BookOpenText aria-hidden="true" className="size-4" />
          QianQiu-MySelf - 文章
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-1">
        {articles.map((article, index) => <React.Fragment key={article.id}>
          {(index === 0 || articles[index - 1].date.slice(0, 4) !== article.date.slice(0, 4)) && <p className="px-3 pt-3 pb-2 text-xs font-medium text-muted-foreground">{article.date.slice(0, 4)}</p>}
          <NavLink
            to={`/blog/${article.slug}`}
            onClick={onNavigate}
            className={({ isActive }) => cn("rounded-md px-3 py-2 text-sm leading-snug text-muted-foreground hover:bg-accent hover:text-accent-foreground", isActive && "bg-accent font-medium text-accent-foreground")}
          >{article.title}</NavLink>
        </React.Fragment>)}
      </div>

      <Separator />
      <div className="px-3"><CategoryDrawer /></div>
    </nav>
  )
}

export function BlogShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false)

  return (
    <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[90rem] pt-16 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-r px-5 py-10 lg:fixed lg:inset-y-16 lg:left-[max(0px,calc((100vw-90rem)/2))] lg:block lg:w-64 lg:overflow-y-auto">
        <BlogNavigation />
      </aside>

      <div className="hidden lg:block" aria-hidden="true" />

      <div className="min-w-0">
        <div className="px-6 pt-7 sm:px-8 lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Menu data-icon="inline-start" aria-hidden="true" />
                文章目录
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>博客文章</SheetTitle>
                <SheetDescription>选择一篇文章阅读</SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto px-4 pb-8">
                <BlogNavigation onNavigate={() => setMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {children}
      </div>
    </div>
  )
}
