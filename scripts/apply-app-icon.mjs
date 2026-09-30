/**
 * 생성한 앱 아이콘 JPEG를 1024×1024 RGB PNG로 맞추고 assets/logo.png 로 저장합니다.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = process.argv[2]
const dest = join(root, 'assets', 'logo.png')

if (!src) {
  throw new Error('usage: node scripts/apply-app-icon.mjs <source.jpg>')
}

await sharp(src)
  .resize(1024, 1024, { fit: 'cover', position: 'centre' })
  .removeAlpha()
  .flatten({ background: { r: 15, g: 118, b: 110 } })
  .png({ compressionLevel: 9, palette: false })
  .toFile(dest)

const meta = await sharp(dest).metadata()
console.log('wrote', dest, `${meta.width}x${meta.height}`, meta.format, 'channels', meta.channels)
