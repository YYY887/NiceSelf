export type ArticleSection =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | {
      type: "code"
      code: string
      filename: string
      language: string
      highlightLines?: number[]
    }

export type Article = {
  slug: string
  category: "essays" | "notes" | "practice"
  title: string
  summary: string
  date: string
  readingMinutes: number
  sections: ArticleSection[]
}

export const articles: Article[] = [
  {
    slug: "why-a-personal-site",
    category: "essays",
    title: "为什么想做一个个人网站",
    summary: "给想法和作品留一个能慢慢生长的地方。",
    date: "2026-10-22",
    readingMinutes: 4,
    sections: [
      { type: "heading", text: "一个属于自己的空间" },
      {
        type: "paragraph",
        text: "社交平台适合分享当下，但一条内容很快就会被下一条推走。我想要一个更安静的地方，把学到的东西、做过的尝试和生活里的观察放在一起。",
      },
      {
        type: "paragraph",
        text: "个人网站的好处是可以自己决定顺序。一篇文章可以从问题写起，接着记录尝试、结果和后来改变的想法；一个项目也能把截图、代码和踩过的坑放在同一处。过一段时间再回头看，仍然能找到当时为什么那样做。",
      },
      { type: "heading", text: "从简单的版本开始" },
      {
        type: "paragraph",
        text: "这个网站不需要一开始就很完整。先写下一篇短文，放上一个小项目，再慢慢调整排版和交互。每一次更新，都会让它更像我自己。",
      },
      {
        type: "paragraph",
        text: "最开始我只需要几个清楚的入口：文章用来整理思路，项目用来展示做过的事，关于页说明我是谁。没有内容的功能先不加。这样每个页面都有明确用途，也不会为了填满版面写一些自己以后不会再读的文字。",
      },
      {
        type: "paragraph",
        text: "完成第一版之后，我会用自己的电脑和手机重新走一遍阅读流程：标题能不能看清、长段落会不会太挤、代码能不能方便地复制。这些小检查比一次性堆很多效果更能改善实际体验。",
      },
      { type: "heading", text: "让内容决定下一步" },
      {
        type: "paragraph",
        text: "如果你也正在搭建自己的空间，不妨先发布一个简单的版本。真实的内容会告诉你，下一步应该改哪里。",
      },
      {
        type: "paragraph",
        text: "也许写到第三篇笔记时，才发现需要分类；也许项目多起来以后，才需要筛选。先让内容长出来，再按实际需要整理结构，网站就会随着使用慢慢变得完整。",
      },
    ],
  },
  {
    slug: "remember-theme-with-localstorage",
    category: "notes",
    title: "用 localStorage 记住日夜主题",
    summary: "一个小小的偏好，也值得在下次访问时被保留。",
    date: "2026-10-22",
    readingMinutes: 5,
    sections: [
      { type: "heading", text: "为什么保存主题" },
      {
        type: "paragraph",
        text: "日夜主题切换不只是按钮状态。用户选过一次之后，下次打开页面时，网站应该尽量沿用这个选择。浏览器的 localStorage 可以完成这个纯前端需求。",
      },
      {
        type: "paragraph",
        text: "保存的值最好保持简单，例如只存 light 或 dark。读取时要检查值是否有效，不要把任意字符串直接当作主题使用；没有保存记录时，再决定使用默认主题还是系统偏好。",
      },
      { type: "heading", text: "读取和保存偏好" },
      {
        type: "paragraph",
        text: "下面把读取和写入分别放进函数里。切换按钮只负责调用 saveTheme，页面初始化时调用 readTheme，状态来源就比较清楚。",
      },
      {
        type: "code",
        filename: "theme.ts",
        language: "typescript",
        highlightLines: [4, 8],
        code: `type Theme = "light" | "dark"

export function readTheme(): Theme {
  return localStorage.getItem("theme") === "dark" ? "dark" : "light"
}

export function saveTheme(theme: Theme) {
  localStorage.setItem("theme", theme)
  document.documentElement.classList.toggle("dark", theme === "dark")
}`,
      },
      { type: "heading", text: "避免刷新时闪烁" },
      {
        type: "paragraph",
        text: "如果等 React 完成渲染后才设置 dark class，页面可能先以浅色出现，再跳到深色。初始化主题的代码可以尽量提前执行，并让初始界面与根元素上的 class 保持一致。样式越早确定，刷新时的变化就越不明显。",
      },
      { type: "heading", text: "让手动选择优先" },
      {
        type: "paragraph",
        text: "初始化时读取偏好，切换时写回存储并更新根元素的 class。若希望首次访问跟随系统主题，还可以结合 prefers-color-scheme；记得让用户的手动选择优先。",
      },
      {
        type: "paragraph",
        text: "可以按这个顺序判断：先看 localStorage 是否有用户选过的主题；没有时读取系统偏好；仍无法判断就使用站点默认值。这样系统主题变化不会覆盖用户已经明确做出的选择。",
      },
      { type: "heading", text: "多个标签页同步" },
      {
        type: "paragraph",
        text: "如果同一站点在两个标签页打开，在其中一个标签页修改 localStorage，另一个标签页会收到 storage 事件。监听这个事件后，可以把两个页面的主题保持一致。",
      },
      {
        type: "code",
        filename: "theme-sync.ts",
        language: "typescript",
        highlightLines: [2, 3],
        code: `window.addEventListener("storage", (event) => {
  if (event.key !== "theme") return
  document.documentElement.classList.toggle("dark", event.newValue === "dark")
})`,
      },
    ],
  },
]
