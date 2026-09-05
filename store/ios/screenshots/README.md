# 스크린샷 (App Store Connect 업로드용)

Apple은 픽셀이 1px만 달라도 업로드를 거절합니다. 아래 폴더에 있는 PNG를 그대로 올리면 됩니다.

| 폴더 | 기기 세트 | 크기 |
|------|-----------|------|
| `iphone-6.9/` | 6.9인치 아이폰 (필수) | 1320 × 2868 |
| `ipad-13/` | 13인치 아이패드 (유니버설 앱 필수) | 2064 × 2752 |

권장 순서 (App Store Connect에는 `listing/` 을 파일 번호 순으로 올립니다):

1. `01-today.png` — 카드를 다시 치지 마세요
2. `02-reader.png` — 요약 PDF 위에 상자만
3. `03-review.png` — 떠올린 뒤 탭하세요
4. `04-library.png` — 이미 가진 PDF를 그대로
5. `05-marks.png` — 계정 없이 이 기기에만

원본 캡처는 이 폴더, 캡션본은 `listing/` 입니다.

재생성:

```bash
npm i -D playwright pngjs
npx playwright install chromium
npm run dev
node scripts/flatten-app-icon.mjs
node scripts/capture-store-screenshots.mjs
node scripts/compose-store-captions.mjs
```
