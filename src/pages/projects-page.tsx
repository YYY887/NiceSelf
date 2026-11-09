import { ArrowUpRight, FolderKanban } from "lucide-react"
import { Link } from "react-router"

import { ProjectShell } from "@/components/project-shell"
import { PageEnter, Stagger, StaggerItem } from "@/components/reveal"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { useSiteContent } from "@/lib/site-content"

export function ProjectsPage() {
  const { projects } = useSiteContent()

  return (
    <ProjectShell>
      <PageEnter>
        <main className="px-6 py-10 sm:px-8 lg:py-16">
          <div className="mx-auto max-w-5xl">
            <header className="flex flex-col gap-4">
              <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">PROJECTS / 实践作品</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">项目</h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">从想法到上线，记录正在进行的创作。</p>
            </header>

            <div className="mt-12">
              {projects.length === 0 ? (
                <Empty className="min-h-56 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FolderKanban />
                    </EmptyMedia>
                    <EmptyTitle>暂无公开项目</EmptyTitle>
                    <EmptyDescription>发布项目后，会按列表展示在这里。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Stagger>
                  {projects.map((project) => (
                    <StaggerItem key={project.id}>
                      <Separator />
                      <Link
                        to={`/projects/${encodeURIComponent(project.slug)}`}
                        className="group flex items-start gap-5 py-7 transition-colors hover:text-foreground sm:gap-6"
                      >
                        {project.logoUrl ? (
                          <img src={project.logoUrl} alt="" className="size-14 shrink-0 rounded-xl border object-contain sm:size-16" />
                        ) : project.coverUrl ? (
                          <img src={project.coverUrl} alt="" className="size-14 shrink-0 rounded-xl border object-cover sm:size-16" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.title}</h2>
                            <Badge variant="outline">{project.status === "published" ? "公开项目" : "草稿"}</Badge>
                          </div>
                          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{project.summary}</p>
                          {project.technologies.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{project.technologies.join(" · ")}</p>}
                        </div>
                        <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </StaggerItem>
                  ))}
                  <Separator />
                </Stagger>
              )}
            </div>
          </div>
        </main>
      </PageEnter>
    </ProjectShell>
  )
}
