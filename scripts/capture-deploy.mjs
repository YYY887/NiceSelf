#!/usr/bin/env node
/**
 * 部署收尾脚本（一键部署 / GitHub 导入 与 本地 npm run deploy:cf 共用）。
 *
 * 作用：
 *   1. 回读刚部署的 Worker，得到它的 workers.dev 地址；
 *   2. 若 wrangler.toml 里的 PUBLIC_URL 还是占位值（空串或 __PUBLIC_URL__ 或别的 *.workers.dev），
 *      就写入真实地址，然后补一次部署，并把地址落到 .deploy-url.txt，供项目里的 Go 后端读取；
 *   3. 若 wrangler.toml 里的 database_id 还是占位值，则从 Cloudflare API 里找同名 D1 库并回填，
 *      让本地 `npm run dev:worker` / `wrangler d1` 也能直接用。
 *
 * 全部为尽力而为：任何一步失败都只打印提示，不中断构建流程。
 * 环境变量：
 *   CF_API_TOKEN      可选。覆盖 wrangler 的登录态（CI 或非交互环境用）
 *   CF_ACCOUNT_ID     可选。多账号时指定账号
 *   DEPLOY_SKIP_REDEPLOY=1  只回填配置，不触发第二次部署
 *   DEPLOY_SKIP_WRANGLER=1  完全不调用 wrangler（单测用）
 */

import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const configPath = resolve(root, "wrangler.toml")
const urlFile = resolve(root, ".deploy-url.txt")
const apiBase = process.env.CF_API_BASE || "https://api.cloudflare.com/client/v4"
const workerName = readWorkerName() || "qianqiu-myself"

function log(message) {
  console.log(`[deploy] ${message}`)
}

function readConfig() {
  return existsSync(configPath) ? readFileSync(configPath, "utf8") : ""
}

function readWorkerName() {
  const match = readConfig().match(/^\s*name\s*=\s*"([^"]+)"/m)
  return match ? match[1] : ""
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", ...options })
}

async function api(path) {
  const token = process.env.CF_API_TOKEN
  const headers = { "content-type": "application/json" }
  if (token) headers.authorization = `Bearer ${token}`
  const response = await fetch(`${apiBase}${path}`, { headers })
  if (!response.ok) return null
  const body = await response.json().catch(() => null)
  return body?.success ? body.result : null
}

async function accountId() {
  if (process.env.CF_ACCOUNT_ID) return process.env.CF_ACCOUNT_ID
  const cache = resolve(root, "node_modules/.cache/wrangler/wrangler-account.json")
  if (existsSync(cache)) {
    try {
      const parsed = JSON.parse(readFileSync(cache, "utf8"))
      if (parsed?.account?.id) return parsed.account.id
      if (parsed?.accounts?.[0]?.id) return parsed.accounts[0].id
    } catch {
      /* ignore */
    }
  }
  const accounts = await api("/accounts?per_page=1")
  if (Array.isArray(accounts) && accounts[0]?.id) return accounts[0].id
  return ""
}

async function workerURL(id) {
  if (!id) return ""
  const data = await api(`/accounts/${id}/workers/subdomain`)
  const subdomain = data?.subdomain
  if (!subdomain) return ""
  return `https://${workerName}.${subdomain}.workers.dev`
}

function patchConfig(patch) {
  const before = readConfig()
  if (!before) return false
  let after = before
  for (const [pattern, value] of patch) {
    after = after.replace(pattern, value)
  }
  if (after === before) return false
  writeFileSync(configPath, after)
  return true
}

async function main() {
  log(`Worker 名称：${workerName}`)
  const id = await accountId()
  const url = await workerURL(id)
  if (url) {
    log(`线上地址：${url}`)
    writeFileSync(urlFile, `${url}\n`)
  } else {
    log("暂时读不到 workers.dev 地址，跳过 PUBLIC_URL 回填（不影响部署结果）。")
  }

  const config = readConfig()
  const patch = []
  const publicURL = config.match(/^\s*PUBLIC_URL\s*=\s*"([^"]*)"/m)?.[1] ?? "__MISSING__"
  if (url && (publicURL === "" || publicURL === "__PUBLIC_URL__" || publicURL.endsWith(".workers.dev"))) {
    patch.push([/^\s*PUBLIC_URL\s*=\s*"[^"]*"/m, `PUBLIC_URL = "${url}"`])
  }

  const databaseId = config.match(/database_id\s*=\s*"([^"]*)"/)?.[1] ?? ""
  if (/^0{8}-/.test(databaseId) && id) {
    const databases = await api(`/accounts/${id}/d1/database?per_page=100`)
    const databaseName = config.match(/database_name\s*=\s*"([^"]*)"/)?.[1] || workerName
    const match = Array.isArray(databases) ? databases.find((item) => item?.name === databaseName) : null
    if (match?.uuid) patch.push([/database_id\s*=\s*"[^"]*"/, `database_id = "${match.uuid}"`])
  }

  if (patch.length && patchConfig(patch)) {
    log("已回填 wrangler.toml 中的 PUBLIC_URL / database_id。")
    if (url && process.env.DEPLOY_SKIP_REDEPLOY !== "1") {
      log("重新部署一次，让新的 PUBLIC_URL 生效。")
      const result = run("npx", ["wrangler", "deploy", "--config", "wrangler.toml"])
      if (result.status !== 0) log("第二次部署失败，请在 Cloudflare 控制台确认 PUBLIC_URL 变量。")
    }
  } else {
    log("wrangler.toml 已经是正确值，无需改动。")
  }

  log("完成。打开上面的线上地址即可，后台路径 /admin，初始账号 admin / qianqiu123。")
}

try {
  await main()
} catch (error) {
  console.log(`[deploy] 收尾步骤跳过：${error?.message || error}`)
}
