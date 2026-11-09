package app

func initialArticles() []Article {
	return []Article{
		{Slug: "why-a-personal-site", Category: "essays", Title: "为什么想做一个个人网站", Summary: "给想法和作品留一个能慢慢生长的地方。", Date: "2026-10-22", ReadingMinutes: 4, Status: "published", Markdown: `## 一个属于自己的空间

社交平台适合分享当下，但一条内容很快就会被下一条推走。我想要一个更安静的地方，把学到的东西、做过的尝试和生活里的观察放在一起。

个人网站的好处是可以自己决定顺序。一篇文章可以从问题写起，接着记录尝试、结果和后来改变的想法；一个项目也能把截图、代码和踩过的坑放在同一处。过一段时间再回头看，仍然能找到当时为什么那样做。

## 从简单的版本开始

这个网站不需要一开始就很完整。先写下一篇短文，放上一个小项目，再慢慢调整排版和交互。每一次更新，都会让它更像我自己。

最开始我只需要几个清楚的入口：文章用来整理思路，项目用来展示做过的事，关于页说明我是谁。没有内容的功能先不加。这样每个页面都有明确用途，也不会为了填满版面写一些自己以后不会再读的文字。

完成第一版之后，我会用自己的电脑和手机重新走一遍阅读流程：标题能不能看清、长段落会不会太挤、代码能不能方便地复制。这些小检查比一次性堆很多效果更能改善实际体验。

## 让内容决定下一步

如果你也正在搭建自己的空间，不妨先发布一个简单的版本。真实的内容会告诉你，下一步应该改哪里。

也许写到第三篇笔记时，才发现需要分类；也许项目多起来以后，才需要筛选。先让内容长出来，再按实际需要整理结构，网站就会随着使用慢慢变得完整。`},
		{Slug: "remember-theme-with-localstorage", Category: "notes", Title: "用 localStorage 记住日夜主题", Summary: "一个小小的偏好，也值得在下次访问时被保留。", Date: "2026-10-22", ReadingMinutes: 5, Status: "published", Markdown: "## 为什么保存主题\n\n日夜主题切换不只是按钮状态。用户选过一次之后，下次打开页面时，网站应该尽量沿用这个选择。浏览器的 localStorage 可以完成这个纯前端需求。\n\n保存的值最好保持简单，例如只存 light 或 dark。读取时要检查值是否有效，不要把任意字符串直接当作主题使用；没有保存记录时，再决定使用默认主题还是系统偏好。\n\n## 读取和保存偏好\n\n下面把读取和写入分别放进函数里。切换按钮只负责调用 saveTheme，页面初始化时调用 readTheme，状态来源就比较清楚。\n\n```typescript\ntype Theme = \"light\" | \"dark\"\n\nexport function readTheme(): Theme {\n  return localStorage.getItem(\"theme\") === \"dark\" ? \"dark\" : \"light\"\n}\n\nexport function saveTheme(theme: Theme) {\n  localStorage.setItem(\"theme\", theme)\n  document.documentElement.classList.toggle(\"dark\", theme === \"dark\")\n}\n```\n\n## 避免刷新时闪烁\n\n如果等 React 完成渲染后才设置 dark class，页面可能先以浅色出现，再跳到深色。初始化主题的代码可以尽量提前执行，并让初始界面与根元素上的 class 保持一致。\n\n## 让手动选择优先\n\n初始化时读取偏好，切换时写回存储并更新根元素的 class。若希望首次访问跟随系统主题，还可以结合 prefers-color-scheme；记得让用户的手动选择优先。\n\n## 多个标签页同步\n\n如果同一站点在两个标签页打开，在其中一个标签页修改 localStorage，另一个标签页会收到 storage 事件。\n\n```typescript\nwindow.addEventListener(\"storage\", (event) => {\n  if (event.key !== \"theme\") return\n  document.documentElement.classList.toggle(\"dark\", event.newValue === \"dark\")\n})\n```"},
	}
}
