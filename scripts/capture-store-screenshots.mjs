/**
 * App Store Connect용 스크린샷 (정확한 픽셀).
 * 선행: npm run dev  (http://127.0.0.1:5173)
 *
 *   node scripts/capture-store-screenshots.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const baseUrl = process.env.STORE_SHOT_URL ?? 'http://127.0.0.1:5173'

const devices = [
  {
    name: 'iphone-6.9',
    width: 440,
    height: 956,
    deviceScaleFactor: 3,
    outDir: join(root, 'store/ios/screenshots/iphone-6.9'),
  },
  {
    name: 'ipad-13',
    width: 1032,
    height: 1376,
    deviceScaleFactor: 2,
    outDir: join(root, 'store/ios/screenshots/ipad-13'),
  },
]

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

async function shot(page, dir, file) {
  const buf = await page.screenshot({ type: 'png', animations: 'disabled' })
  writeFileSync(join(dir, file), buf)
  console.log('wrote', join(dir, file))
}

async function getFirstDocumentId(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('AmgiNote')
        req.onerror = () => resolve(null)
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('documents')) {
            resolve(null)
            return
          }
          const tx = db.transaction('documents', 'readonly')
          const store = tx.objectStore('documents')
          const getAll = store.getAll()
          getAll.onsuccess = () => resolve(getAll.result?.[0]?.id ?? null)
          getAll.onerror = () => resolve(null)
        }
      }),
  )
}

async function seedSample(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const sample = page.getByRole('button', { name: /샘플 PDF로 시작/ })
  if (await sample.isVisible().catch(() => false)) {
    await sample.click()
    await page.waitForURL(/\/review/, { timeout: 20000 })
    await wait(1200)
  }
}

async function captureDevice(browser, device) {
  mkdirSync(device.outDir, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: device.deviceScaleFactor,
    locale: 'ko-KR',
    colorScheme: 'light',
    hasTouch: true,
    isMobile: device.name.startsWith('iphone'),
  })
  const page = await context.newPage()
  await seedSample(page)

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await wait(600)
  await shot(page, device.outDir, '01-today.png')

  await page.goto(`${baseUrl}/review`, { waitUntil: 'networkidle' })
  await wait(1500)
  await shot(page, device.outDir, '02-review.png')

  await page.goto(`${baseUrl}/library`, { waitUntil: 'networkidle' })
  await wait(800)
  await shot(page, device.outDir, '03-library.png')

  const documentId = await getFirstDocumentId(page)
  if (documentId) {
    await page.goto(`${baseUrl}/read/${documentId}`, { waitUntil: 'networkidle' })
    await wait(1500)
    await shot(page, device.outDir, '04-reader.png')
  }

  await page.goto(`${baseUrl}/marks`, { waitUntil: 'networkidle' })
  await wait(600)
  const wordTab = page.getByRole('button', { name: '단어 가림' })
  if (await wordTab.isVisible().catch(() => false)) {
    await wordTab.click()
    await wait(800)
  }
  await shot(page, device.outDir, '05-marks.png')

  await context.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const device of devices) {
      console.log('capturing', device.name)
      await captureDevice(browser, device)
    }
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
