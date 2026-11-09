import { BlogList } from "@/components/blog-list"
import { HeroSection } from "@/components/hero-section"
import { Separator } from "@/components/ui/separator"

export function HomePage() {
  return (
    <>
      <HeroSection />
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <Separator />
      </div>
      <BlogList showCategoriesLink />
    </>
  )
}
