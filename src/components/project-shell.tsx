import * as React from "react"

import { ContentShell } from "@/components/content-shell"
import { useSiteContent } from "@/lib/site-content"

export function ProjectShell({ children }: { children: React.ReactNode }) {
  const { projects } = useSiteContent()

  return (
    <ContentShell
      title="项目"
      navigationLabel="项目页面导航"
      items={[
        { label: "全部项目", href: "/projects" },
        ...projects.map((project) => ({
          label: project.title,
          href: `/projects/${encodeURIComponent(project.slug)}`,
        })),
      ]}
    >
      {children}
    </ContentShell>
  )
}
