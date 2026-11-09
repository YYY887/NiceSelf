// 文件库纯逻辑自测：用例覆盖引用扫描、分类归属与复制片段。
// 运行：node --experimental-strip-types src/lib/file-library.test.ts
import assert from "node:assert/strict"

import type { SiteContent, UploadRecord } from "@/lib/api"
import { byteTotal, collectFileUsage, inGroup, kindLabel, sizeLabel, snippetFor, usageDetail, usedByLabel } from "@/lib/file-library"
import { fileKind } from "@/lib/file-kind"

const content = {
  articles: [
    { slug: "a1", title: "第一篇文章", markdown: "正文\n\n![图](/api/uploads/9423ae1030c3128bf0a9c73d.jpg)\n\n[下载](https://bilibili88.com/file/729ef4c0abb9ed32f9ca7546.mp4)" },
    { slug: "a2", title: "第二篇", markdown: "又用了一次 /api/uploads/9423ae1030c3128bf0a9c73d.jpg" },
  ],
  projects: [
    { slug: "p1", title: "示例项目", coverUrl: "/api/uploads/9423ae1030c3128bf0a9c73d.jpg", logoUrl: "", screenshots: ["/api/uploads/988f928488baf6e802c62aa5.webp"], videos: [] },
  ],
  categories: [],
  tags: [],
  settings: { siteName: "s", siteDescription: "", aboutIntro: "", githubUsername: "" },
} as unknown as SiteContent

const usage = collectFileUsage(content)
const articleImage = usage.get("/api/uploads/9423ae1030c3128bf0a9c73d.jpg")
if (!articleImage) throw new Error("文章与项目共用的图片应被扫到")
assert.equal(articleImage.articles.length, 2)
assert.deepEqual(articleImage.articles.map((item) => item.slug), ["a1", "a2"])
assert.equal(articleImage.projects.length, 1)
assert.equal(usedByLabel(articleImage), "2 篇文章、1 个项目")
assert.match(usageDetail(articleImage), /第一篇文章/)
assert.match(usageDetail(articleImage), /示例项目/)

const webdavVideo = usage.get("https://bilibili88.com/file/729ef4c0abb9ed32f9ca7546.mp4")
if (!webdavVideo) throw new Error("外链形式的 WebDAV 文件也应被扫到")
assert.equal(usedByLabel(webdavVideo), "1 篇文章")

const screenshot = usage.get("/api/uploads/988f928488baf6e802c62aa5.webp")
assert.equal(usedByLabel(screenshot), "1 个项目")
assert.equal(usage.get("/api/uploads/never-used.jpg"), undefined)

assert.equal(inGroup(fileKind("a.png", "image/png"), "image"), true)
assert.equal(inGroup(fileKind("a.png", "image/png"), "other"), false)
assert.equal(inGroup(fileKind("v.mp4", "video/mp4"), "media"), true)
assert.equal(inGroup(fileKind("a.mp3", "audio/mpeg"), "media"), true)
assert.equal(inGroup(fileKind("报告.docx", ""), "document"), true)
assert.equal(inGroup(fileKind("表.xlsx", ""), "document"), true)
assert.equal(inGroup(fileKind("a.pdf", "application/pdf"), "document"), true)
assert.equal(inGroup(fileKind("包.zip", "application/zip"), "other"), true)
assert.equal(inGroup(fileKind("脚本.js", ""), "other"), true)
assert.equal(inGroup(fileKind("任意.bin", ""), "all"), true)
assert.equal(kindLabel("a.webp", "image/webp"), "图片")
assert.equal(kindLabel("报告.docx", ""), "文档")

const image = { url: "/api/uploads/x.jpg", name: "截图 1.png", storedName: "abc.png", mime: "image/png" } as UploadRecord
const href = "https://qianqiu.dev/api/uploads/x.jpg"
assert.equal(snippetFor(image, "url", href, 1200), href)
assert.equal(snippetFor(image, "markdown", href, 1200), `![截图 1.png](${href})`)
assert.equal(snippetFor(image, "html", href, 1200), `<img src="${href}" alt="截图 1.png" width="1200" />`)
const doc = { url: "/api/uploads/y.docx", name: "实验报告.docx", storedName: "d.docx", mime: "" } as UploadRecord
assert.equal(snippetFor(doc, "markdown", href, 0), `[实验报告.docx](${href})`)
assert.equal(snippetFor(doc, "html", href, 0), `<a href="${href}">实验报告.docx</a>`)
const bracket = { url: "/api/uploads/z.png", name: "图[1].png", storedName: "z.png", mime: "image/png" } as UploadRecord
assert.equal(snippetFor(bracket, "markdown", href, 0), `![图1.png](${href})`)

assert.equal(sizeLabel(900), "900 B")
assert.equal(sizeLabel(2048), "2 KB")
assert.equal(sizeLabel(5 * 1024 * 1024), "5.0 MB")
assert.equal(byteTotal(1536), "2 KB")
assert.equal(byteTotal(3 * 1024 * 1024), "3.0 MB")
assert.equal(byteTotal(2 * 1024 * 1024 * 1024), "2.00 GB")

console.log("file-library 自测通过：引用扫描 / 分类归属 / 复制片段 / 体积格式")
