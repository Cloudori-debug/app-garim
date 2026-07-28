import fs from 'node:fs'
import path from 'node:path'

/** capacitor-assets가 루트 icons/에 만든 PWA 아이콘을 public/icons로 옮긴다. */
const root = path.resolve(import.meta.dirname, '..')
const from = path.join(root, 'icons')
const to = path.join(root, 'public', 'icons')

if (!fs.existsSync(from)) {
  console.log('icons/ 없음 — 건너뜀')
  process.exit(0)
}

fs.mkdirSync(to, { recursive: true })
for (const name of fs.readdirSync(from)) {
  fs.renameSync(path.join(from, name), path.join(to, name))
}
fs.rmdirSync(from)
console.log('PWA icons → public/icons')
