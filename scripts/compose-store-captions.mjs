/**
 * 기존 화면 캡처 위에 스토어용 캡션을 얹습니다.
 * 선행: store/ios/screenshots/{iphone-6.9,ipad-13}/*.png
 *
 *   node scripts/compose-store-captions.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const frames = [
  {
    src: '01-today.png',
    out: '01-today.png',
    title: '가진 PDF로 바로 외우세요',
    sub: '오늘 복습할 가림만 모입니다',
  },
  {
    src: '04-reader.png',
    out: '02-reader.png',
    title: '요약 PDF 위에 상자만',
    sub: '외울 곳만 가리고 바로 시작합니다',
  },
  {
    src: '02-review.png',
    out: '03-review.png',
    title: '떠올린 뒤 탭하세요',
    sub: '알았다 · 틀림으로 다음 일정이 잡힙니다',
  },
  {
    src: '03-library.png',
    out: '04-library.png',
    title: '이미 가진 PDF를 그대로',
    sub: '서재에 넣고 과목만 나누면 됩니다',
  },
  {
    src: '05-marks.png',
    out: '05-marks.png',
    title: '계정 없이 이 기기에만',
    sub: '가림과 즐겨찾기를 한곳에서',
  },
]

const devices = [
  {
    name: 'iphone-6.9',
    width: 1320,
    height: 2868,
    captionH: 520,
    titleSize: 56,
    subSize: 28,
    srcDir: join(root, 'store/ios/screenshots/iphone-6.9'),
    outDir: join(root, 'store/ios/screenshots/listing/iphone-6.9'),
  },
  {
    name: 'iphone-6.5',
    width: 1284,
    height: 2778,
    captionH: 500,
    titleSize: 52,
    subSize: 26,
    srcDir: join(root, 'store/ios/screenshots/iphone-6.9'),
    outDir: join(root, 'store/ios/screenshots/listing/iphone-6.5'),
  },
  {
    name: 'ipad-13',
    width: 2064,
    height: 2752,
    captionH: 420,
    titleSize: 64,
    subSize: 32,
    srcDir: join(root, 'store/ios/screenshots/ipad-13'),
    outDir: join(root, 'store/ios/screenshots/listing/ipad-13'),
  },
]

function htmlFor(device, frame, dataUrl) {
  const shotH = device.height - device.captionH
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; width: ${device.width}px; height: ${device.height}px; overflow: hidden; }
    body {
      font-family: Pretendard, "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif;
      background: #f4f5f7;
      color: #1a1d21;
    }
    .cap {
      height: ${device.captionH}px;
      box-sizing: border-box;
      padding: ${device.name.startsWith('iphone') ? '72px 72px 40px' : '64px 88px 36px'};
      background: #ffffff;
      border-bottom: 3px solid #1a1d21;
    }
    .kicker {
      font-size: ${device.name.startsWith('iphone') ? 22 : 26}px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #0f766e;
      margin: 0 0 16px;
    }
    h1 {
      margin: 0;
      font-size: ${device.titleSize}px;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -0.03em;
    }
    p {
      margin: 14px 0 0;
      font-size: ${device.subSize}px;
      font-weight: 500;
      color: #6b7280;
      line-height: 1.4;
    }
    .shot {
      width: ${device.width}px;
      height: ${shotH}px;
      background: #e8eaed;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      overflow: hidden;
    }
    .shot img {
      width: ${device.width}px;
      height: ${shotH}px;
      object-fit: contain;
      object-position: center top;
      background: #e8eaed;
    }
  </style>
</head>
<body>
  <header class="cap">
    <p class="kicker">가림 암기노트</p>
    <h1>${frame.title}</h1>
    <p>${frame.sub}</p>
  </header>
  <div class="shot"><img alt="" src="${dataUrl}" /></div>
</body>
</html>`
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const device of devices) {
      mkdirSync(device.outDir, { recursive: true })
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      for (const frame of frames) {
        const src = join(device.srcDir, frame.src)
        const b64 = readFileSync(src).toString('base64')
        await page.setContent(htmlFor(device, frame, `data:image/png;base64,${b64}`), {
          waitUntil: 'load',
        })
        const buf = await page.screenshot({ type: 'png', animations: 'disabled' })
        const out = join(device.outDir, frame.out)
        writeFileSync(out, buf)
        console.log('wrote', out)
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
