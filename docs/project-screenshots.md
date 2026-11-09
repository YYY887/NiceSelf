# 项目图片约定

后台「项目」先展示列表，点击项目进入编辑页。右侧可上传或更换项目 Logo；正文下方可一次上传多张截图、移除截图和选择封面。上传图片保存在 `server/data/uploads/`，记录同步进入 SQLite 文件库，项目表保存图片 URL 列表。

公开的 `/projects` 是项目列表，每个项目在 `/projects/:slug` 展示自己的图片。横屏封面沿用 [`MacbookPro`](../src/components/ui/macbook-pro.tsx)；竖屏封面与其余竖屏截图放在同一网格行，使用 [`ScreenshotCapture`](../src/components/ui/screenshot-capture.tsx) 的手机相框。窄屏时图片逐行排列。旧项目只有封面地址时，后端会自动将封面作为图库第一张返回。

```tsx
import ScreenshotCapture from "@/components/ui/screenshot-capture"

<ScreenshotCapture src="/api/uploads/mobile.webp" alt="项目移动端首页截图" />
```

请上传真实项目截图，并给每张图写明项目和页面。`ScreenshotCapture` 的演示片段只提供了导入调用，没有组件源码；当前仓库提供了同名实现，会根据图片比例自动选择手机相框或普通图片展示。
