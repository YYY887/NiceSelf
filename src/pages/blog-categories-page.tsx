import { CategoryDrawer } from "@/components/category-drawer"
import { BlogShell } from "@/components/blog-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BlogCategoriesPage() {
  return (
    <BlogShell>
      <main className="px-6 py-10 sm:px-8 lg:py-16">
        <Card className="mx-auto max-w-5xl bg-card/85 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl">文章分类</CardTitle>
            <p className="text-sm text-muted-foreground">选择一个主题，再挑一篇文章开始阅读。</p>
          </CardHeader>
          <CardContent>
            <CategoryDrawer defaultOpen />
          </CardContent>
        </Card>
      </main>
    </BlogShell>
  )
}
