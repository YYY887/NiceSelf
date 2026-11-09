import * as React from "react"
import { BookOpenText, FolderOpen, Search } from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useSiteContent } from "@/lib/site-content"

const pages = [
  { title: "首页", href: "/", keywords: "主页 QianQiu-MySelf" },
  { title: "文章", href: "/blog", keywords: "博客 阅读" },
  { title: "项目", href: "/projects", keywords: "作品 个人网站 QianQiu-MySelf React TypeScript" },
  { title: "关于", href: "/about", keywords: "个人资料 GitHub yyy887" },
]

export function GlobalSearch() {
  const { articles, projects } = useSiteContent()
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((previous) => !previous)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const goTo = (href: string) => {
    setOpen(false)
    navigate(href)
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="全局搜索"
        title="全局搜索 (Ctrl/⌘ + K)"
        onClick={() => setOpen(true)}
      >
        <Search aria-hidden="true" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="全局搜索"
        description="搜索文章、项目和站点页面"
      >
        <Command>
          <CommandInput placeholder="搜索文章、项目或页面…" autoFocus />
          <CommandList>
            <CommandEmpty>没有找到相关内容</CommandEmpty>
            <CommandGroup heading="页面">
              {pages.map((page) => (
                <CommandItem
                  key={page.href}
                  value={`${page.title} ${page.keywords}`}
                  onSelect={() => goTo(page.href)}
                >
                  <FolderOpen aria-hidden="true" />
                  {page.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="文章">
              {articles.map((article) => (
                <CommandItem
                  key={article.slug}
                  value={`${article.title} ${article.summary} ${article.markdown}`}
                  onSelect={() => goTo(`/blog/${article.slug}`)}
                >
                  <BookOpenText aria-hidden="true" />
                  <span className="truncate">{article.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="项目">
              {projects.map((project) => (
                <CommandItem key={project.slug} value={`${project.title} ${project.summary}`} onSelect={() => goTo(`/projects/${encodeURIComponent(project.slug)}`)}>
                  <FolderOpen aria-hidden="true" /><span className="truncate">{project.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
