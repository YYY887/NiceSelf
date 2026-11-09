import { Link } from "react-router"

import { Separator } from "@/components/ui/separator"

// Adapted from the Shadcnblocks Footer 7 layout for this personal site.
export function Footer7() {
  return (
    <footer className="px-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Separator className="border-t border-dashed border-foreground/20 bg-transparent data-horizontal:h-0" />
        <div className="grid gap-12 pt-16 pb-16 md:grid-cols-[minmax(0,1fr)_auto] md:gap-24">
          <div className="flex max-w-md flex-col gap-5">
            <Link to="/" className="text-xl font-semibold tracking-tight">
              QianQiu-MySelf
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              写下思考，留下作品。让值得记住的瞬间，在这里慢慢生长。
            </p>
          </div>

          <nav
            aria-label="页脚导航"
            className="grid grid-cols-2 gap-12 sm:gap-20"
          >
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold">内容</h2>
              <Link
                to="/blog"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                博客
              </Link>
              <Link
                to="/projects"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                项目
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold">站点</h2>
              <Link
                to="/about"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                关于
              </Link>
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                返回首页
              </Link>
            </div>
          </nav>
        </div>

        <Separator />
        <div className="flex flex-col gap-2 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} QianQiu-MySelf</p>
          <p>保持好奇，继续前行。</p>
        </div>
      </div>
    </footer>
  )
}
