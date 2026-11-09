import * as React from "react"
import { Route, Routes, useLocation } from "react-router"

import { AdminFallback, PageFallback } from "@/components/page-fallback"
import { SiteBackground } from "@/components/site-background"
import { SiteHeader } from "@/components/site-header"
import { Footer7 } from "@/components/ui/footer-7"
import { Toaster } from "@/components/ui/sonner"
import { SiteContentProvider } from "@/lib/site-content"
import { BlogPage } from "@/pages/blog-page"
import { HomePage } from "@/pages/home-page"
import { ProjectDetailPage } from "@/pages/project-detail-page"
import { ProjectsPage } from "@/pages/projects-page"

const AdminPage = React.lazy(() => import("@/pages/admin-page").then((module) => ({ default: module.AdminPage })))
const AboutPage = React.lazy(() => import("@/pages/about-page").then((module) => ({ default: module.AboutPage })))
const ArticlePage = React.lazy(() => import("@/pages/article-page").then((module) => ({ default: module.ArticlePage })))
const BlogCategoriesPage = React.lazy(() =>
  import("@/pages/blog-categories-page").then((module) => ({ default: module.BlogCategoriesPage }))
)

function ScrollToRoute() {
  const { pathname, hash } = useLocation()

  React.useEffect(() => {
    if (hash) {
      const frame = window.requestAnimationFrame(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView()
      })
      return () => window.cancelAnimationFrame(frame)
    }

    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}

function PublicPage({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<PageFallback />}>{children}</React.Suspense>
}

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith("/admin")
  const showFooter = !pathname.startsWith("/projects") && !pathname.startsWith("/blog") && !isAdmin

  return (
    <SiteContentProvider>
      <div className="relative isolate min-h-screen">
        <SiteBackground />
        {!isAdmin && <SiteHeader />}
        <ScrollToRoute />
        <Routes>
          <Route
            path="/admin"
            element={
              <React.Suspense fallback={<AdminFallback />}>
                <AdminPage />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/:section"
            element={
              <React.Suspense fallback={<AdminFallback />}>
                <AdminPage />
              </React.Suspense>
            }
          />
          <Route path="/" element={<HomePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route
            path="/blog/:slug"
            element={
              <PublicPage>
                <ArticlePage />
              </PublicPage>
            }
          />
          <Route
            path="/blog/categories"
            element={
              <PublicPage>
                <BlogCategoriesPage />
              </PublicPage>
            }
          />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:slug" element={<ProjectDetailPage />} />
          <Route
            path="/about"
            element={
              <PublicPage>
                <AboutPage />
              </PublicPage>
            }
          />
        </Routes>
        {showFooter && <Footer7 />}
        {!isAdmin && <Toaster richColors position="top-right" />}
      </div>
    </SiteContentProvider>
  )
}
