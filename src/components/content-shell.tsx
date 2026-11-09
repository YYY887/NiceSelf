import * as React from "react"
import { BookOpenText, Menu } from "lucide-react"
import { NavLink } from "react-router"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export type ContentNavItem = { label: string; href: string }

type ContentShellProps = {
  title: string
  navigationLabel: string
  items: ContentNavItem[]
  children: React.ReactNode
}

export function ContentShell({
  title,
  navigationLabel,
  items,
  children,
}: ContentShellProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)

  const navigation = (closeMenu: boolean) => (
    <nav aria-label={navigationLabel} className="flex flex-col gap-2">
      <p className="flex items-center gap-2 px-3 text-xs font-medium text-muted-foreground">
        <BookOpenText aria-hidden="true" className="size-4" />
        QianQiu-MySelf - {title}
      </p>
      <Separator className="my-3" />
      <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">
        {title}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end
          onClick={closeMenu ? () => setMenuOpen(false) : undefined}
          className={({ isActive }) => `rounded-md px-3 py-2 text-sm leading-snug hover:bg-accent hover:text-accent-foreground ${isActive ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[90rem] pt-16 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-r px-5 py-10 lg:fixed lg:inset-y-16 lg:left-[max(0px,calc((100vw-90rem)/2))] lg:block lg:w-64 lg:overflow-y-auto">
        {navigation(false)}
      </aside>
      <div className="hidden lg:block" aria-hidden="true" />
      <div className="min-w-0">
        <div className="px-6 pt-7 sm:px-8 lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Menu data-icon="inline-start" aria-hidden="true" />
                {title}目录
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>选择要浏览的内容</SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto px-4 pb-8">{navigation(true)}</div>
            </SheetContent>
          </Sheet>
        </div>
        {children}
      </div>
    </div>
  )
}
