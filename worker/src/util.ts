import type { Context } from "hono"
import type { Env } from "./types"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function fail(status: number, message: string): never {
  throw new HttpError(status, message)
}

export function now() {
  return new Date().toISOString()
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function jsonText(value: unknown) {
  return JSON.stringify(value ?? [])
}

export function readStrings(raw: string | null | undefined): string[] {
  try {
    const items = JSON.parse(raw || "[]")
    return Array.isArray(items) ? items.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

export function cleanSlug(value: string) {
  return value.toLowerCase().replace(/^[-_ ]+|[-_ ]+$/g, "")
}

export function validSlug(value: string) {
  return value.length >= 2 && value.length <= 100 && /^[a-z0-9-]+$/.test(value)
}

export function validURL(value: string) {
  if (value === "" || (value.startsWith("/") && !value.startsWith("//"))) return true
  try {
    const url = new URL(value)
    return url.protocol === "https:" && Boolean(url.host)
  } catch {
    return false
  }
}

export function normalizeProjectURL(value: string) {
  const url = (value || "").trim()
  if (!url || url.startsWith("/") || /^[a-z][a-z\d+.-]*:\/\//i.test(url)) return url
  return /^[^\s/?#]+\.[^\s/?#]+(?:[/?#].*)?$/.test(url) ? `https://${url}` : url
}

export function validGitHubLogin(value: string) {
  return value.length >= 1 && value.length <= 39 && /^[A-Za-z0-9-]+$/.test(value)
}

export function validAdminUsername(value: string) {
  return value.length >= 2 && value.length <= 32 && /^[A-Za-z0-9_-]+$/.test(value)
}

export function slugify(value: string) {
  let previousDash = false
  let out = ""
  for (const char of value.toLowerCase()) {
    if ((char >= "a" && char <= "z") || (char >= "0" && char <= "9")) {
      out += char
      previousDash = false
    } else if (!previousDash) {
      out += "-"
      previousDash = true
    }
  }
  return cleanSlug(out)
}

export function isLoopbackHost(host: string) {
  if (host.toLowerCase() === "localhost") return true
  return host === "127.0.0.1" || host === "::1"
}

export function sameOrigin(origin: string | undefined, configured: string, requestHost: string) {
  if (!origin) return true
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  if (configured) {
    try {
      const expected = new URL(configured)
      if (url.protocol === expected.protocol && url.host === expected.host) return true
      if (isLoopbackHost(url.hostname) && isLoopbackHost(expected.hostname)) return true
    } catch {
      /* ignore */
    }
  }
  return url.host === requestHost && (url.protocol === "http:" || url.protocol === "https:")
}

export function publicURL(c: Context<{ Bindings: Env }>) {
  return (c.env.PUBLIC_URL || new URL(c.req.url).origin).replace(/\/$/, "")
}

export function sessionDays(c: Context<{ Bindings: Env }>) {
  const days = Number(c.env.SESSION_DAYS || 30)
  return days > 0 ? days : 30
}

export async function randomHex(bytes = 32) {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return [...buf].map((item) => item.toString(16).padStart(2, "0")).join("")
}

export async function sha256Hex(data: BufferSource | string) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("")
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await pbkdf2(password, salt)
  return `pbkdf2$sha256$100000$${toB64(salt)}$${toB64(new Uint8Array(key))}`
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$")
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") return false
  const salt = fromB64(parts[3])
  const expected = fromB64(parts[4])
  const actual = new Uint8Array(await pbkdf2(password, salt, Number(parts[2]) || 100000))
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i]
  return diff === 0
}

async function pbkdf2(password: string, salt: BufferSource, iterations = 100000) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256)
}

function toB64(bytes: Uint8Array) {
  let bin = ""
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin)
}

function fromB64(value: string) {
  const bin = atob(value)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export function mapError(error: unknown) {
  if (error instanceof HttpError) return error
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("UNIQUE constraint failed")) return new HttpError(409, "slug 已存在")
  return new HttpError(400, message || "请求无效")
}

export function runeCount(value: string) {
  return [...value].length
}

export function bytesEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i]
  return diff === 0
}
