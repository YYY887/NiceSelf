import type { Store } from "./store"
import { hashPassword, now } from "./util"

const articleWhy = `## 一个属于自己的空间

社交平台适合分享当下，但一条内容很快就会被下一条推走。我想要一个更安静的地方，把学到的东西、做过的尝试和生活里的观察放在一起。

个人网站的好处是可以自己决定顺序。一篇文章可以从问题写起，接着记录尝试、结果和后来改变的想法；一个项目也能把截图、代码和踩过的坑放在同一处。过一段时间再回头看，仍然能找到当时为什么那样做。

## 从简单的版本开始

这个网站不需要一开始就很完整。先写下一篇短文，放上一个小项目，再慢慢调整排版和交互。每一次更新，都会让它更像我自己。

最开始我只需要几个清楚的入口：文章用来整理思路，项目用来展示做过的事，关于页说明我是谁。没有内容的功能先不加。这样每个页面都有明确用途，也不会为了填满版面写一些自己以后不会再读的文字。

完成第一版之后，我会用自己的电脑和手机重新走一遍阅读流程：标题能不能看清、长段落会不会太挤、代码能不能方便地复制。这些小检查比一次性堆很多效果更能改善实际体验。

## 让内容决定下一步

如果你也正在搭建自己的空间，不妨先发布一个简单的版本。真实的内容会告诉你，下一步应该改哪里。

也许写到第三篇笔记时，才发现需要分类；也许项目多起来以后，才需要筛选。先让内容长出来，再按实际需要整理结构，网站就会随着使用慢慢变得完整。`

const articleTheme = `## 为什么保存主题

日夜主题切换不只是按钮状态。用户选过一次之后，下次打开页面时，网站应该尽量沿用这个选择。浏览器的 localStorage 可以完成这个纯前端需求。

保存的值最好保持简单，例如只存 light 或 dark。读取时要检查值是否有效，不要把任意字符串直接当作主题使用；没有保存记录时，再决定使用默认主题还是系统偏好。

## 读取和保存偏好

下面把读取和写入分别放进函数里。切换按钮只负责调用 saveTheme，页面初始化时调用 readTheme，状态来源就比较清楚。

\`\`\`typescript
type Theme = "light" | "dark"

export function readTheme(): Theme {
  return localStorage.getItem("theme") === "dark" ? "dark" : "light"
}

export function saveTheme(theme: Theme) {
  localStorage.setItem("theme", theme)
  document.documentElement.classList.toggle("dark", theme === "dark")
}
\`\`\`

## 避免刷新时闪烁

如果等 React 完成渲染后才设置 dark class，页面可能先以浅色出现，再跳到深色。初始化主题的代码可以尽量提前执行，并让初始界面与根元素上的 class 保持一致。

## 让手动选择优先

初始化时读取偏好，切换时写回存储并更新根元素的 class。若希望首次访问跟随系统主题，还可以结合 prefers-color-scheme；记得让用户的手动选择优先。

## 多个标签页同步

如果同一站点在两个标签页打开，在其中一个标签页修改 localStorage，另一个标签页会收到 storage 事件。

\`\`\`typescript
window.addEventListener("storage", (event) => {
  if (event.key !== "theme") return
  document.documentElement.classList.toggle("dark", event.newValue === "dark")
})
\`\`\``

export async function ensureSeed(store: Store) {
  await ensureUploadColumns(store)
  const settingsCount = await store.db.prepare(`SELECT count(*) as n FROM settings`).first<{ n: number }>()
  if (!settingsCount?.n) {
    await store.saveSettings({
      siteName: "QianQiu-MySelf",
      siteDescription: "写下思考，留下作品。让那些值得记住的瞬间，在这里慢慢生长。",
      aboutIntro: "你好，这里是 QianQiu-MySelf。我用这个空间记录思考、分享实践，也保存一路走来的变化。",
      githubUsername: "yyy887",
    })
  }
  const categoryCount = await store.db.prepare(`SELECT count(*) as n FROM categories`).first<{ n: number }>()
  if (!categoryCount?.n) {
    for (const item of [
      { slug: "essays", name: "随笔", description: "记录日常里值得停下来想一想的瞬间。" },
      { slug: "notes", name: "笔记", description: "把新的发现整理成清晰、可回看的文字。" },
      { slug: "practice", name: "实践", description: "分享从一个想法到一次尝试的过程。" },
    ]) {
      await store.saveCategory({ id: 0, ...item })
    }
  }
  const articleCount = await store.db.prepare(`SELECT count(*) as n FROM articles`).first<{ n: number }>()
  if (!articleCount?.n) {
    await store.saveArticle({
      id: 0,
      slug: "why-a-personal-site",
      category: "essays",
      title: "为什么想做一个个人网站",
      summary: "给想法和作品留一个能慢慢生长的地方。",
      date: "2026-10-22",
      readingMinutes: 4,
      status: "published",
      markdown: articleWhy,
      tags: [],
      sortOrder: 0,
      createdAt: "",
      updatedAt: "",
    })
    await store.saveArticle({
      id: 0,
      slug: "remember-theme-with-localstorage",
      category: "notes",
      title: "用 localStorage 记住日夜主题",
      summary: "一个小小的偏好，也值得在下次访问时被保留。",
      date: "2026-10-22",
      readingMinutes: 5,
      status: "published",
      markdown: articleTheme,
      tags: [],
      sortOrder: 0,
      createdAt: "",
      updatedAt: "",
    })
  }
  const projectCount = await store.db.prepare(`SELECT count(*) as n FROM projects`).first<{ n: number }>()
  if (!projectCount?.n) {
    await store.saveProject({
      id: 0,
      slug: "qianqiu-myself",
      title: "QianQiu-MySelf",
      summary: "一个用来写文章、整理项目和记录日常探索的个人空间。",
      markdown: "从首屏的点阵涟漪，到文章阅读页的侧边目录，都围绕轻松阅读来设计。\n\n博客支持章节目录、代码高亮和分类浏览，让文字和实践放在同一个地方。",
      coverUrl: "/projects/qianqiu-myself/home.png",
      logoUrl: "",
      screenshots: [],
      siteUrl: "/",
      siteLabel: "",
      repoUrl: "",
      repoLabel: "",
      links: [],
      technologies: ["React", "TypeScript", "Tailwind CSS", "shadcn/ui"],
      status: "published",
      sortOrder: 0,
      createdAt: "",
      updatedAt: "",
    })
  }
  const adminCount = await store.db.prepare(`SELECT count(*) as n FROM admin_accounts`).first<{ n: number }>()
  if (!adminCount?.n) {
    const stamp = now()
    await store.db
      .prepare(`INSERT INTO admin_accounts(id, username, password_hash, created_at, updated_at) VALUES(1, ?, ?, ?, ?)`)
      .bind("admin", await hashPassword("qianqiu123"), stamp, stamp)
      .run()
  }
  await store.db.prepare(`UPDATE users SET role='reader' WHERE github_id != -1`).run()
}

async function ensureUploadColumns(store: Store) {
  const cols = await store.db.prepare(`PRAGMA table_info(uploads)`).all<{ name: string }>()
  const names = new Set((cols.results || []).map((item) => item.name))
  for (const [name, definition] of [
    ["url", "TEXT NOT NULL DEFAULT ''"],
    ["storage", "TEXT NOT NULL DEFAULT 'local'"],
    ["storage_name", "TEXT NOT NULL DEFAULT ''"],
  ] as const) {
    if (!names.has(name)) await store.db.prepare(`ALTER TABLE uploads ADD COLUMN ${name} ${definition}`).run()
  }
}
