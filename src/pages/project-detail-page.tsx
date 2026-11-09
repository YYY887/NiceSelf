import { ArrowLeft, ArrowUpRight, GitBranch } from "lucide-react"
import { Link, useParams } from "react-router"

import { ProjectGallery } from "@/components/project-gallery"
import { ProjectShell } from "@/components/project-shell"
import { PageEnter } from "@/components/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSiteContent } from "@/lib/site-content"

function projectHref(value: string) {
  const trimmed = value.trim()
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed
  if (/^[\w-]+(?:\.[\w-]+)+(?::\d+)?(?:[/?#]|$)/.test(trimmed)) return `https://${trimmed}`
  try {
    const url = new URL(trimmed)
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : ""
  } catch {
    return ""
  }
}

export function ProjectDetailPage() {
  const { slug } = useParams()
  const { projects } = useSiteContent()
  const project = projects.find((item) => item.slug === slug)
  const siteHref = project ? projectHref(project.siteUrl) : ""
  const repoHref = project ? projectHref(project.repoUrl) : ""

  return (
    <ProjectShell>
      <PageEnter>
      <main className="px-6 py-10 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/projects"><ArrowLeft data-icon="inline-start" aria-hidden="true" />全部项目</Link>
          </Button>
          {!project ? (
            <div className="mt-12">
              <h1 className="text-3xl font-semibold">项目不存在</h1>
              <p className="mt-3 text-muted-foreground">这个项目可能已被删除或更改了地址。</p>
            </div>
          ) : (
            <article className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Badge variant="outline">{project.status === "published" ? "公开项目" : "草稿"}</Badge>
                <div className="flex flex-wrap gap-2">
                  {siteHref && <Button variant="outline" size="sm" asChild><a href={siteHref} target={siteHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{project.siteLabel?.trim() || "查看网站"}<ArrowUpRight data-icon="inline-end" aria-hidden="true" /></a></Button>}
                  {repoHref && <Button variant="outline" size="sm" asChild><a href={repoHref} target="_blank" rel="noreferrer"><GitBranch data-icon="inline-start" aria-hidden="true" />{project.repoLabel?.trim() || "GitHub"}</a></Button>}
                  {(project.links || []).map((link, index) => {
                    const href = projectHref(link.url)
                    return href && link.label.trim() ? <Button key={`${href}-${index}`} variant="outline" size="sm" asChild><a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{link.label}<ArrowUpRight data-icon="inline-end" aria-hidden="true" /></a></Button> : null
                  })}
                </div>
              </div>
              <div className="mt-6 flex items-center gap-4">
                {project.logoUrl && <img src={project.logoUrl} alt="" className="size-12 rounded-xl border object-contain sm:size-14" />}
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{project.title}</h1>
              </div>
              <p className="mt-4 max-w-2xl leading-8 text-muted-foreground">{project.summary}</p>
              <ProjectGallery title={project.title} coverUrl={project.coverUrl} screenshots={project.screenshots || []} />
              {project.technologies.length > 0 && <div className="mt-10 flex flex-wrap gap-2">{project.technologies.map((technology) => <Badge key={technology} variant="secondary">{technology}</Badge>)}</div>}
              {project.markdown && <><Separator className="my-10" /><p className="max-w-2xl whitespace-pre-line text-sm leading-8 text-muted-foreground">{project.markdown}</p></>}
            </article>
          )}
        </div>
      </main>
      </PageEnter>
    </ProjectShell>
  )
}
