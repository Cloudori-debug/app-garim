# 아이패드 우선 배포 (고정 HTTPS)

암기노트 **웹·PWA** 배포 안내입니다. (스토어 네이티브는 `docs/STORE_RELEASE.md`)  
웹으로 아이패드에서 쓰려면 **항상 같은 `https://…` 주소**가 필요합니다.

**고정 주소:** https://app-garim.pages.dev


## 가장 쉬운 방법: Cloudflare Pages

### 1회 준비

1. [Cloudflare](https://dash.cloudflare.com/) 계정 만들기 (무료)
2. PC 터미널에서 로그인:

```bash
npx wrangler login
```

브라우저가 열리면 Cloudflare 허용.

### 2) 배포 (주소가 고정됨)

프로젝트 폴더에서:

```bash
npm run deploy
```

끝나면 터미널에 비슷한 주소가 나옵니다:

```text
https://app-garim.pages.dev
```

이 주소가 **고정**입니다. 아이패드 Safari에 북마크하거나 **홈 화면에 추가**하세요.  
코드를 고친 뒤에도 `npm run deploy`만 다시 하면 같은 주소가 갱신됩니다.

현재 운영 주소: **https://app-garim.pages.dev**


### Git으로 자동 배포 (선택)

1. GitHub에 저장소 올리기
2. Cloudflare Pages → Create → Git 연결
3. Build command: `npm run build` / Output: `dist`
4. 이후 `git push` 할 때마다 자동 배포

`public/_redirects` · `wrangler.toml` 이 이미 포함되어 있습니다.

---

## 다른 호스팅

### Vercel

저장소 연결 후 Framework: Vite, Output: `dist`  
`vercel.json` 리라이트가 SPA를 처리합니다.

### 로컬 시험만 (같은 Wi‑Fi)

```bash
npm run build
npm run preview -- --host
```

`http://192.168.x.x:4173` — **임시**이며 HTTPS가 아니라 홈 화면 추가가 불완전할 수 있습니다.

---

## 아이패드에 “설치”

1. **Safari**로 `https://….pages.dev` 를 엽니다.
2. **공유** → **홈 화면에 추가** → 추가
3. 홈 화면 **가림 암기노트** 아이콘으로 실행

앱 **더보기**에도 같은 안내가 있습니다.

## 알아둘 점

| 항목 | 설명 |
|------|------|
| 데이터 | PDF·가림은 **그 아이패드 브라우저**에만 저장 |
| 백업 | 더보기 → 내보내기 / 가져오기 |
| 한글 PDF | cMap 포함 — 일부 한글 교재 글자 깨짐 완화 |
| 앱스토어 | Capacitor 경로 — `docs/STORE_RELEASE.md` |

## 성공 확인

- [ ] 고정 HTTPS 주소로 서재 → PDF → 가림 → 오늘 복습
- [ ] 홈 화면 추가 후 실행
- [ ] 한글이 많은 PDF도 페이지가 보임
