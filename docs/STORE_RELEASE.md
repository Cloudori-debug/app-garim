# 스토어 출시 경로 (네이티브)

암기노트는 **React 웹앱 + Capacitor**로 Android / iOS 스토어에 올립니다.  
본업이 Windows이므로 **기능 개발은 Windows Cursor**, **iOS 빌드·제출은 클라우드 Mac(또는 이후 Mac mini)** 분업이 기본입니다.

## 앱 식별

| 항목 | 값 |
|------|-----|
| 표시 이름 | 가림 암기노트 |
| App ID | `com.clowood.amginote` |
| 웹 (병행) | https://app-garim.pages.dev |
| 개인정보처리방침 | https://app-garim.pages.dev/privacy.html |

## Windows에서 하는 일

```bash
npm run dev          # 기능 개발
npm run cap:sync     # dist 빌드 후 android/ios 웹 자산 동기화
npm run cap:android  # Android Studio로 열기 (SDK 설치 필요)
npm run cap:assets   # assets/logo.svg → 아이콘·스플래시 재생성
```

Android 로컬 빌드:

1. Android Studio / SDK 설치
2. `android/local.properties`에 `sdk.dir=...` (Git 제외, 자동 생성해도 됨)
3. `cd android && .\gradlew.bat assembleDebug`

- `android/`, `ios/` 폴더는 Git에 포함합니다.
- **iOS Xcode 빌드·서명·App Store 업로드는 Windows에서 불가**합니다.

## iOS (클라우드 Mac → 검증 후 Mac mini)

1. Apple Developer Program 가입 (연 $99)
2. 저장소의 `codemagic.yaml`로 Codemagic 연결
3. App Store Connect API 키·코드서명·`APP_STORE_APPLE_ID` 설정
4. TestFlight 검증 후, 작업이 잦으면 **Mac mini** 구매 검토

## Android (Windows에서 바로 가능)

1. [Android Studio](https://developer.android.com/studio) 설치
2. `npm run cap:android` 또는 `assembleDebug`
3. 에뮬레이터 / USB 기기에서 실행
4. Play Console에 AAB 업로드 (개발자 등록 필요)

## 당분간 웹도 유지

- 스토어 심사·계정 준비 동안 **Cloudflare Pages 웹**으로 피드백 수집
- 스토어 안정화 후에도 웹은 데모·의견용으로 둘 수 있음

## 체크리스트 (첫 TestFlight / 내부 트랙)

- [x] 아이콘·스플래시 (`assets/logo.svg` + `npm run cap:assets`)
- [x] 개인정보처리방침 URL (`/privacy.html`) · 고객 지원 (`/support.html`)
- [x] Capacitor Android/iOS 프로젝트 + `codemagic.yaml`
- [x] 샘플 PDF로 심사·첫 실행 가능 (오늘 탭)
- [x] 네이티브: 서비스 워커 끔 · PWA 안내 숨김 · 백업 공유 시트
- [x] App Store 메타데이터·스크린샷 (`store/ios/`)
- [ ] Apple / Google 개발자 계정 (수동)
- [ ] 실기기에서 PDF·가림·복습 스모크 테스트
- [ ] (iOS) Codemagic 빌드 1회 성공 → TestFlight
- [ ] App Store Connect 리스팅 채운 뒤 심사 제출
- [ ] (Android) `bundleRelease` AAB → Play 내부 테스트
