import * as React from "react"
import { ArrowUpRight, Code2, GitBranch, MapPin } from "lucide-react"

import type { Activity } from "@/components/contribution-graph"
import { GitHubContributions, GitHubContributionsFallback } from "@/components/github-contributions"
import { PageEnter } from "@/components/reveal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { GITHUB_USERNAME, fetchGitHubActivity, fetchGitHubProfile, fetchGitHubRepositories, type GitHubProfile, type GitHubRepository } from "@/lib/github"
import { useSiteContent } from "@/lib/site-content"

function AboutMark() {
  return <svg className="h-48 w-72 text-foreground/20 sm:h-60 sm:w-[390px]" viewBox="0 0 390 240" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <path d="M31 101 99 62l67 39-67 39-68-39Zm0 0v35l68 39 67-39v-35M99 140v35M120 52l67-39 67 39-67 39-67-39Zm0 0v35l67 39 67-39V52M187 91v35M225 144l67-39 67 39-67 39-67-39Zm0 0v35l67 39 67-39v-35M292 183v35" />
    <path d="m99 62 88 64 67-39m-155 53 88-49 105 53m-193 31 126-31 67 74" strokeDasharray="3 4" />
    <path d="M31 92 99 53m-60 43 60-35m-52 40 52-31m-44 36 44-27m-36 32 36-23m-28 28 28-19m-20 24 20-15m88-86 67 39m-59-43 59 34m-51-39 51 29m-43-34 43 24m-35-29 35 19m-27-24 27 14m-19-19 19 9m38 101 67 39m-59-43 59 34m-51-39 51 29m-43-34 43 24m-35-29 35 19m-27-24 27 14" opacity=".55" />
    <text x="332" y="225" fill="currentColor" stroke="none" fontSize="10" fontFamily="monospace">Fig. 01</text>
  </svg>
}

export function AboutPage() {
  const { settings } = useSiteContent()
  const profileUrl = `https://github.com/${settings.githubUsername}`
  const [profile, setProfile] = React.useState<GitHubProfile | null>(null)
  const [repositories, setRepositories] = React.useState<GitHubRepository[] | null>(null)
  const [activity, setActivity] = React.useState<Activity[] | null>(null)
  const [profileError, setProfileError] = React.useState(false)
  const [repositoriesError, setRepositoriesError] = React.useState(false)
  const [activityError, setActivityError] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    fetchGitHubProfile(signal).then(setProfile).catch(() => { if (!signal.aborted) setProfileError(true) })
    fetchGitHubRepositories(signal).then(setRepositories).catch(() => { if (!signal.aborted) setRepositoriesError(true) })
    fetchGitHubActivity(signal).then(setActivity).catch(() => { if (!signal.aborted) setActivityError(true) })
    return () => controller.abort()
  }, [])

  return <PageEnter><main className="relative min-h-screen border-y bg-background/95 pt-20 dark:bg-background/95">
    <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" style={{ backgroundImage: "linear-gradient(to right, transparent calc(50% - 390px), currentColor calc(50% - 390px), currentColor calc(50% - 389px), transparent calc(50% - 389px), transparent calc(50% + 389px), currentColor calc(50% + 389px), currentColor calc(50% + 390px), transparent calc(50% + 390px))" }} />
    <div className="relative mx-auto w-full max-w-[780px] border-x border-border/60">
      <div className="flex h-64 items-center justify-center overflow-hidden border-b bg-[linear-gradient(135deg,transparent_49.9%,var(--border)_50%,transparent_50.1%)] sm:h-72"><AboutMark /></div>
      <section aria-label="个人资料" className="border-b"><div className="flex items-end gap-5 px-6 pb-5 sm:px-8"><Avatar className="-mt-10 size-20 shrink-0 border-4 border-background shadow-sm sm:size-24"><AvatarImage src={profile?.avatar_url} alt={profile ? `${profile.login} 的 GitHub 头像` : ""} /><AvatarFallback>Q</AvatarFallback></Avatar><div className="min-w-0 pb-1"><p className="text-[10px] uppercase tracking-[.2em] text-muted-foreground">ABOUT / 关于我</p><h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{profile?.name || (profileError ? settings.githubUsername || GITHUB_USERNAME : "正在读取资料…")}</h1><p className="mt-1 font-mono text-xs text-muted-foreground">@{profile?.login ?? settings.githubUsername}</p></div><span className="ml-auto hidden pb-2 font-mono text-[10px] text-muted-foreground sm:block">Fig. 02 / PROFILE</span></div></section>
      <div className="border-b px-6 py-4 sm:px-8"><Button variant="outline" size="icon-sm" asChild><a href={profileUrl} target="_blank" rel="noreferrer" aria-label="访问 GitHub"><GitBranch className="size-4" /></a></Button><span className="ml-3 font-mono text-xs text-muted-foreground">follow me / 与我保持联系</span></div>
      <section className="grid gap-5 border-b px-6 py-6 text-sm sm:grid-cols-2 sm:px-8"><div className="space-y-3"><p className="flex items-start gap-3"><Code2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span>{profile?.bio || (profileError ? "暂时无法读取 GitHub 简介" : "正在同步 GitHub 公开资料…")}</span></p>{profile?.location && <p className="flex items-start gap-3 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{profile.location}</p>}</div><div className="grid grid-cols-3 gap-3 border-t pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><div><strong className="block text-xl font-semibold">{profile?.public_repos ?? "—"}</strong><span className="text-xs text-muted-foreground">公开仓库</span></div><div><strong className="block text-xl font-semibold">{profile?.followers ?? "—"}</strong><span className="text-xs text-muted-foreground">关注者</span></div><div><strong className="block text-xl font-semibold">{profile?.following ?? "—"}</strong><span className="text-xs text-muted-foreground">正在关注</span></div></div></section>
      <section aria-labelledby="activity-heading" className="border-b px-6 py-7 sm:px-8"><div className="mb-5 flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Fig. 03 / ACTIVITY</p><h2 id="activity-heading" className="mt-1 text-lg font-semibold">公开活动</h2></div><span className="text-xs text-muted-foreground">过去一年</span></div>{activity && activity.length > 0 ? <GitHubContributions contributions={activity} githubProfileUrl={profileUrl} blockSize={9} blockMargin={3} /> : activityError ? <p className="text-sm text-muted-foreground">暂时无法读取活动记录，请稍后重试。</p> : <GitHubContributionsFallback />}</section>
      <section className="border-b px-6 py-8 sm:px-8"><p className="font-mono text-xs italic text-muted-foreground">Hello, I’m QianQiu.</p><h2 className="mt-3 text-xl font-semibold">一个持续记录与创造的空间。</h2><p className="mt-4 max-w-prose text-sm leading-8 text-muted-foreground">{settings.aboutIntro}</p></section>
      <section aria-labelledby="repos-heading" className="px-6 py-8 sm:px-8"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Fig. 04 / OPEN SOURCE</p><h2 id="repos-heading" className="mt-1 text-lg font-semibold">最近更新的公开仓库</h2></div><Button size="sm" variant="ghost" asChild><a href={profileUrl} target="_blank" rel="noreferrer">更多作品 <ArrowUpRight data-icon="inline-end" /></a></Button></div><Separator />{repositories ? <div>{repositories.map((repository) => <a key={repository.id} href={repository.html_url} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-4 border-b py-4 transition-colors hover:text-primary"><div><h3 className="font-medium">{repository.name}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{repository.description || "暂无仓库简介"}</p></div><div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">{repository.language}</span><ArrowUpRight className="size-4" /></div></a>)}</div> : <p className="py-5 text-sm text-muted-foreground">{repositoriesError ? "暂时无法读取仓库列表。" : "正在读取公开仓库…"}</p>}</section>
    </div>
  </main></PageEnter>
}
