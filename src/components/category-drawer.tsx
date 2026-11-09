import * as React from "react"
import { FolderOpen, ArrowUpRight } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export function CategoryDrawer({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { articles, categories } = useSiteContent()
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <FolderOpen data-icon="inline-start" aria-hidden="true" />
          文章分类
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b pb-5">
          <SheetTitle>文章分类</SheetTitle>
          <SheetDescription>从一个主题开始阅读</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-7 px-4 pb-8">
          {categories.map((topic) => {
            const categoryArticles = articles.filter((article) => article.category === topic.slug)

            return (
              <section key={topic.slug} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">{topic.name}</h2>
                  <Badge variant="secondary">{categoryArticles.length} 篇</Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{topic.description}</p>
                {categoryArticles.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {categoryArticles.map((article) => (
                      <Button key={article.slug} variant="ghost" className="h-auto justify-between py-3 text-left" asChild>
                        <Link to={`/blog/${article.slug}`} onClick={() => setOpen(false)}>
                          <span className="min-w-0 truncate">{article.title}</span>
                          <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">文章还在整理中</p>
                )}
                <Separator />
              </section>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
