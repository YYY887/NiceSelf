import { Link } from "react-router"
import { BookOpenText, DatabaseBackup, Files, FolderKanban, House, LayoutDashboard, MessageSquareText, Moon, Settings2, Sun, Tags } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/components/theme-provider"
import { toggleThemeWithCircle } from "@/lib/theme-transition"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar"
import type { AuthUser, SiteContent } from "@/lib/api"

export type AdminSection = "overview" | "articles" | "projects" | "taxonomy" | "files" | "comments" | "backups" | "settings"

const entries = [
  { id: "overview", label: "概览", icon: LayoutDashboard },
  { id: "articles", label: "文章", icon: BookOpenText },
  { id: "projects", label: "项目", icon: FolderKanban },
  { id: "taxonomy", label: "分类与标签", icon: Tags },
  { id: "files", label: "文件库", icon: Files },
  { id: "comments", label: "评论", icon: MessageSquareText },
  { id: "backups", label: "数据备份", icon: DatabaseBackup },
  { id: "settings", label: "站点设置", icon: Settings2 },
] as const

export function AdminSidebar({ active, onSelect, user, content, commentCount, uploadCount }: {
  active: AdminSection
  onSelect: (section: AdminSection) => void
  user: AuthUser
  content: SiteContent
  commentCount: number
  uploadCount: number
}) {
  const { setTheme } = useTheme()
  const { isMobile, setOpenMobile } = useSidebar()
  const counts: Partial<Record<AdminSection, number>> = {
    articles: content.articles.length,
    projects: content.projects.length,
    comments: commentCount,
    files: uploadCount,
  }

  return <Sidebar collapsible="icon" className="border-sidebar-border">
    <SidebarHeader className="px-3 pt-5 pb-3">
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" asChild tooltip="QianQiu Studio">
        <Link to="/"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BookOpenText className="size-4" /></span><span className="flex min-w-0 flex-col"><span className="truncate text-sm font-semibold">QianQiu Studio</span><span className="truncate text-xs text-muted-foreground">内容工作台</span></span></Link>
      </SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    </SidebarHeader>
    <Separator />
    <SidebarContent className="px-2 py-4">
      <SidebarGroup><SidebarGroupLabel>工作区</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>
        {entries.map(({ id, label, icon: Icon }) => <SidebarMenuItem key={id}>
          <SidebarMenuButton type="button" tooltip={label} isActive={active === id} onClick={() => { onSelect(id); if (isMobile) setOpenMobile(false) }}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </SidebarMenuButton>
          {counts[id] !== undefined && <SidebarMenuBadge>{counts[id]}</SidebarMenuBadge>}
        </SidebarMenuItem>)}
      </SidebarMenu></SidebarGroupContent></SidebarGroup>
    </SidebarContent>
    <SidebarFooter className="gap-3 p-3">
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip="返回网站"><Link to="/"><House /><span>返回网站</span></Link></SidebarMenuButton></SidebarMenuItem>
        <SidebarMenuItem><SidebarMenuButton type="button" tooltip="切换日夜主题" onClick={(event) => toggleThemeWithCircle(setTheme, event.currentTarget)}><Moon className="dark:hidden" /><Sun className="hidden dark:block" /><span>切换主题</span></SidebarMenuButton></SidebarMenuItem>
      </SidebarMenu>
      <Separator />
      <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
        <Avatar className="size-8"><AvatarImage src={user.avatarUrl} alt="" /><AvatarFallback>{user.login.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
        <div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium">{user.name || user.login}</p><p className="truncate text-xs text-muted-foreground">管理员 · {user.login}</p></div>
      </div>
    </SidebarFooter>
  </Sidebar>
}
