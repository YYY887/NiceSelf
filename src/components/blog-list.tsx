import { ArrowUpRight, NotebookText } from "lucide-react"
import { Link } from "react-router"

import { CategoryDrawer } from "@/components/category-drawer"
import { Stagger, StaggerItem } from "@/components/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useSiteContent } from "@/lib/site-content"

export function BlogList({ showCategoriesLink = false }: { showCategoriesLink?: boolean }) {
  const { articles, categories } = useSiteContent()
  return (
    <main>
      <section id="blog" className="scroll-mt-16 px-6 py-14 sm:px-8 sm:py-18">
        <div className="mx-auto max-w-5xl">
          <h2 className="sr-only">文章</h2>
          {showCategoriesLink && (
            <div className="mb-5 flex justify-end">
              <CategoryDrawer />
            </div>
          )}

          {articles.length === 0 ? (
            <Empty className="min-h-56 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <NotebookText />
                </EmptyMedia>
                <EmptyTitle>还没有公开文章</EmptyTitle>
                <EmptyDescription>发布第一篇文章后，会显示在这里。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Stagger className="flex flex-col gap-3">
              {articles.map((article) => {
                const category = categories.find((topic) => topic.slug === article.category)

                return (
                  <StaggerItem key={article.slug}>
                    <Card size="sm" className="gap-0 bg-card/90 py-0 backdrop-blur-sm transition-colors motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 hover:bg-card">
                      <CardHeader className="gap-2 px-5 py-5 sm:px-6">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{category?.name ?? "文章"}</Badge>
                          <time dateTime={article.date}>{article.date}</time>
                          <span aria-hidden="true">·</span>
                          <span>{article.readingMinutes} 分钟阅读</span>
                        </div>
                        <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                          <h3>
                            <Link to={`/blog/${article.slug}`} className="hover:underline hover:underline-offset-4">
                              {article.title}
                            </Link>
                          </h3>
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {article.summary}
                        </CardDescription>
                        <CardAction className="row-span-3 flex items-start gap-1">
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link to={`/blog/${article.slug}`} aria-label={`阅读《${article.title}》`} title="阅读文章">
                              <ArrowUpRight aria-hidden="true" />
                            </Link>
                          </Button>
                        </CardAction>
                      </CardHeader>
                    </Card>
                  </StaggerItem>
                )
              })}
            </Stagger>
          )}
        </div>
      </section>
    </main>
  )
}
