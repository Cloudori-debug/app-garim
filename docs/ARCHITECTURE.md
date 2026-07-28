# 암기노트 — 아키텍처 (ARCHITECTURE)

> SSOT 문서 3종 중 하나. 폴더 규칙·데이터 모델·금지사항.

## 폴더 구조

```text
src/
  app/                # router, shell, theme
  features/
    today/            # 오늘 due
    library/          # 서재
    reader/           # PDF·Mark
    review/           # 복습 세션
    more/             # 테마·정보
    favorites/
  entities/
    folder/ document/ mark/ review/ app-state/ backup/
  shared/
```

## 의존 규칙

```text
app → features → entities → shared
```

금지:

- feature ↔ feature 순환 import
- 컴포넌트에서 Dexie 직접 호출 (repository 경유)
- Mark에 SRS 필드 추가 (ReviewState 사용)
- 전역 상태 라이브러리

## 기술 스택

| 계층 | 선택 |
|------|------|
| UI | React 19 + TypeScript + Vite |
| 스타일 | Tailwind 4 + CSS 변수 테마 |
| PDF | react-pdf (`renderTextLayer=false`) |
| DB | Dexie `AmgiNote` **version 2** |
| 라우팅 | React Router |
| 네이티브 | Capacitor 8 (`android/` · `ios/`) · App ID `com.clowood.amginote` |

웹 자산은 `npm run build` → `npx cap sync`로 네이티브 프로젝트에 복사한다.  
스토어 절차는 `docs/STORE_RELEASE.md`.

## 데이터 모델 (v1.1)

```text
Folder / Document / PdfBlob / Mark / AppState   (v1과 동일)
ReviewState {
  id(=markId), markId, documentId,
  interval, ease, repetitions, lapses,
  dueAt, lastReviewedAt, createdAt, updatedAt
}
```

## 라우트

| path | 화면 |
|------|------|
| `/` | Today |
| `/library` | Library |
| `/marks` | 가림 허브 (페이지 즐겨찾기 · 전체 가림) |
| `/more` | More (테마) |
| `/read/:documentId` | Reader |
| `/review` | Review session |

## 데이터 모델 추가 (v1.1+)

```text
PageFavorite { id, documentId, page, createdAt }
```

## 테마

`html[data-theme]` + `localStorage['amgi-theme']`  
토큰: `src/shared/styles/themes.css`
