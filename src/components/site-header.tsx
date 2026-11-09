import * as React from "react"
import { Menu, Moon, Sun } from "lucide-react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { Link, useLocation } from "react-router"

import { GlobalSearch } from "@/components/global-search"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { toggleThemeWithCircle } from "@/lib/theme-transition"
import { cn } from "@/lib/utils"

const links = [
  { to: "/blog", label: "博客" },
  { to: "/projects", label: "项目" },
  { to: "/about", label: "关于" },
]

function linkActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function SiteHeader() {
  const { setTheme } = useTheme()
  const { pathname } = useLocation()
  const reducedMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = React.useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-border/40 bg-background/55 backdrop-blur-xl backdrop-saturate-150 dark:bg-background/45">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 sm:px-8">
        <Link
          to="/"
          className="shrink-0 text-sm font-semibold tracking-tight sm:text-base"
        >
          QianQiu-MySelf
        </Link>

        <div className="flex items-center gap-1">
          <GlobalSearch />
          <nav
            aria-label="主导航"
            className="hidden items-center gap-1 md:flex"
          >
            <LayoutGroup id="site-nav">
              {links.map((link) => {
                const active = linkActive(pathname, link.to)
                return (
                  <Button key={link.to} variant="ghost" className="relative" asChild>
                    <Link to={link.to} aria-current={active ? "page" : undefined}>
                      {active && !reducedMotion && (
                        <motion.span
                          layoutId="site-nav-active"
                          className="absolute inset-0 rounded-md bg-accent"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          aria-hidden="true"
                        />
                      )}
                      <span className={cn("relative z-10", active && reducedMotion && "font-medium")}>
                        {link.label}
                      </span>
                    </Link>
                  </Button>
                )
              })}
            </LayoutGroup>
          </nav>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="切换日夜主题"
            title="切换日夜主题"
            onClick={(event) => toggleThemeWithCircle(setTheme, event.currentTarget)}
          >
            <Moon aria-hidden="true" className="dark:hidden" />
            <Sun aria-hidden="true" className="hidden dark:block" />
          </Button>

          <div className="md:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="打开导航菜单"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>导航</SheetTitle>
                  <SheetDescription>选择要浏览的内容</SheetDescription>
                </SheetHeader>
                <nav
                  aria-label="移动端导航"
                  className="flex flex-col gap-2 px-4"
                >
                  {links.map((link) => (
                    <Button
                      key={link.to}
                      variant="ghost"
                      className="justify-start"
                      asChild
                    >
                      <Link
                        to={link.to}
                        aria-current={linkActive(pathname, link.to) ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
