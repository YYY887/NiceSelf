#!/usr/bin/env node
/**
 * 文件库纯逻辑自测的运行器。
 *
 * 为什么需要它：源码里用的是 `@/` 路径别名，Node 直接跑 .ts 不认识别名，
 * 仓库里又没有测试框架，所以这里把相关文件复制到临时目录、把别名换成相对路径再执行。
 * 运行：npm run test:lib
 */
import { spawnSync } from "node:child_process"
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const files = ["file-library.ts", "file-library.test.ts", "api.ts", "file-kind.ts"]
const aliases = [
  ['from "@/lib/api"', 'from "./api.ts"'],
  ['from "@/lib/file-library"', 'from "./file-library.ts"'],
  ['from "@/lib/file-kind"', 'from "./file-kind.ts"'],
]

const work = mkdtempSync(join(tmpdir(), "front-myself-lib-"))
try {
  for (const file of files) {
    const source = join(root, "src", "lib", file)
    let text = readFileSync(source, "utf8")
    for (const [from, to] of aliases) text = text.split(from).join(to)
    writeFileSync(join(work, file), text)
  }
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", join(work, "file-library.test.ts")], { stdio: "inherit" })
  process.exitCode = result.status ?? 1
} finally {
  rmSync(work, { recursive: true, force: true })
}
