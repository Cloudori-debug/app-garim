# 스크린샷 (App Store Connect 업로드용)

Apple은 픽셀이 1px만 달라도 업로드를 거절합니다. 아래 폴더에 있는 PNG를 그대로 올리면 됩니다.

| 폴더 | 기기 세트 | 크기 |
|------|-----------|------|
| `iphone-6.9/` | 6.9인치 아이폰 (필수) | 1320 × 2868 |
| `ipad-13/` | 13인치 아이패드 (유니버설 앱 필수) | 2064 × 2752 |

권장 순서:

1. `01-today.png` — 오늘 복습 홈
2. `02-review.png` — 복습(가림)
3. `03-library.png` — 서재
4. `04-reader.png` — PDF 가림 편집
5. `05-marks.png` — 가림 허브

재생성:

```bash
npm i -D playwright pngjs
npx playwright install chromium
npm run dev
node scripts/flatten-app-icon.mjs
node scripts/capture-store-screenshots.mjs
```
