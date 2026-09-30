/**
 * App Store 아이콘은 알파 채널이 있으면 거절됩니다. 불투명 RGB PNG로 맞춥니다.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconPath = join(
  __dirname,
  '..',
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
)

const meta = await sharp(iconPath).metadata()
if (meta.width !== 1024 || meta.height !== 1024) {
  throw new Error(`아이콘 크기가 1024x1024가 아닙니다: ${meta.width}x${meta.height}`)
}

const buf = await sharp(iconPath)
  .flatten({ background: { r: 15, g: 118, b: 110 } })
  .removeAlpha()
  .png({ compressionLevel: 9, palette: false })
  .toBuffer()

writeFileSync(iconPath, buf)
const out = await sharp(buf).metadata()
console.log(
  'flattened App Store icon (no alpha):',
  iconPath,
  `${out.width}x${out.height}`,
  'channels',
  out.channels,
)
