export type ArticleRecord = {
  id: number
  slug: string
  title: string
  summary: string
  markdown: string
  category: string
  tags: string[]
  status: "draft" | "published"
  date: string
  readingMinutes: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type CategoryRecord = { id: number; slug: string; name: string; description: string }
export type TagRecord = { id: number; slug: string; name: string }
export type ProjectRecord = {
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
  links: { label: string; url: string }[]
  technologies: string[]
  status: "draft" | "published"
  sortOrder: number
  createdAt: string
  updatedAt: string
}
export type SiteSettings = {
  siteName: string
  siteDescription: string
  aboutIntro: string
  githubUsername: string
}
export type SiteContent = {
  articles: ArticleRecord[]
  categories: CategoryRecord[]
  tags: TagRecord[]
  projects: ProjectRecord[]
  settings: SiteSettings
}
export type AuthUser = {
  id: number
  githubId: number
  login: string
  name: string
  avatarUrl: string
  role: "admin" | "reader"
}
export type CommentRecord = {
  id: number
  articleId: number
  articleSlug: string
  user: AuthUser
  body: string
  status: "published" | "hidden"
  createdAt: string
}
export type UploadRecord = {
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
export type BackupRecord = { name: string; size: number; createdAt: string }
export type LinkPreview = {
  url: string
  title: string
  description: string
  icon: string
  image: string
  siteName: string
}
export type GitHubAuthConfig = {
  clientId: string
  hasSecret: boolean
  hasToken: boolean
  configured: boolean
  callbackUrl: string
}
export type WebDAVConfig = {
  enabled: boolean
  url: string
  username: string
  hasPassword: boolean
  publicBase: string
  storageName: string
  target: "local" | "webdav"
}

export function loadLinkPreview(url: string, signal?: AbortSignal) {
  return api<LinkPreview>(`/link-preview?url=${encodeURIComponent(url)}`, { signal })
}

export function assetHref(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  if (typeof window === "undefined") return url
  return `${window.location.origin}${url}`
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `请求失败 (${response.status})`)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export function saveResource<T>(resource: string, value: T) {
  return api<T>(`/admin/${resource}`, { method: "PUT", body: JSON.stringify(value) })
}

export function deleteResource(resource: string, id: number) {
  return api<void>(`/admin/${resource}/${id}`, { method: "DELETE" })
}

export function uploadAsset(file: File, onProgress?: (percent: number) => void) {
  const body = new FormData()
  body.append("file", file)
  if (!onProgress) return api<UploadRecord>("/admin/uploads", { method: "POST", body })
  return new Promise<UploadRecord>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/admin/uploads")
    xhr.withCredentials = true
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)))
    }
    xhr.onload = () => {
      let data: { error?: string } & Partial<UploadRecord> = {}
      try { data = JSON.parse(xhr.responseText || "{}") } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve(data as UploadRecord)
        return
      }
      reject(new Error(data.error || `请求失败 (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error("上传失败"))
    xhr.send(body)
  })
}

export function adminLogin(username: string, password: string) {
  return api<{ user: AuthUser }>("/auth/admin/login", { method: "POST", body: JSON.stringify({ username, password }) })
}

export function updateAdminAccount(body: { username: string; currentPassword: string; newPassword?: string }) {
  return api<AuthUser>("/admin/account", { method: "PUT", body: JSON.stringify(body) })
}

export function loadGitHubAuth() {
  return api<GitHubAuthConfig>("/admin/github")
}

export function saveGitHubAuth(body: {
  clientId: string
  clientSecret?: string
  githubToken?: string
  clearSecret?: boolean
  clearToken?: boolean
}) {
  return api<GitHubAuthConfig>("/admin/github", { method: "PUT", body: JSON.stringify(body) })
}

export function loadWebDAV() {
  return api<WebDAVConfig>("/admin/webdav")
}

export function saveWebDAV(body: {
  url: string
  username: string
  password?: string
  publicBase: string
  storageName: string
  target: "local" | "webdav"
  clearPassword?: boolean
}) {
  return api<WebDAVConfig>("/admin/webdav", { method: "PUT", body: JSON.stringify(body) })
}

export function testWebDAV() {
  return api<{ ok: boolean; message: string }>("/admin/webdav/test", { method: "POST" })
}
