import { Navigate, useSearchParams } from "react-router"

import { useSiteContent } from "@/lib/site-content"

export function BlogPage() {
  const { articles } = useSiteContent()
  const [searchParams] = useSearchParams()
  const category = searchParams.get("category")
  const firstArticle =
    articles.find((article) => article.category === category) ?? articles[0]

  return firstArticle ? (
    <Navigate to={`/blog/${firstArticle.slug}`} replace />
  ) : null
}
