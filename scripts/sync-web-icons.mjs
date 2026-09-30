/**
 * 웹 파비콘 PNG와 Android adaptive-icon inset을 로고에 맞춥니다.
 * (노트 그림에 이미 여백이 있어서 capacitor-assets 기본 16.7% inset을 제거합니다.)
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const logo = join(root, 'assets', 'logo.png')

async function writePng(size, dest) {
  await sharp(logo)
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: { r: 15, g: 118, b: 110 } })
    .removeAlpha()
    .png({ compressionLevel: 9, palette: false })
    .toFile(dest)
  console.log('web icon', dest)
}

await writePng(512, join(root, 'public', 'icon-512.png'))
await writePng(192, join(root, 'public', 'icon-192.png'))
await writePng(180, join(root, 'public', 'apple-touch-icon.png'))

const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`
const anydpi = join(root, 'android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26')
writeFileSync(join(anydpi, 'ic_launcher.xml'), adaptive)
writeFileSync(join(anydpi, 'ic_launcher_round.xml'), adaptive)
console.log('android adaptive-icon inset removed')
