import type { Activity } from "@/components/contribution-graph"

export const GITHUB_USERNAME = "YYY887"
export const GITHUB_PROFILE_URL = `https://github.com/${GITHUB_USERNAME}`

export type GitHubProfile = {
  login: string
  name: string | null
  bio: string | null
  avatar_url: string
  html_url: string
  location: string | null
  public_repos: number
  followers: number
  following: number
}

export type GitHubRepository = {
  id: number
  name: string
  description: string | null
  language: string | null
  html_url: string
  stargazers_count: number
}

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  })

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`)
  }

  return response.json()
}

export async function fetchGitHubProfile(
  signal: AbortSignal
): Promise<GitHubProfile> {
  const data = await getJson(
    `/api/github/profile`,
    signal
  )
  if (!data || typeof data !== "object" || !("login" in data)) {
    throw new Error("GitHub 资料格式不正确")
  }
  return data as GitHubProfile
}

export async function fetchGitHubRepositories(
  signal: AbortSignal
): Promise<GitHubRepository[]> {
  const data = await getJson(
    `/api/github/repositories`,
    signal
  )
  if (!Array.isArray(data)) {
    throw new Error("GitHub 仓库数据格式不正确")
  }
  return data as GitHubRepository[]
}

export async function fetchGitHubActivity(
  signal: AbortSignal
): Promise<Activity[]> {
  const data = await getJson(
    `/api/github/contributions`,
    signal
  )

  if (!data || typeof data !== "object" || !("contributions" in data)) {
    throw new Error("贡献记录格式不正确")
  }

  const contributions = data.contributions
  if (!Array.isArray(contributions)) {
    throw new Error("贡献记录格式不正确")
  }

  return contributions
    .filter(
      (day): day is { date: string; count: number; level?: number } =>
        typeof day?.date === "string" &&
        typeof day?.count === "number" &&
        Number.isFinite(day.count)
    )
    .map(({ date, count, level }) => ({
      date,
      count,
      level:
        typeof level === "number" && Number.isInteger(level) && level >= 0 && level <= 4
          ? level
          : count === 0
            ? 0
            : Math.min(4, Math.ceil(count / 3)),
    }))
}
