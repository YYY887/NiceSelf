import { fail } from "./util"

export type WebDAVConfig = {
  url: string
  username: string
  password: string
  publicBase: string
  storageName: string
  target: "local" | "webdav"
}

export function webdavReady(cfg: WebDAVConfig) {
  return Boolean(cfg.url.trim() && cfg.username.trim() && cfg.password.trim())
}

export function webdavLabel(cfg: WebDAVConfig) {
  return cfg.storageName.trim() || "WebDAV"
}

export function webdavObjectURL(cfg: WebDAVConfig, stored: string) {
  return `${cfg.url.replace(/\/+$/, "")}/${stored}`
}

export function webdavPublicURL(cfg: WebDAVConfig, stored: string) {
  const base = cfg.publicBase.replace(/\/+$/, "")
  return base ? `${base}/${stored}` : `/api/uploads/${stored}`
}

export function validWebDAVEndpoint(value: string) {
  if (!value) return true
  try {
    const url = new URL(value)
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.host) && !url.username
  } catch {
    return false
  }
}

function authHeader(cfg: WebDAVConfig) {
  return `Basic ${btoa(`${cfg.username}:${cfg.password}`)}`
}

async function webdavFetch(cfg: WebDAVConfig, method: string, url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    method,
    headers: {
      Authorization: authHeader(cfg),
      "User-Agent": "QianQiu-MySelf",
      ...(init?.headers || {}),
    },
  })
}

export async function webdavPut(cfg: WebDAVConfig, stored: string, contentType: string, data: Uint8Array) {
  const url = webdavObjectURL(cfg, stored)
  let response = await webdavFetch(cfg, "PUT", url, { headers: { "Content-Type": contentType }, body: data })
  if (response.status === 401) fail(502, "WebDAV 账号或密码错误")
  if (response.status === 404 || response.status === 409) {
    await webdavMkcol(cfg)
    response = await webdavFetch(cfg, "PUT", url, { headers: { "Content-Type": contentType }, body: data })
  }
  if (response.status < 200 || response.status >= 300) fail(502, `WebDAV 上传失败（${response.status}）`)
}

async function webdavMkcol(cfg: WebDAVConfig) {
  const response = await webdavFetch(cfg, "MKCOL", cfg.url.replace(/\/+$/, ""))
  if (response.status === 401) fail(502, "WebDAV 账号或密码错误")
}

export async function webdavDelete(cfg: WebDAVConfig, stored: string) {
  const response = await webdavFetch(cfg, "DELETE", webdavObjectURL(cfg, stored))
  if (response.status === 404) return
  if (response.status === 401) fail(502, "WebDAV 账号或密码错误")
  if (response.status < 200 || response.status >= 300) fail(502, `WebDAV 删除失败（${response.status}）`)
}

export async function webdavGet(cfg: WebDAVConfig, stored: string) {
  const response = await webdavFetch(cfg, "GET", webdavObjectURL(cfg, stored))
  if (response.status === 404) return null
  if (response.status === 401) fail(502, "WebDAV 账号或密码错误")
  if (!response.ok) fail(502, `WebDAV 读取失败（${response.status}）`)
  return response
}

export async function webdavProbe(cfg: WebDAVConfig) {
  const response = await webdavFetch(cfg, "PROPFIND", cfg.url.replace(/\/+$/, ""), { headers: { Depth: "0" } })
  if (response.status === 401) fail(502, "WebDAV 账号或密码错误")
  if (response.status === 405 || response.status === 404) {
    await webdavPut(cfg, ".qianqiu-webdav-check", "text/plain", new TextEncoder().encode("ok"))
    await webdavDelete(cfg, ".qianqiu-webdav-check")
    return
  }
  if (response.status < 200 || response.status >= 300) fail(502, `WebDAV 探测失败（${response.status}）`)
}
