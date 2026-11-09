import * as React from "react"
import { GitBranch, Globe, HardDrive, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { loadGitHubAuth, loadWebDAV, saveGitHubAuth, saveResource, saveWebDAV, testWebDAV, updateAdminAccount, type AuthUser, type GitHubAuthConfig, type SiteSettings, type WebDAVConfig } from "@/lib/api"

export function SiteSettingsEditor({ settings, user, refresh }: { settings: SiteSettings; user: AuthUser; refresh: () => Promise<void> }) {
  const [value, setValue] = React.useState(settings)
  const [message, setMessage] = React.useState("")
  const [username, setUsername] = React.useState(user.login)
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [accountMessage, setAccountMessage] = React.useState("")
  const [savingAccount, setSavingAccount] = React.useState(false)
  const [githubAuth, setGithubAuth] = React.useState<GitHubAuthConfig | null>(null)
  const [clientId, setClientId] = React.useState("")
  const [clientSecret, setClientSecret] = React.useState("")
  const [githubToken, setGithubToken] = React.useState("")
  const [githubMessage, setGithubMessage] = React.useState("")
  const [savingGithub, setSavingGithub] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [webdav, setWebdav] = React.useState<WebDAVConfig | null>(null)
  const [davUrl, setDavUrl] = React.useState("")
  const [davUser, setDavUser] = React.useState("")
  const [davPassword, setDavPassword] = React.useState("")
  const [davPublic, setDavPublic] = React.useState("")
  const [davName, setDavName] = React.useState("WebDAV")
  const [davTarget, setDavTarget] = React.useState<"local" | "webdav">("local")
  const [davMessage, setDavMessage] = React.useState("")
  const [savingDav, setSavingDav] = React.useState(false)
  const [testingDav, setTestingDav] = React.useState(false)

  React.useEffect(() => {
    loadGitHubAuth()
      .then((config) => {
        setGithubAuth(config)
        setClientId(config.clientId)
      })
      .catch((error) => setGithubMessage(error instanceof Error ? error.message : "无法读取 GitHub 登录配置"))
    loadWebDAV()
      .then((config) => {
        setWebdav(config)
        setDavUrl(config.url)
        setDavUser(config.username)
        setDavPublic(config.publicBase)
        setDavName(config.storageName || "WebDAV")
        setDavTarget(config.target)
      })
      .catch((error) => setDavMessage(error instanceof Error ? error.message : "无法读取 WebDAV 配置"))
  }, [])

  function update<K extends keyof SiteSettings>(key: K, next: SiteSettings[K]) { setValue((current) => ({ ...current, [key]: next })) }
  async function save() { try { await saveResource("settings", value); await refresh(); setMessage("设置已保存") } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败") } }
  async function saveAccount(event: React.FormEvent) {
    event.preventDefault()
    setSavingAccount(true)
    setAccountMessage("")
    try {
      const next = await updateAdminAccount({ username, currentPassword, newPassword: newPassword || undefined })
      setUsername(next.login)
      setCurrentPassword("")
      setNewPassword("")
      setAccountMessage(newPassword ? "账号和密码已更新，请使用新密码登录。" : "管理员账号已更新。")
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "修改失败")
    } finally {
      setSavingAccount(false)
    }
  }
  async function applyGitHub(event: React.FormEvent, clear = false) {
    event.preventDefault()
    setSavingGithub(true)
    setGithubMessage("")
    try {
      const next = await saveGitHubAuth(clear
        ? { clientId: "", clearSecret: true }
        : { clientId, clientSecret: clientSecret || undefined, githubToken: githubToken || undefined })
      setGithubAuth(next)
      setClientId(next.clientId)
      setClientSecret("")
      setGithubToken("")
      setGithubMessage(clear ? "已关闭 GitHub 登录。" : next.configured ? "GitHub 登录已启用，读者可以用 GitHub 评论。" : "已保存 Client ID，请继续填写 Client Secret。")
    } catch (error) {
      setGithubMessage(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSavingGithub(false)
    }
  }
  async function applyWebDAV(event: React.FormEvent) {
    event.preventDefault()
    setSavingDav(true)
    setDavMessage("")
    try {
      const next = await saveWebDAV({
        url: davUrl,
        username: davUser,
        password: davPassword || undefined,
        publicBase: davPublic,
        storageName: davName,
        target: davTarget,
      })
      setWebdav(next)
      setDavPassword("")
      setDavTarget(next.target)
      setDavMessage(next.target === "webdav" ? `新上传将保存到 ${next.storageName}，文件库记录公开链接。` : "新上传将保存在本地存储。")
    } catch (error) {
      setDavMessage(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSavingDav(false)
    }
  }
  async function runWebDAVTest() {
    setTestingDav(true)
    setDavMessage("")
    try {
      const result = await testWebDAV()
      setDavMessage(result.message)
    } catch (error) {
      setDavMessage(error instanceof Error ? error.message : "探测失败")
    } finally {
      setTestingDav(false)
    }
  }
  async function copyCallback() {
    if (!githubAuth?.callbackUrl) return
    try {
      await navigator.clipboard.writeText(githubAuth.callbackUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setGithubMessage("无法复制回调地址，请手动选择复制。")
    }
  }
  return <Tabs defaultValue="site" className="max-w-3xl gap-6">
    <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
      <TabsTrigger value="site"><Globe data-icon="inline-start" />站点</TabsTrigger>
      <TabsTrigger value="github"><GitBranch data-icon="inline-start" />GitHub</TabsTrigger>
      <TabsTrigger value="storage"><HardDrive data-icon="inline-start" />附件存储</TabsTrigger>
      <TabsTrigger value="account"><UserRound data-icon="inline-start" />管理员</TabsTrigger>
    </TabsList>
    <TabsContent value="site">
    <Card><CardHeader><CardTitle>站点与个人配置</CardTitle><CardDescription>公开页面读取这些设置；GitHub 公开数据由后端代理获取。</CardDescription></CardHeader><CardContent><FieldGroup>
      <Field><FieldLabel htmlFor="site-name">站点名称</FieldLabel><Input id="site-name" value={value.siteName} onChange={(event) => update("siteName", event.target.value)} /></Field>
      <Field><FieldLabel htmlFor="site-description">站点介绍</FieldLabel><Textarea id="site-description" value={value.siteDescription} onChange={(event) => update("siteDescription", event.target.value)} /></Field>
      <Field><FieldLabel htmlFor="about-intro">关于页介绍</FieldLabel><Textarea id="about-intro" rows={4} value={value.aboutIntro} onChange={(event) => update("aboutIntro", event.target.value)} /></Field>
      <Field><FieldLabel htmlFor="github-username">GitHub 用户名</FieldLabel><Input id="github-username" value={value.githubUsername} onChange={(event) => update("githubUsername", event.target.value)} /></Field>
      <Button className="self-start" onClick={save}>保存设置</Button>{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </FieldGroup></CardContent></Card>
    </TabsContent>
    <TabsContent value="github">
    <Card><CardHeader><CardTitle>GitHub 登录</CardTitle><CardDescription>用于文章评论。后台仍使用账号密码登录，不会把 GitHub 用户提升为管理员。</CardDescription></CardHeader><CardContent>
      <form onSubmit={(event) => applyGitHub(event)}><FieldGroup>
        <p className="text-sm text-muted-foreground">在 GitHub 打开 <a className="underline underline-offset-4" href="https://github.com/settings/developers" target="_blank" rel="noreferrer">Developer settings</a>，创建 OAuth App，Homepage URL 填站点地址，Authorization callback URL 填下面这个回调地址。</p>
        <Field>
          <FieldLabel htmlFor="github-callback">回调地址</FieldLabel>
          <div className="flex gap-2">
            <Input id="github-callback" readOnly value={githubAuth?.callbackUrl || ""} />
            <Button type="button" variant="outline" onClick={copyCallback} disabled={!githubAuth?.callbackUrl}>{copied ? "已复制" : "复制"}</Button>
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="github-client-id">Client ID</FieldLabel>
          <Input id="github-client-id" autoComplete="off" value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="Iv1. 或 Ov23 开头" />
        </Field>
        <Field>
          <FieldLabel htmlFor="github-client-secret">Client Secret</FieldLabel>
          <Input id="github-client-secret" type="password" autoComplete="new-password" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} placeholder={githubAuth?.hasSecret ? "已保存，留空则不修改" : "粘贴 GitHub 生成的 Secret"} />
          <FieldDescription>{githubAuth?.configured ? "当前已启用 GitHub 登录。" : "保存 Client ID 和 Secret 后，评论区会显示 GitHub 登录按钮。"}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="github-api-token">GitHub Token（可选）</FieldLabel>
          <Input id="github-api-token" type="password" autoComplete="new-password" value={githubToken} onChange={(event) => setGithubToken(event.target.value)} placeholder={githubAuth?.hasToken ? "已保存，留空则不修改" : "用于提高公开资料接口限额"} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={savingGithub}>{savingGithub ? "保存中…" : "保存 GitHub 登录"}</Button>
          <Button type="button" variant="outline" disabled={savingGithub || !githubAuth?.configured} onClick={(event) => applyGitHub(event, true)}>关闭登录</Button>
        </div>
        {githubMessage && <p role="status" className="text-sm text-muted-foreground">{githubMessage}</p>}
      </FieldGroup></form>
    </CardContent></Card>
    </TabsContent>
    <TabsContent value="storage">
    <Card><CardHeader><CardTitle>附件存储</CardTitle><CardDescription>默认保存在本地。配置 WebDAV 后，新上传可以传到网盘，文件库只保存原始文件名、存储名和公开链接。</CardDescription></CardHeader><CardContent>
      <form onSubmit={applyWebDAV}><FieldGroup>
        <Field>
          <FieldLabel>新文件保存位置</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={davTarget === "local" ? "default" : "outline"} onClick={() => setDavTarget("local")}>本地</Button>
            <Button type="button" size="sm" variant={davTarget === "webdav" ? "default" : "outline"} onClick={() => setDavTarget("webdav")}>WebDAV</Button>
          </div>
          <FieldDescription>{davTarget === "webdav" ? "上传时把文件 PUT 到 WebDAV，库里保存可访问链接。" : "上传保存在当前站点本地存储（开发环境磁盘 / 线上 R2）。"}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="webdav-name">存储名称</FieldLabel>
          <Input id="webdav-name" value={davName} onChange={(event) => setDavName(event.target.value)} placeholder="例如 坚果云、Nextcloud" />
        </Field>
        <Field>
          <FieldLabel htmlFor="webdav-url">WebDAV 地址</FieldLabel>
          <Input id="webdav-url" value={davUrl} onChange={(event) => setDavUrl(event.target.value)} placeholder="https://dav.example.com/dav/qianqiu" autoComplete="off" />
        </Field>
        <Field>
          <FieldLabel htmlFor="webdav-user">用户名</FieldLabel>
          <Input id="webdav-user" value={davUser} onChange={(event) => setDavUser(event.target.value)} autoComplete="off" />
        </Field>
        <Field>
          <FieldLabel htmlFor="webdav-password">密码</FieldLabel>
          <Input id="webdav-password" type="password" autoComplete="new-password" value={davPassword} onChange={(event) => setDavPassword(event.target.value)} placeholder={webdav?.hasPassword ? "已保存，留空则不修改" : "应用密码或网盘密码"} />
        </Field>
        <Field>
          <FieldLabel htmlFor="webdav-public">公开访问前缀（可选）</FieldLabel>
          <Input id="webdav-public" value={davPublic} onChange={(event) => setDavPublic(event.target.value)} placeholder="https://files.example.com/qianqiu" />
          <FieldDescription>有公开直链时填写。留空则仍通过本站 /api/uploads 代理读取 WebDAV 文件。</FieldDescription>
        </Field>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={savingDav}>{savingDav ? "保存中…" : "保存存储配置"}</Button>
          <Button type="button" variant="outline" disabled={testingDav || savingDav} onClick={runWebDAVTest}>{testingDav ? "探测中…" : "测试连接"}</Button>
        </div>
        {davMessage && <p role="status" className="text-sm text-muted-foreground">{davMessage}</p>}
      </FieldGroup></form>
    </CardContent></Card>
    </TabsContent>
    <TabsContent value="account">
    <Card><CardHeader><CardTitle>管理员账号</CardTitle><CardDescription>修改后台登录用户名和密码。修改密码后当前会话会刷新，请记住新密码。</CardDescription></CardHeader><CardContent>
      <form onSubmit={saveAccount}><FieldGroup>
        <Field><FieldLabel htmlFor="admin-account-username">用户名</FieldLabel><Input id="admin-account-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></Field>
        <Field><FieldLabel htmlFor="admin-current-password">当前密码</FieldLabel><Input id="admin-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
        <Field><FieldLabel htmlFor="admin-new-password">新密码</FieldLabel><Input id="admin-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="不修改请留空，至少 8 位" /></Field>
        <Button type="submit" className="self-start" disabled={savingAccount || !currentPassword}>{savingAccount ? "保存中…" : "保存账号"}</Button>
        {accountMessage && <p role="status" className="text-sm text-muted-foreground">{accountMessage}</p>}
      </FieldGroup></form>
    </CardContent></Card>
    </TabsContent>
  </Tabs>
}
