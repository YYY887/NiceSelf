import type { Article, Category, Comment, Env, Project, ProjectLink, Settings, Tag, Upload, User } from "./types"
import { fail, jsonText, now, readStrings, today } from "./util"

const PASSWORD_ADMIN_GITHUB_ID = -1

type ArticleRow = {
  id: number
  slug: string
  title: string
  summary: string
  markdown: string
  category: string
  tags_json: string
  status: string
  date: string
  reading_minutes: number
  sort_order: number
  created_at: string
  updated_at: string
}

type ProjectRow = {
  id: number
  slug: string
  title: string
  summary: string
  markdown: string
  cover_url: string
  logo_url: string
  site_url: string
  site_label: string
  repo_url: string
  repo_label: string
  links_json: string
  technologies_json: string
  screenshots_json: string
  status: string
  sort_order: number
  created_at: string
  updated_at: string
}

type CommentRow = {
  id: number
  article_id: number
  article_slug: string
  user_id: number
  github_id: number
  login: string
  name: string
  avatar_url: string
  role: User["role"]
  body: string
  status: string
  created_at: string
}

export class Store {
  constructor(public db: D1Database) {}

  static from(env: Env) {
    return new Store(env.DB)
  }

  articles(includeDrafts: boolean) {
    const query = includeDrafts
      ? `SELECT id,slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at FROM articles ORDER BY sort_order, date DESC, id DESC`
      : `SELECT id,slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at FROM articles WHERE status='published' ORDER BY sort_order, date DESC, id DESC`
    return this.db
      .prepare(query)
      .all<ArticleRow>()
      .then((rows) => rows.results.map(mapArticle))
  }

  async articleBySlug(slug: string) {
    const row = await this.db
      .prepare(
        `SELECT id,slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at FROM articles WHERE slug=? AND status='published'`,
      )
      .bind(slug)
      .first<ArticleRow>()
    if (!row) fail(404, "文章不存在")
    return mapArticle(row)
  }

  async saveArticle(input: Article) {
    if (!input.title || !input.slug) fail(400, "标题和 slug 不能为空")
    const article = {
      ...input,
      status: input.status === "published" ? "published" : "draft",
      date: input.date || today(),
      readingMinutes: input.readingMinutes >= 1 ? input.readingMinutes : Math.max(1, Math.floor(runeLen(input.markdown) / 500)),
      tags: input.tags || [],
      updatedAt: now(),
    }
    if (!article.id) {
      article.createdAt = article.updatedAt
      const result = await this.db
        .prepare(
          `INSERT INTO articles(slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          article.slug,
          article.title,
          article.summary,
          article.markdown,
          article.category,
          jsonText(article.tags),
          article.status,
          article.date,
          article.readingMinutes,
          article.sortOrder || 0,
          article.createdAt,
          article.updatedAt,
        )
        .run()
      article.id = result.meta.last_row_id || 0
    } else {
      const result = await this.db
        .prepare(
          `UPDATE articles SET slug=?,title=?,summary=?,markdown=?,category=?,tags_json=?,status=?,date=?,reading_minutes=?,sort_order=?,updated_at=? WHERE id=?`,
        )
        .bind(
          article.slug,
          article.title,
          article.summary,
          article.markdown,
          article.category,
          jsonText(article.tags),
          article.status,
          article.date,
          article.readingMinutes,
          article.sortOrder || 0,
          article.updatedAt,
          article.id,
        )
        .run()
      if (!result.meta.changes) fail(404, "记录不存在")
    }
    return article
  }

  categories() {
    return this.db
      .prepare(`SELECT id,slug,name,description FROM categories ORDER BY id`)
      .all<Category>()
      .then((rows) => rows.results)
  }

  async saveCategory(input: Category) {
    if (!input.slug || !input.name) fail(400, "名称和 slug 不能为空")
    if (!input.id) {
      const result = await this.db.prepare(`INSERT INTO categories(slug,name,description) VALUES(?,?,?)`).bind(input.slug, input.name, input.description || "").run()
      input.id = result.meta.last_row_id || 0
    } else {
      const result = await this.db.prepare(`UPDATE categories SET slug=?,name=?,description=? WHERE id=?`).bind(input.slug, input.name, input.description || "", input.id).run()
      if (!result.meta.changes) fail(404, "记录不存在")
    }
    return input
  }

  tags() {
    return this.db.prepare(`SELECT id,slug,name FROM tags ORDER BY id`).all<Tag>().then((rows) => rows.results)
  }

  async saveTag(input: Tag) {
    if (!input.slug || !input.name) fail(400, "名称和 slug 不能为空")
    if (!input.id) {
      const result = await this.db.prepare(`INSERT INTO tags(slug,name) VALUES(?,?)`).bind(input.slug, input.name).run()
      input.id = result.meta.last_row_id || 0
    } else {
      const result = await this.db.prepare(`UPDATE tags SET slug=?,name=? WHERE id=?`).bind(input.slug, input.name, input.id).run()
      if (!result.meta.changes) fail(404, "记录不存在")
    }
    return input
  }

  projects(includeDrafts: boolean) {
    const query = includeDrafts
      ? `SELECT id,slug,title,summary,markdown,cover_url,logo_url,site_url,site_label,repo_url,repo_label,links_json,technologies_json,screenshots_json,status,sort_order,created_at,updated_at FROM projects ORDER BY sort_order,id`
      : `SELECT id,slug,title,summary,markdown,cover_url,logo_url,site_url,site_label,repo_url,repo_label,links_json,technologies_json,screenshots_json,status,sort_order,created_at,updated_at FROM projects WHERE status='published' ORDER BY sort_order,id`
    return this.db
      .prepare(query)
      .all<ProjectRow>()
      .then((rows) => rows.results.map(mapProject))
  }

  async saveProject(input: Project) {
    if (!input.slug || !input.title) fail(400, "标题和 slug 不能为空")
    const project: Project = {
      ...input,
      status: input.status === "published" ? "published" : "draft",
      screenshots: input.screenshots || [],
      links: input.links || [],
      technologies: input.technologies || [],
      updatedAt: now(),
    }
    const linksJSON = jsonText(project.links)
    if (!project.id) {
      project.createdAt = project.updatedAt
      const result = await this.db
        .prepare(
          `INSERT INTO projects(slug,title,summary,markdown,cover_url,logo_url,site_url,site_label,repo_url,repo_label,links_json,technologies_json,screenshots_json,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          project.slug,
          project.title,
          project.summary,
          project.markdown,
          project.coverUrl,
          project.logoUrl,
          project.siteUrl,
          project.siteLabel,
          project.repoUrl,
          project.repoLabel,
          linksJSON,
          jsonText(project.technologies),
          jsonText(project.screenshots),
          project.status,
          project.sortOrder || 0,
          project.createdAt,
          project.updatedAt,
        )
        .run()
      project.id = result.meta.last_row_id || 0
    } else {
      const result = await this.db
        .prepare(
          `UPDATE projects SET slug=?,title=?,summary=?,markdown=?,cover_url=?,logo_url=?,site_url=?,site_label=?,repo_url=?,repo_label=?,links_json=?,technologies_json=?,screenshots_json=?,status=?,sort_order=?,updated_at=? WHERE id=?`,
        )
        .bind(
          project.slug,
          project.title,
          project.summary,
          project.markdown,
          project.coverUrl,
          project.logoUrl,
          project.siteUrl,
          project.siteLabel,
          project.repoUrl,
          project.repoLabel,
          linksJSON,
          jsonText(project.technologies),
          jsonText(project.screenshots),
          project.status,
          project.sortOrder || 0,
          project.updatedAt,
          project.id,
        )
        .run()
      if (!result.meta.changes) fail(404, "记录不存在")
    }
    return project
  }

  async settings(): Promise<Settings> {
    const rows = await this.db.prepare(`SELECT key,value FROM settings`).all<{ key: string; value: string }>()
    const cfg: Settings = { siteName: "", siteDescription: "", aboutIntro: "", githubUsername: "" }
    for (const row of rows.results) {
      if (row.key === "site_name") cfg.siteName = row.value
      if (row.key === "site_description") cfg.siteDescription = row.value
      if (row.key === "about_intro") cfg.aboutIntro = row.value
      if (row.key === "github_username") cfg.githubUsername = row.value
    }
    return cfg
  }

  async saveSettings(cfg: Settings) {
    const values = [
      ["site_name", cfg.siteName],
      ["site_description", cfg.siteDescription],
      ["about_intro", cfg.aboutIntro],
      ["github_username", cfg.githubUsername],
      ["github_cache_bust", String(Date.now())],
    ]
    await this.db.batch(
      values.map(([key, value]) =>
        this.db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key, value),
      ),
    )
  }

  async settingValue(key: string) {
    return (await this.db.prepare(`SELECT value FROM settings WHERE key=?`).bind(key).first<{ value: string }>())?.value || ""
  }

  async githubAuth() {
    const [clientId, clientSecret, token] = await Promise.all([
      this.settingValue("github_client_id"),
      this.settingValue("github_client_secret"),
      this.settingValue("github_token"),
    ])
    return { clientId, clientSecret, token }
  }

  async saveGitHubAuth(clientId: string, clientSecret: string, token: string, updateSecret: boolean, updateToken: boolean) {
    const values: [string, string][] = [["github_client_id", clientId.trim()]]
    if (updateSecret) values.push(["github_client_secret", clientSecret.trim()])
    if (updateToken) values.push(["github_token", token.trim()])
    await this.db.batch(
      values.map(([key, value]) =>
        this.db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key, value),
      ),
    )
  }

  async delete(kind: string, id: number) {
    const tables: Record<string, string> = { articles: "articles", categories: "categories", tags: "tags", projects: "projects", comments: "comments" }
    const table = tables[kind]
    if (!table) fail(400, "未知资源")
    const result = await this.db.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run()
    if (!result.meta.changes) fail(404, "记录不存在")
  }

  async reorder(resource: string, ids: number[]) {
    if (resource !== "articles" && resource !== "projects") fail(400, "不支持排序此内容")
    const countRow = await this.db.prepare(`SELECT count(*) as n FROM ${resource}`).first<{ n: number }>()
    if ((countRow?.n || 0) !== ids.length) fail(400, "排序列表已变化，请刷新后重试")
    const seen = new Set<number>()
    const statements = []
    for (const [index, id] of ids.entries()) {
      if (id <= 0 || seen.has(id)) fail(400, "排序列表包含重复或无效条目")
      seen.add(id)
      statements.push(this.db.prepare(`UPDATE ${resource} SET sort_order=? WHERE id=?`).bind(index + 1, id))
    }
    const results = await this.db.batch(statements)
    if (results.some((item) => !item.meta.changes)) fail(400, "排序列表包含不存在的条目")
  }

  async upsertUser(user: Omit<User, "id"> & { id?: number }): Promise<User> {
    await this.db
      .prepare(
        `INSERT INTO users(github_id,login,name,avatar_url,role) VALUES(?,?,?,?,?) ON CONFLICT(github_id) DO UPDATE SET login=excluded.login,name=excluded.name,avatar_url=excluded.avatar_url,role=excluded.role`,
      )
      .bind(user.githubId, user.login, user.name, user.avatarUrl, user.role)
      .run()
    const row = await this.db.prepare(`SELECT id,github_id as githubId,login,name,avatar_url as avatarUrl,role FROM users WHERE github_id=?`).bind(user.githubId).first<User>()
    if (!row) fail(500, "无法保存用户")
    return row
  }

  createSession(hash: string, userId: number, expires: string) {
    return this.db.prepare(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)`).bind(hash, userId, expires).run()
  }

  async sessionUser(hash: string) {
    return this.db
      .prepare(
        `SELECT u.id,u.github_id as githubId,u.login,u.name,u.avatar_url as avatarUrl,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`,
      )
      .bind(hash, now())
      .first<User>()
  }

  deleteSession(hash: string) {
    return this.db.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(hash).run()
  }

  deleteSessionsForUser(userId: number) {
    return this.db.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(userId).run()
  }

  async comments(slug: string, includeHidden: boolean) {
    const query = includeHidden
      ? `SELECT c.id,c.article_id,a.slug as article_slug,u.id as user_id,u.github_id,u.login,u.name,u.avatar_url,u.role,c.body,c.status,c.created_at FROM comments c JOIN articles a ON a.id=c.article_id JOIN users u ON u.id=c.user_id WHERE a.slug=? ORDER BY c.created_at DESC,c.id DESC`
      : `SELECT c.id,c.article_id,a.slug as article_slug,u.id as user_id,u.github_id,u.login,u.name,u.avatar_url,u.role,c.body,c.status,c.created_at FROM comments c JOIN articles a ON a.id=c.article_id JOIN users u ON u.id=c.user_id WHERE a.slug=? AND c.status='published' AND a.status='published' ORDER BY c.created_at DESC,c.id DESC`
    const rows = await this.db.prepare(query).bind(slug).all<CommentRow>()
    return rows.results.map(mapComment)
  }

  async allComments() {
    const rows = await this.db
      .prepare(
        `SELECT c.id,c.article_id,a.slug as article_slug,u.id as user_id,u.github_id,u.login,u.name,u.avatar_url,u.role,c.body,c.status,c.created_at FROM comments c JOIN articles a ON a.id=c.article_id JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC,c.id DESC`,
      )
      .all<CommentRow>()
    return rows.results.map(mapComment)
  }

  async addComment(slug: string, userId: number, body: string, user: User): Promise<Comment> {
    const article = await this.articleBySlug(slug)
    const createdAt = now()
    const result = await this.db.prepare(`INSERT INTO comments(article_id,user_id,body,status,created_at) VALUES(?,?,?,'published',?)`).bind(article.id, userId, body, createdAt).run()
    return { id: result.meta.last_row_id || 0, articleId: article.id, articleSlug: slug, user, body, status: "published", createdAt }
  }

  async setCommentStatus(id: number, status: string) {
    if (status !== "published" && status !== "hidden") fail(400, "无效状态")
    const result = await this.db.prepare(`UPDATE comments SET status=? WHERE id=?`).bind(status, id).run()
    if (!result.meta.changes) fail(404, "记录不存在")
  }

  async uploads() {
    const rows = await this.db
      .prepare(`SELECT id,name,stored_name,mime,size,url,storage,storage_name,created_at FROM uploads ORDER BY id DESC`)
      .all<UploadRow>()
    return rows.results.map(mapUpload)
  }

  async uploadByName(name: string) {
    const row = await this.db
      .prepare(`SELECT id,name,stored_name,mime,size,url,storage,storage_name,created_at FROM uploads WHERE stored_name=?`)
      .bind(name)
      .first<UploadRow>()
    return row ? mapUpload(row) : null
  }

  async uploadByHash(hash: string) {
    const row = await this.db
      .prepare(`SELECT id,name,stored_name,mime,size,url,storage,storage_name,created_at FROM uploads WHERE content_hash=? AND content_hash!=''`)
      .bind(hash)
      .first<UploadRow>()
    return row ? mapUpload(row) : null
  }

  async insertUpload(item: { name: string; storedName: string; mime: string; size: number; hash: string; url: string; storage: Upload["storage"]; storageName: string }) {
    const createdAt = now()
    const result = await this.db
      .prepare(`INSERT INTO uploads(name,stored_name,mime,size,content_hash,url,storage,storage_name,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
      .bind(item.name, item.storedName, item.mime, item.size, item.hash, item.url, item.storage, item.storageName, createdAt)
      .run()
    return mapUpload({
      id: result.meta.last_row_id || 0,
      name: item.name,
      stored_name: item.storedName,
      mime: item.mime,
      size: item.size,
      url: item.url,
      storage: item.storage,
      storage_name: item.storageName,
      created_at: createdAt,
    })
  }

  async deleteUpload(id: number) {
    const row = await this.db.prepare(`SELECT stored_name,storage FROM uploads WHERE id=?`).bind(id).first<{ stored_name: string; storage: string }>()
    if (!row) fail(404, "文件不存在")
    await this.db.prepare(`DELETE FROM uploads WHERE id=?`).bind(id).run()
    return row
  }

  async webdavConfig() {
    const [url, username, password, publicBase, storageName, target] = await Promise.all([
      this.settingValue("webdav_url"),
      this.settingValue("webdav_username"),
      this.settingValue("webdav_password"),
      this.settingValue("webdav_public_base"),
      this.settingValue("webdav_storage_name"),
      this.settingValue("upload_target"),
    ])
    return {
      url,
      username,
      password,
      publicBase,
      storageName: storageName || "WebDAV",
      target: target === "webdav" ? "webdav" : "local",
    }
  }

  async saveWebDAVConfig(cfg: { url: string; username: string; publicBase: string; storageName: string; target: string; password?: string }, updatePassword: boolean) {
    const values: [string, string][] = [
      ["webdav_url", cfg.url.trim()],
      ["webdav_username", cfg.username.trim()],
      ["webdav_public_base", cfg.publicBase.trim().replace(/\/+$/, "")],
      ["webdav_storage_name", cfg.storageName.trim()],
      ["upload_target", cfg.target.trim() || "local"],
    ]
    if (updatePassword) values.push(["webdav_password", (cfg.password || "").trim()])
    await this.db.batch(
      values.map(([key, value]) =>
        this.db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key, value),
      ),
    )
  }

  async adminCredentials() {
    return this.db.prepare(`SELECT username, password_hash as passwordHash FROM admin_accounts WHERE id=1`).first<{ username: string; passwordHash: string }>()
  }

  async setAdminCredentials(username: string, passwordHash: string) {
    const result = await this.db.prepare(`UPDATE admin_accounts SET username=?, password_hash=?, updated_at=? WHERE id=1`).bind(username, passwordHash, now()).run()
    if (!result.meta.changes) fail(500, "管理员账号不存在")
  }

  async dump() {
    const tables = ["articles", "categories", "tags", "projects", "settings", "users", "sessions", "comments", "uploads", "admin_accounts"] as const
    const dump: Record<string, unknown[]> = {}
    for (const table of tables) {
      dump[table] = (await this.db.prepare(`SELECT * FROM ${table}`).all()).results
    }
    return dump
  }
}

export { PASSWORD_ADMIN_GITHUB_ID }

function mapArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    markdown: row.markdown,
    category: row.category,
    tags: readStrings(row.tags_json),
    status: row.status,
    date: row.date,
    readingMinutes: row.reading_minutes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapProject(row: ProjectRow): Project {
  let links: ProjectLink[] = []
  try {
    const parsed = JSON.parse(row.links_json || "[]")
    if (Array.isArray(parsed)) links = parsed
  } catch {
    links = []
  }
  const screenshots = readStrings(row.screenshots_json)
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    markdown: row.markdown,
    coverUrl: row.cover_url,
    logoUrl: row.logo_url,
    screenshots: screenshots.length || !row.cover_url ? screenshots : [row.cover_url],
    siteUrl: row.site_url,
    siteLabel: row.site_label,
    repoUrl: row.repo_url,
    repoLabel: row.repo_label,
    links,
    technologies: readStrings(row.technologies_json),
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    articleId: row.article_id,
    articleSlug: row.article_slug,
    user: { id: row.user_id, githubId: row.github_id, login: row.login, name: row.name, avatarUrl: row.avatar_url, role: row.role },
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
  }
}

type UploadRow = {
  id: number
  name: string
  stored_name: string
  mime: string
  size: number
  url?: string
  storage?: string
  storage_name?: string
  created_at: string
}

function mapUpload(row: UploadRow): Upload {
  const storage = row.storage === "webdav" ? "webdav" : "local"
  return {
    id: row.id,
    name: row.name,
    storedName: row.stored_name,
    url: row.url || `/api/uploads/${row.stored_name}`,
    mime: row.mime,
    size: row.size,
    storage,
    storageName: row.storage_name || (storage === "webdav" ? "WebDAV" : "本地"),
    createdAt: row.created_at,
  }
}

function runeLen(value: string) {
  return [...value].length
}
