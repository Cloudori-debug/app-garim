# app_garim (암기노트)

내 PDF에 가리고 외우고, **오늘 복습**으로 잊기 전에 다시 물어보는 로컬 웹 앱.

프로젝트 폴더/패키지 이름: `app_garim` · 제품명: 암기노트


## 실행 방법 (가장 쉬움)

1. **Node.js LTS**가 설치되어 있어야 합니다.  
   → [https://nodejs.org](https://nodejs.org) 에서 설치
2. 프로젝트 폴더에서 **`실행.bat`** 을 더블클릭합니다.
3. 검은 창이 뜨고, 잠시 후 브라우저가 자동으로 열립니다.  
   (주소: `http://127.0.0.1:5173`)
4. 끝낼 때는 검은 창을 선택한 뒤 **Ctrl+C** 로 종료합니다.

| 파일 | 용도 |
|------|------|
| `실행.bat` | 평소 실행 (개발 서버) |
| `실행(오프라인).bat` | 빌드 후 오프라인 미리보기 |

> 진짜 Windows `.exe` 설치 프로그램은 아직 없습니다.  
> 지금은 **더블클릭용 `실행.bat`** 이 실행 파일 역할을 합니다.

## 터미널로 실행

```bash
npm install
npm run dev
```

빌드:

```bash
npm run build
npm run preview
```

## 문서 (SSOT)

| 파일 | 내용 |
|------|------|
| [docs/PRODUCT.md](./docs/PRODUCT.md) | 제품 정의 · In/Out |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 폴더 · 데이터 · 라우트 |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | 버전 계획 |

디자인·기획 참고: `docs/DESIGN_UX.md`, `docs/PRODUCT_CONCEPT.md`, `docs/wireframes/`

## v1.1 루프

```text
오늘 → 복습 시작 → 탭 공개 → 틀림/알았다
서재 → PDF → 편집(가림) → 학습
더보기 → 색 테마
```

## 스택

React · TypeScript · Vite · Tailwind · Dexie · react-pdf · React Router
