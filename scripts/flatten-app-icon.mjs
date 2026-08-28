/**
 * App Store 아이콘은 알파 채널이 있으면 거절됩니다. 불투명 RGB PNG로 맞춥니다.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconPath = join(
  __dirname,
  '..',
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
)

const bg = { r: 15, g: 118, b: 110 }

const png = PNG.sync.read(readFileSync(iconPath))
if (png.width !== 1024 || png.height !== 1024) {
  throw new Error(`아이콘 크기가 1024x1024가 아닙니다: ${png.width}x${png.height}`)
}

const out = new PNG({ width: 1024, height: 1024, colorType: 2, inputHasAlpha: false })
for (let i = 0; i < png.width * png.height; i++) {
  const src = i * 4
  const a = png.data[src + 3] / 255
  const dst = i * 3
  out.data[dst] = Math.round(png.data[src] * a + bg.r * (1 - a))
  out.data[dst + 1] = Math.round(png.data[src + 1] * a + bg.g * (1 - a))
  out.data[dst + 2] = Math.round(png.data[src + 2] * a + bg.b * (1 - a))
}

writeFileSync(iconPath, PNG.sync.write(out, { colorType: 2 }))
console.log('flattened App Store icon (no alpha):', iconPath)
