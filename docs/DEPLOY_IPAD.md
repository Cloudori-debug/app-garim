# 아이패드 우선 배포 (HTTPS)

암기노트는 **웹·PWA**입니다. 아이패드에서는 App Store 없이 Safari(또는 홈 화면 아이콘)로 씁니다.  
**HTTPS**가 필요합니다. (홈 화면 추가·서비스 워커)

## 1. 빌드

```bash
npm install
npm run build
```

결과물: `dist/` 폴더

## 2. 호스팅 (택 1)

### Cloudflare Pages (추천)

1. [Cloudflare Pages](https://pages.cloudflare.com/)에서 새 프로젝트
2. Git 연결 또는 `dist` 직접 업로드
3. 빌드 설정 (Git 연결 시)
   - Build command: `npm run build`
   - Output directory: `dist`
4. 배포 후 `https://….pages.dev` 주소를 아이패드 Safari로 엽니다.

`public/_redirects`가 SPA 경로(`/library` 등)를 처리합니다.

### Vercel

1. 저장소를 Vercel에 연결
2. Framework: Vite, Output: `dist`
3. `vercel.json` 리라이트가 SPA를 처리합니다.

### 로컬에서 아이패드만 시험 (같은 Wi‑Fi)

PC에서:

```bash
npm run build
npm run preview -- --host
```

터미널에 나온 `http://192.168.x.x:4173` 주소를 아이패드 Safari에 입력합니다.  
(홈 화면 추가·일부 PWA 기능은 **HTTPS**에서만 완전합니다.)

## 3. 아이패드에 “설치”

1. **Safari**로 HTTPS 주소를 엽니다.
2. **공유** → **홈 화면에 추가** → 추가
3. 홈 화면의 **암기노트** 아이콘으로 실행

앱 안 **더보기**에도 같은 안내가 있습니다.

## 4. 알아둘 점

| 항목 | 설명 |
|------|------|
| 데이터 | PDF·가림은 **그 아이패드 브라우저 저장소**에만 있음 |
| 백업 | 아직 내보내기 없음 (로드맵 v1.2) |
| 앱스토어 | 이번 단계 범위 밖 (나중에 Capacitor 등) |

## 성공 확인

- [ ] Safari에서 서재 → PDF 추가 → 단어/페이지 가림 → 오늘 복습
- [ ] 홈 화면 추가 후 전체 화면에 가깝게 실행
- [ ] 손가락으로 가림 드래그·탭 공개가 가능
