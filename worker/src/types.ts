export type Env = {
  DB: D1Database
  UPLOADS: R2Bucket
  ASSETS?: Fetcher
  PUBLIC_URL: string
  SESSION_DAYS?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GITHUB_TOKEN?: string
}

export type User = {
  id: number
  githubId: number
  login: string
  name: string
  avatarUrl: string
  role: "admin" | "reader"
}

export type Article = {
  id: number
  slug: string
  title: string
  summary: string
  markdown: string
  category: string
  tags: string[]
  status: string
  date: string
  readingMinutes: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type Category = { id: number; slug: string; name: string; description: string }
export type Tag = { id: number; slug: string; name: string }
export type ProjectLink = { label: string; url: string }
export type Project = {
  id: number
  slug: string
  title: string
  summary: string
  markdown: string
  coverUrl: string
  logoUrl: string
  screenshots: string[]
  videos: string[]
  siteUrl: string
  siteLabel: string
  repoUrl: string
  repoLabel: string
  links: ProjectLink[]
  technologies: string[]
  status: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}
export type Settings = {
  siteName: string
  siteDescription: string
  aboutIntro: string
  githubUsername: string
}

export type GitHubAuthView = {
  clientId: string
  hasSecret: boolean
  hasToken: boolean
  configured: boolean
  callbackUrl: string
}
export type Comment = {
  id: number
  articleId: number
  articleSlug: string
  user: User
  body: string
  status: string
  createdAt: string
}
export type Upload = {
  id: number
  name: string
  storedName: string
  url: string
  mime: string
  size: number
  storage: "local" | "webdav"
  storageName: string
  createdAt: string
  duplicate?: boolean
}

export type WebDAVView = {
  enabled: boolean
  url: string
  username: string
  hasPassword: boolean
  publicBase: string
  storageName: string
  target: "local" | "webdav"
}

export type Variables = { user: User }
