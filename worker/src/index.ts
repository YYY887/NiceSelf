import { Hono } from "hono"
import type { Context, Next } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { PASSWORD_ADMIN_GITHUB_ID, Store } from "./store"
import { ensureSeed } from "./seed"
import type { Article, Category, Env, GitHubAuthView, Project, Settings, Tag, User, Variables, WebDAVView } from "./types"
import { validWebDAVEndpoint, webdavDelete, webdavGet, webdavLabel, webdavProbe, webdavPublicURL, webdavPut, webdavReady } from "./webdav"
import {
  cleanSlug,
  fail,
  hashPassword,
  HttpError,
  mapError,
  now,
  normalizeProjectURL,
  publicURL,
  randomHex,
  runeCount,
  sameOrigin,
  sessionDays,
  sha256Hex,
  slugify,
  validAdminUsername,
  validGitHubLogin,
  validSlug,
  validURL,
  verifyPassword,
} from "./util"

const app = new Hono<{ Bindings: Env; Variables: Variables }>()
const githubPathPart = /^[A-Za-z0-9_.-]{1,100}$/
const backupName = /^site-\d{8}-\d{6}-[0-9a-f]{8}\.json$/
const maxUpload = 50 * 1024 * 1024

app.use("/api/*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff")
  c.header("Referrer-Policy", "strict-origin-when-cross-origin")
  const method = c.req.method
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && !sameOrigin(c.req.header("Origin"), publicURL(c), new URL(c.req.url).host)) {
    return c.text("invalid origin", 403)
  }
  await ensureSeed(Store.from(c.env))
  await next()
})

app.onError((error, c) => {
  const mapped = mapError(error)
  if (!(error instanceof HttpError)) console.error(error)
  return c.json({ error: mapped.message }, mapped.status as 400 | 401 | 403 | 404 | 409 | 413 | 500 | 502 | 503)
})

app.get("/api/health", (c) => c.json({ ok: true }))

app.get("/api/content", async (c) => {
  const store = Store.from(c.env)
  const [articles, categories, tags, projects, settings] = await Promise.all([
    store.articles(false),
    store.categories(),
    store.tags(),
    store.projects(false),
    store.settings(),
  ])
  return c.json({ articles, categories, tags, projects, settings })
})

app.get("/api/articles/:slug", async (c) => c.json(await Store.from(c.env).articleBySlug(c.req.param("slug"))))

app.get("/api/github/profile", (c) => githubJSON(c, (name) => `https://api.github.com/users/${encodeURIComponent(name)}`, 15))
app.get("/api/github/repositories", (c) => githubJSON(c, (name) => `https://api.github.com/users/${encodeURIComponent(name)}/repos?sort=updated&per_page=4`, 15))
app.get("/api/github/contributions", (c) => githubJSON(c, (name) => `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(name)}?y=last`, 60))
app.get("/api/github/repository", async (c) => {
  const owner = c.req.query("owner") || ""
  const repo = c.req.query("repo") || ""
  if (!githubPathPart.test(owner) || !githubPathPart.test(repo) || owner === "." || owner === ".." || repo === "." || repo === "..") fail(400, "无效的 GitHub 仓库地址")
  return c.json(await githubGet(c, `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, 15))
})
app.get("/api/link-preview", async (c) => {
  const raw = (c.req.query("url") || "").trim()
  let target: URL
  try { target = new URL(raw) } catch { fail(400, "无效链接") }
  if ((target.protocol !== "http:" && target.protocol !== "https:") || !target.hostname.includes(".")) fail(400, "无效链接")
  if (blockedPreviewHost(target.hostname)) fail(400, "不支持的链接")
  return c.json(await fetchLinkPreview(target))
})

app.get("/api/comments", async (c) => {
  const slug = c.req.query("article") || ""
  if (!slug) fail(400, "缺少文章 slug")
  return c.json(await Store.from(c.env).comments(slug, false))
})

app.post("/api/comments", requireUser, async (c) => {
  const body = await c.req.json<{ articleSlug?: string; body?: string }>()
  const text = (body.body || "").trim()
  if (runeCount(text) < 2 || runeCount(text) > 2000) fail(400, "评论需为 2–2000 字")
  const user = c.get("user")
  return c.json(await Store.from(c.env).addComment(body.articleSlug || "", user.id, text, user), 201)
})

app.get("/api/auth/me", async (c) => {
  const { clientId, clientSecret } = await resolvedOAuth(c)
  const user = await currentUser(c)
  return c.json({ user, oauthEnabled: Boolean(clientId && clientSecret) })
})

app.post("/api/auth/admin/login", async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>()
  const username = (body.username || "").trim()
  const store = Store.from(c.env)
  const account = await store.adminCredentials()
  if (!account || !username || !body.password || username.toLowerCase() !== account.username.toLowerCase() || !(await verifyPassword(body.password, account.passwordHash))) {
    fail(401, "账号或密码错误")
  }
  const user = await store.upsertUser({ githubId: PASSWORD_ADMIN_GITHUB_ID, login: account.username, name: account.username, avatarUrl: "", role: "admin" })
  await setSession(c, user.id)
  return c.json({ user })
})

app.get("/api/auth/github/start", async (c) => {
  const { clientId, clientSecret } = await resolvedOAuth(c)
  if (!clientId || !clientSecret || !publicURL(c)) fail(503, "尚未配置 GitHub OAuth")
  const state = await randomHex(32)
  const secure = publicURL(c).startsWith("https://")
  setCookie(c, "qianqiu_oauth_state", state, { path: "/api/auth/github/callback", maxAge: 600, httpOnly: true, secure, sameSite: "Lax" })
  setCookie(c, "qianqiu_oauth_return", encodeURIComponent(safeReturnTo(c.req.query("returnTo") || "/")), { path: "/api/auth/github/callback", maxAge: 600, httpOnly: true, secure, sameSite: "Lax" })
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: callbackURL(c), state })
  return c.redirect(`https://github.com/login/oauth/authorize?${q}`)
})

app.get("/api/auth/github/callback", async (c) => {
  const cookie = getCookie(c, "qianqiu_oauth_state")
  const secure = publicURL(c).startsWith("https://")
  if (!cookie || cookie !== c.req.query("state")) fail(400, "GitHub 登录状态无效，请重新登录")
  deleteCookie(c, "qianqiu_oauth_state", { path: "/api/auth/github/callback", secure, sameSite: "Lax" })
  let returnTo = "/"
  try {
    returnTo = safeReturnTo(decodeURIComponent(getCookie(c, "qianqiu_oauth_return") || "/"))
  } catch {
    returnTo = "/"
  }
  deleteCookie(c, "qianqiu_oauth_return", { path: "/api/auth/github/callback", secure, sameSite: "Lax" })
  if (c.req.query("error")) return c.redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}login=cancelled`)
  const code = c.req.query("code") || ""
  if (!code) fail(400, "GitHub 未返回授权码")
  const { clientId, clientSecret } = await resolvedOAuth(c)
  if (!clientId || !clientSecret) fail(503, "尚未配置 GitHub OAuth")
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackURL(c),
    }),
  })
  const tokenData = (await tokenRes.json()) as { access_token?: string }
  if (!tokenRes.ok || !tokenData.access_token) fail(502, "GitHub 授权失败")
  const profileRes = await fetch("https://api.github.com/user", {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "QianQiu-MySelf" },
  })
  const profile = (await profileRes.json()) as { id?: number; login?: string; name?: string; avatar_url?: string }
  if (!profileRes.ok || !profile.id || !profile.login) fail(502, "GitHub 用户资料无效")
  const user = await Store.from(c.env).upsertUser({
    githubId: profile.id,
    login: profile.login,
    name: profile.name || profile.login,
    avatarUrl: profile.avatar_url || "",
    role: "reader",
  })
  await setSession(c, user.id)
  return c.redirect(returnTo)
})

app.post("/api/auth/logout", requireUser, async (c) => {
  const token = getCookie(c, "qianqiu_session")
  if (token) await Store.from(c.env).deleteSession(await sha256Hex(token))
  deleteCookie(c, "qianqiu_session", { path: "/", secure: publicURL(c).startsWith("https://"), sameSite: "Lax" })
  return c.json({ ok: true })
})

app.get("/api/admin/content", requireAdmin, async (c) => {
  const store = Store.from(c.env)
  const [articles, categories, tags, projects, settings] = await Promise.all([
    store.articles(true),
    store.categories(),
    store.tags(),
    store.projects(true),
    store.settings(),
  ])
  return c.json({ articles, categories, tags, projects, settings })
})

app.put("/api/admin/articles/order", requireAdmin, async (c) => {
  const body = await c.req.json<{ ids?: number[] }>()
  await Store.from(c.env).reorder("articles", body.ids || [])
  return c.json({ ok: true })
})
app.put("/api/admin/projects/order", requireAdmin, async (c) => {
  const body = await c.req.json<{ ids?: number[] }>()
  await Store.from(c.env).reorder("projects", body.ids || [])
  return c.json({ ok: true })
})

app.put("/api/admin/articles", requireAdmin, async (c) => {
  const v = (await c.req.json<Article>()) || ({} as Article)
  v.slug = cleanSlug(v.slug || "")
  if (!validSlug(v.slug) || (v.title || "").length > 200 || (v.markdown || "").length > 1_000_000) fail(400, "文章字段无效")
  return c.json(await Store.from(c.env).saveArticle(v))
})
app.put("/api/admin/projects", requireAdmin, async (c) => {
  const v = await c.req.json<Project>()
  v.slug = cleanSlug(v.slug || "")
  v.siteUrl = normalizeProjectURL(v.siteUrl)
  v.repoUrl = normalizeProjectURL(v.repoUrl)
  v.links = (v.links || []).map((link) => ({ label: (link.label || "").trim(), url: normalizeProjectURL(link.url) }))
  if ((v.screenshots || []).length > 30) fail(400, "项目截图过多")
  for (const url of v.screenshots || []) if (!validURL(url)) fail(400, "项目截图地址无效")
  if ((v.videos || []).length > 20) fail(400, "项目视频过多")
  for (const url of v.videos || []) if (!validURL(url)) fail(400, "项目视频地址无效")
  if (v.links.some((link) => !link.label || !link.url || !validURL(link.url))) fail(400, "项目附加链接无效")
  if (!validSlug(v.slug) || (v.title || "").length > 200 || !validURL(v.coverUrl || "") || !validURL(v.logoUrl || "") || !validURL(v.siteUrl || "") || !validURL(v.repoUrl || "")) fail(400, "项目字段无效")
  return c.json(await Store.from(c.env).saveProject(v))
})
app.put("/api/admin/categories", requireAdmin, async (c) => {
  const v = await c.req.json<Category>()
  v.slug = cleanSlug(v.slug || "")
  if (!validSlug(v.slug)) fail(400, "分类 slug 无效")
  return c.json(await Store.from(c.env).saveCategory(v))
})
app.put("/api/admin/tags", requireAdmin, async (c) => {
  const v = await c.req.json<Tag>()
  v.slug = cleanSlug(v.slug || "")
  if (!validSlug(v.slug)) fail(400, "标签 slug 无效")
  return c.json(await Store.from(c.env).saveTag(v))
})
app.put("/api/admin/settings", requireAdmin, async (c) => {
  const v = await c.req.json<Settings>()
  if ((v.siteName || "").length > 100 || (v.aboutIntro || "").length > 1000 || !validGitHubLogin(v.githubUsername || "")) fail(400, "站点配置无效")
  await Store.from(c.env).saveSettings(v)
  return c.json(v)
})
app.get("/api/admin/github", requireAdmin, async (c) => c.json(await githubAuthView(c)))
app.put("/api/admin/github", requireAdmin, async (c) => {
  const body = await c.req.json<{ clientId?: string; clientSecret?: string; githubToken?: string; clearSecret?: boolean; clearToken?: boolean }>()
  const clientId = (body.clientId || "").trim()
  if (clientId && !validOAuthClientID(clientId)) fail(400, "Client ID 无效")
  if ((body.clientSecret || "").length > 256 || (body.githubToken || "").length > 256) fail(400, "密钥过长")
  const updateSecret = Boolean(body.clearSecret) || Boolean((body.clientSecret || "").trim())
  const updateToken = Boolean(body.clearToken) || Boolean((body.githubToken || "").trim())
  await Store.from(c.env).saveGitHubAuth(
    clientId,
    body.clearSecret ? "" : body.clientSecret || "",
    body.clearToken ? "" : body.githubToken || "",
    updateSecret,
    updateToken,
  )
  return c.json(await githubAuthView(c))
})
app.put("/api/admin/account", requireAdmin, async (c) => {
  const user = c.get("user")
  if (user.githubId !== PASSWORD_ADMIN_GITHUB_ID) fail(403, "请使用管理员账号密码登录后再修改")
  const body = await c.req.json<{ username?: string; currentPassword?: string; newPassword?: string }>()
  const store = Store.from(c.env)
  const account = await store.adminCredentials()
  if (!account || !(await verifyPassword(body.currentPassword || "", account.passwordHash))) fail(401, "当前密码不正确")
  const nextUser = (body.username || "").trim() || account.username
  if (!validAdminUsername(nextUser)) fail(400, "用户名需为 2–32 位字母、数字、下划线或短横线")
  let nextHash = account.passwordHash
  if (body.newPassword) {
    if (runeCount(body.newPassword) < 8 || body.newPassword.length > 72) fail(400, "密码需为 8–72 位")
    nextHash = await hashPassword(body.newPassword)
  }
  await store.setAdminCredentials(nextUser, nextHash)
  const saved = await store.upsertUser({ githubId: PASSWORD_ADMIN_GITHUB_ID, login: nextUser, name: nextUser, avatarUrl: "", role: "admin" })
  if (body.newPassword) {
    await store.deleteSessionsForUser(saved.id)
    await setSession(c, saved.id)
  }
  return c.json(saved)
})

for (const resource of ["articles", "projects", "categories", "tags", "comments"] as const) {
  app.delete(`/api/admin/${resource}/:id`, requireAdmin, async (c) => {
    const id = Number(c.req.param("id"))
    if (!Number.isInteger(id) || id < 1) fail(400, "无效 ID")
    await Store.from(c.env).delete(resource, id)
    return c.body(null, 204)
  })
}

app.post("/api/admin/articles/import", requireAdmin, async (c) => {
  const form = await c.req.parseBody()
  const file = form.file
  if (!(file instanceof File)) fail(400, "请选择 Markdown 文件")
  if (!file.name.toLowerCase().endsWith(".md")) fail(400, "仅支持 .md 文件")
  if (file.size > 1_000_000) fail(400, "Markdown 文件超过 1MB")
  const raw = await file.text()
  const item = parseMarkdownImport(raw, file.name)
  if (!validSlug(item.slug)) item.slug = `post-${Date.now().toString(36)}`
  return c.json(await Store.from(c.env).saveArticle(item), 201)
})

app.get("/api/admin/comments", requireAdmin, async (c) => c.json(await Store.from(c.env).allComments()))
app.put("/api/admin/comments/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"))
  if (!Number.isInteger(id)) fail(400, "无效 ID")
  const body = await c.req.json<{ status?: string }>()
  await Store.from(c.env).setCommentStatus(id, body.status || "")
  return c.json({ ok: true })
})

app.get("/api/admin/webdav", requireAdmin, async (c) => c.json(await webdavView(c)))
app.put("/api/admin/webdav", requireAdmin, async (c) => {
  const body = await c.req.json<{ url?: string; username?: string; password?: string; publicBase?: string; storageName?: string; target?: string; clearPassword?: boolean }>()
  const url = (body.url || "").trim()
  const publicBase = (body.publicBase || "").trim()
  const username = (body.username || "").trim()
  const storageName = (body.storageName || "").trim()
  const target = (body.target || "local").trim()
  if (target !== "local" && target !== "webdav") fail(400, "存储位置无效")
  if (!validWebDAVEndpoint(url) || !validWebDAVEndpoint(publicBase)) fail(400, "WebDAV 地址需为 http(s) URL")
  if (username.length > 128 || (body.password || "").length > 256 || [...storageName].length > 40) fail(400, "WebDAV 配置无效")
  const store = Store.from(c.env)
  const existing = await store.webdavConfig()
  const updatePassword = Boolean(body.clearPassword) || Boolean((body.password || "").trim())
  const password = body.clearPassword ? "" : (body.password || "").trim() || existing.password
  const next = { url, username, password, publicBase, storageName, target: target as "local" | "webdav" }
  if (next.target === "webdav" && !webdavReady(next)) fail(400, "启用 WebDAV 上传前请填完整地址、用户名和密码")
  await store.saveWebDAVConfig(next, updatePassword)
  return c.json(await webdavView(c))
})
app.post("/api/admin/webdav/test", requireAdmin, async (c) => {
  const cfg = await Store.from(c.env).webdavConfig()
  if (!webdavReady(cfg)) fail(400, "请先保存完整的 WebDAV 配置")
  await webdavProbe(cfg)
  return c.json({ ok: true, message: "WebDAV 连接正常" })
})

app.get("/api/admin/uploads", requireAdmin, async (c) => c.json(await Store.from(c.env).uploads()))
app.post("/api/admin/uploads", requireAdmin, async (c) => {
  const form = await c.req.parseBody({ all: true })
  const file = form.file
  if (!(file instanceof File)) fail(400, "请选择文件")
  const name = file.name.split(/[/\\]/).pop() || ""
  if (!name || name === "." || name.length > 180) fail(400, "文件名无效")
  if (file.size > maxUpload) fail(413, "文件不能超过 50 MB")
  const data = new Uint8Array(await file.arrayBuffer())
  if (data.byteLength > maxUpload) fail(413, "文件不能超过 50 MB")
  const { mime, ext } = uploadFormat(data, name)
  const hash = await sha256Hex(data)
  const store = Store.from(c.env)
  const existing = await store.uploadByHash(hash)
  if (existing) return c.json({ ...existing, duplicate: true })
  const stored = `${await randomHex(12)}${ext}`
  const dav = await store.webdavConfig()
  if (dav.target === "webdav" && !webdavReady(dav)) fail(503, "尚未完成 WebDAV 配置")
  let storage: "local" | "webdav" = "local"
  let storageName = "本地"
  let url = `/api/uploads/${stored}`
  if (dav.target === "webdav" && webdavReady(dav)) {
    await webdavPut(dav, stored, mime, data)
    storage = "webdav"
    storageName = webdavLabel(dav)
    url = webdavPublicURL(dav, stored)
  } else {
    await c.env.UPLOADS.put(stored, data, { httpMetadata: { contentType: mime }, customMetadata: { hash, name } })
  }
  return c.json(await store.insertUpload({ name, storedName: stored, mime, size: data.byteLength, hash, url, storage, storageName }), 201)
})
app.delete("/api/admin/uploads/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"))
  if (!Number.isInteger(id) || id < 1) fail(400, "无效文件 ID")
  const store = Store.from(c.env)
  const item = await store.deleteUpload(id)
  if (item.storage === "webdav") {
    const dav = await store.webdavConfig()
    if (webdavReady(dav)) await webdavDelete(dav, item.stored_name)
  } else {
    await c.env.UPLOADS.delete(item.stored_name)
  }
  return c.body(null, 204)
})
app.get("/api/uploads/:name", async (c) => {
  const name = c.req.param("name")
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return c.notFound()
  const item = await Store.from(c.env).uploadByName(name)
  if (!item) return c.notFound()
  if (item.storage === "webdav" && /^https?:\/\//.test(item.url)) return c.redirect(item.url, 302)
  const headers = new Headers()
  headers.set("Content-Type", item.mime)
  headers.set("Accept-Ranges", "bytes")
  headers.set("Cache-Control", "public, max-age=3600")
  headers.set("Content-Security-Policy", item.mime === "image/svg+xml" ? "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:" : "default-src 'none'")
  if (!serveInline(item.mime)) {
    headers.set("Content-Disposition", `attachment; filename="${item.name.replace(/["\\\r\n]/g, "")}"`)
  }
  if (item.storage === "webdav") {
    const dav = await Store.from(c.env).webdavConfig()
    if (!webdavReady(dav)) return c.notFound()
    const remote = await webdavGet(dav, item.storedName)
    if (!remote?.body) return c.notFound()
    return new Response(remote.body, { headers })
  }
  const object = await c.env.UPLOADS.get(item.storedName, c.req.raw.headers.has("Range") ? { range: c.req.raw.headers } : undefined)
  if (!object) return c.notFound()
  if (object.range) {
    const size = object.size
    let start = 0
    let length = size
    if ("suffix" in object.range) {
      length = object.range.suffix
      start = Math.max(0, size - length)
    } else {
      start = object.range.offset ?? 0
      length = object.range.length ?? Math.max(0, size - start)
    }
    const end = start + length - 1
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`)
    headers.set("Content-Length", String(length))
    return new Response(object.body, { status: 206, headers })
  }
  return new Response(object.body, { headers })
})

app.get("/api/admin/backups", requireAdmin, async (c) => c.json(await listBackups(c.env.UPLOADS)))
app.post("/api/admin/backups", requireAdmin, async (c) => {
  const dump = JSON.stringify(await Store.from(c.env).dump())
  const name = `site-${formatBackupStamp()}-${(await randomHex(4))}.json`
  const key = `backups/${name}`
  await c.env.UPLOADS.put(key, dump, { httpMetadata: { contentType: "application/json" } })
  return c.json({ name, size: dump.length, createdAt: now() }, 201)
})
app.get("/api/admin/backups/:name", requireAdmin, async (c) => {
  const name = c.req.param("name")
  if (!backupName.test(name)) return c.notFound()
  const object = await c.env.UPLOADS.get(`backups/${name}`)
  if (!object) return c.notFound()
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  })
})

export default app

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

async function requireUser(c: AppContext, next: Next) {
  const user = await currentUser(c)
  if (!user) fail(401, "请先使用 GitHub 登录")
  c.set("user", user)
  await next()
}

async function requireAdmin(c: AppContext, next: Next) {
  const user = await currentUser(c)
  if (!user) fail(401, "请先登录管理员账号")
  if (user.role !== "admin" || user.githubId !== PASSWORD_ADMIN_GITHUB_ID) fail(403, "仅管理员可以操作")
  c.set("user", user)
  await next()
}

async function currentUser(c: AppContext): Promise<User | null> {
  const token = getCookie(c, "qianqiu_session")
  if (!token) return null
  return (await Store.from(c.env).sessionUser(await sha256Hex(token))) || null
}

async function setSession(c: AppContext, userId: number) {
  const secret = await randomHex(32)
  const expires = new Date(Date.now() + sessionDays(c) * 24 * 60 * 60 * 1000)
  await Store.from(c.env).createSession(await sha256Hex(secret), userId, expires.toISOString())
  setCookie(c, "qianqiu_session", secret, { path: "/", expires, httpOnly: true, secure: publicURL(c).startsWith("https://"), sameSite: "Lax" })
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || /[\r\n\\]/.test(value)) return "/"
  return value
}

async function githubJSON(c: AppContext, urlFor: (name: string) => string, minutes: number) {
  const settings = await Store.from(c.env).settings()
  if (!settings.githubUsername) fail(500, "读取 GitHub 配置失败")
  return c.json(await githubGet(c, urlFor(settings.githubUsername), minutes))
}

async function webdavView(c: AppContext): Promise<WebDAVView> {
  const cfg = await Store.from(c.env).webdavConfig()
  return {
    enabled: webdavReady(cfg),
    url: cfg.url,
    username: cfg.username,
    hasPassword: Boolean(cfg.password),
    publicBase: cfg.publicBase,
    storageName: webdavLabel(cfg),
    target: cfg.target,
  }
}

function callbackURL(c: AppContext) {
  return `${publicURL(c).replace(/\/$/, "")}/api/auth/github/callback`
}

async function resolvedOAuth(c: AppContext) {
  const stored = await Store.from(c.env).githubAuth()
  return {
    stored,
    clientId: stored.clientId || c.env.GITHUB_CLIENT_ID || "",
    clientSecret: stored.clientSecret || c.env.GITHUB_CLIENT_SECRET || "",
    token: stored.token || c.env.GITHUB_TOKEN || "",
  }
}

async function githubAuthView(c: AppContext): Promise<GitHubAuthView> {
  const { stored, clientId, clientSecret, token } = await resolvedOAuth(c)
  return {
    clientId: stored.clientId || c.env.GITHUB_CLIENT_ID || "",
    hasSecret: Boolean(stored.clientSecret || c.env.GITHUB_CLIENT_SECRET),
    hasToken: Boolean(token),
    configured: Boolean(clientId && clientSecret),
    callbackUrl: callbackURL(c),
  }
}

function validOAuthClientID(value: string) {
  return /^[A-Za-z0-9._-]{8,128}$/.test(value)
}

async function githubGet(c: AppContext, url: string, minutes: number) {
  const bust = (await Store.from(c.env).db.prepare(`SELECT value FROM settings WHERE key='github_cache_bust'`).first<{ value: string }>())?.value || "0"
  const cacheKey = new Request(`https://qianqiu.cache/${bust}/${url}`)
  const cached = await caches.default.match(cacheKey)
  if (cached) return cached.json()
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "QianQiu-MySelf" }
  const token = (await resolvedOAuth(c)).token
  if (token && url.startsWith("https://api.github.com/")) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { headers })
  if (!response.ok) fail(502, `GitHub 服务返回 ${response.status}`)
  const data = await response.json()
  const stored = new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${minutes * 60}` } })
  await caches.default.put(cacheKey, stored.clone())
  return data
}

function parseMarkdownImport(raw: string, filename: string): Article {
  const item: Article = {
    id: 0,
    slug: slugify(filename.replace(/\.md$/i, "")),
    title: "",
    summary: "",
    markdown: raw.trim(),
    category: "",
    tags: [],
    status: "draft",
    date: new Date().toISOString().slice(0, 10),
    readingMinutes: 1,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  }
  let lines = raw.replace(/\r\n/g, "\n").split("\n")
  if (lines.length > 2 && lines[0].trim() === "---") {
    let end = -1
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trim() === "---") {
        end = i
        break
      }
      const parts = lines[i].split(":")
      if (parts.length < 2) continue
      const key = parts[0].trim()
      const value = parts.slice(1).join(":").trim().replace(/^['"]|['"]$/g, "")
      if (key === "title") item.title = value
      if (key === "slug") item.slug = cleanSlug(value)
      if (key === "description" || key === "summary") item.summary = value
      if (key === "category") item.category = value
      if (key === "tags") item.tags = value.replace(/^\[|\]$/g, "").split(",").map((part) => part.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean)
    }
    if (end > 0) {
      lines = lines.slice(end + 1)
      item.markdown = lines.join("\n").trim()
    }
  }
  for (const line of lines) {
    const trimmed = line.trim()
    if (!item.title && trimmed.startsWith("# ")) item.title = trimmed.slice(2).trim()
    if (!item.summary && trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("```")) item.summary = trimmed
  }
  if (!item.title) item.title = filename.replace(/\.md$/i, "")
  if (runeCount(item.summary) > 160) item.summary = [...item.summary].slice(0, 160).join("")
  return item
}

function originalExtension(name: string) {
  const match = name.match(/(\.[a-z0-9]{1,8})$/i)
  return match ? match[1].toLowerCase() : ""
}

function mimeFromExtension(ext: string) {
  const types: Record<string, string> = {
    ".html": "text/html",
    ".htm": "text/html",
    ".md": "text/plain",
    ".txt": "text/plain",
    ".json": "application/json",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".xml": "application/xml",
    ".css": "text/css",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".csv": "text/csv",
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  }
  return types[ext] || ""
}

function serveInline(mime: string) {
  return mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/") || mime === "application/pdf"
}

function uploadFormat(data: Uint8Array, originalName: string) {
  const orig = originalExtension(originalName)
  let mime = "application/octet-stream"
  let sniffed = ".bin"
  if (isSVG(data)) {
    mime = "image/svg+xml"
    sniffed = ".svg"
  } else if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    mime = "image/png"
    sniffed = ".png"
  } else if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    mime = "image/jpeg"
    sniffed = ".jpg"
  } else if (data.length >= 12 && data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) {
    mime = "image/webp"
    sniffed = ".webp"
  } else if (data.length >= 6 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    mime = "image/gif"
    sniffed = ".gif"
  } else if (data.length >= 4 && data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
    mime = "application/pdf"
    sniffed = ".pdf"
  } else if (data.length >= 12 && data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70) {
    mime = "video/mp4"
    sniffed = ".mp4"
  } else if (isHTML(data)) {
    mime = "text/html"
    sniffed = ".html"
  } else if (isMostlyText(data)) {
    mime = "text/plain"
    sniffed = ".txt"
  }
  const ext = orig || sniffed
  if (orig && (mime === "application/octet-stream" || mime === "text/plain")) {
    const mapped = mimeFromExtension(orig)
    if (mapped) mime = mapped
  }
  return { mime, ext }
}

function isHTML(data: Uint8Array) {
  const text = new TextDecoder().decode(data.slice(0, 512)).replace(/^\uFEFF/, "").trim()
  return /^<!doctype html/i.test(text) || /^<html[\s>]/i.test(text)
}

function isSVG(data: Uint8Array) {
  const text = new TextDecoder().decode(data.slice(0, 2048)).replace(/^\uFEFF/, "").replace(/<\?xml[^?]*\?>/i, "").replace(/<!--[\s\S]*?-->/g, "").trim()
  return /^<svg[\s>]/i.test(text)
}

function isMostlyText(data: Uint8Array) {
  const sample = data.slice(0, 512)
  let odd = 0
  for (const byte of sample) if (byte === 0 || (byte < 9 && byte !== 10 && byte !== 13) || (byte > 13 && byte < 32 && byte !== 9)) odd += 1
  return odd < sample.length / 10
}

type LinkPreview = { url: string; title: string; description: string; icon: string; image: string; siteName: string }

const previewCache = new Map<string, { value: LinkPreview; until: number }>()

function blockedPreviewHost(host: string) {
  const name = host.toLowerCase()
  if (name === "localhost" || name.endsWith(".localhost") || name.endsWith(".local") || name === "metadata.google.internal") return true
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fc|fd)/i.test(name)) return true
  return false
}

function previewAttr(tag: string, name: string) {
  return new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1] || ""
}

function decodePreviewText(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

function absPreviewURL(base: URL, ref: string) {
  const value = ref.trim()
  if (!value || /^(javascript|data):/i.test(value)) return ""
  try { return new URL(value, base).href } catch { return "" }
}

function fallbackPreview(target: URL): LinkPreview {
  const host = target.hostname.replace(/^www\./, "")
  return {
    url: target.href,
    title: target.pathname && target.pathname !== "/" ? `${host}${target.pathname}` : host,
    description: "",
    icon: `${target.origin}/favicon.ico`,
    image: "",
    siteName: target.hostname,
  }
}

async function fetchLinkPreview(target: URL): Promise<LinkPreview> {
  const cached = previewCache.get(target.href)
  if (cached && cached.until > Date.now()) return cached.value
  const fallback = fallbackPreview(target)
  let preview = fallback
  try {
    const response = await fetch(target.href, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; QianQiuPreview/1.0)", Accept: "text/html,application/xhtml+xml" },
    })
    const type = (response.headers.get("content-type") || "").toLowerCase()
    if (response.ok && (!type || type.includes("html") || type.includes("xml"))) {
      const html = (await response.text()).slice(0, 256 * 1024)
      const meta: Record<string, string> = {}
      for (const tag of html.match(/<meta\s+[^>]+>/gi) || []) {
        const key = (previewAttr(tag, "property") || previewAttr(tag, "name")).toLowerCase()
        const content = previewAttr(tag, "content")
        if (key && content) meta[key] = content
      }
      const titleTag = decodePreviewText(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "")
      const title = decodePreviewText(meta["og:title"] || meta["twitter:title"] || titleTag) || fallback.title
      let description = decodePreviewText(meta["og:description"] || meta["twitter:description"] || meta.description || "")
      if ([...description].length > 180) description = `${[...description].slice(0, 180).join("")}…`
      let icon = ""
      for (const tag of html.match(/<link\s+[^>]+>/gi) || []) {
        if (/icon|apple-touch-icon/i.test(previewAttr(tag, "rel"))) {
          icon = absPreviewURL(target, previewAttr(tag, "href"))
          if (icon) break
        }
      }
      preview = {
        url: target.href,
        title,
        description,
        icon: icon || fallback.icon,
        image: absPreviewURL(target, meta["og:image"] || meta["twitter:image"] || ""),
        siteName: decodePreviewText(meta["og:site_name"] || target.hostname),
      }
    }
  } catch {
    preview = fallback
  }
  previewCache.set(target.href, { value: preview, until: Date.now() + 30 * 60 * 1000 })
  return preview
}

async function listBackups(bucket: R2Bucket) {
  const listed = await bucket.list({ prefix: "backups/" })
  return listed.objects
    .map((item) => ({ name: item.key.replace(/^backups\//, ""), size: item.size, createdAt: item.uploaded.toISOString() }))
    .filter((item) => backupName.test(item.name))
    .sort((a, b) => (a.name < b.name ? 1 : -1))
}

function formatBackupStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
}
