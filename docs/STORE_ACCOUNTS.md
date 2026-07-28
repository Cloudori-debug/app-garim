# 스토어 계정 연결 체크리스트

계정은 준비됐다는 전제. **Codemagic / App Store Connect / Play Console**에 앱을 한 번씩 연결하면 첫 빌드가 돌아갑니다.

## 공통

| 항목 | 값 |
|------|-----|
| 앱 이름 | 암기노트 |
| Bundle / Application ID | `com.clowood.amginote` |
| 개인정보처리방침 | https://app-garim.pages.dev/privacy.html |
| 지원 URL (임시) | https://app-garim.pages.dev |
| 문의 | clowood.cy@gmail.com |

---

## A. App Store Connect (아이패드/아이폰)

1. [App Store Connect](https://appstoreconnect.apple.com/) → **나의 앱** → **+** → 신규 앱  
   - 플랫폼: iOS  
   - 이름: 암기노트  
   - Bundle ID: `com.clowood.amginote` (없으면 Certificates, Identifiers & Profiles에서 먼저 등록)  
2. 앱 생성 후 **앱 정보 → Apple ID**(숫자)를 복사  
3. 저장소 `codemagic.yaml`의 `APP_STORE_APPLE_ID: REPLACE_WITH_ASC_APPLE_ID`를 그 숫자로 바꾼 뒤 커밋  
4. **암호화 수출 규정**: 앱은 HTTPS만 사용 → 보통 “표준 암호화만 사용” / Info.plist에 `ITSAppUsesNonExemptEncryption=false` 반영됨  

### App Store Connect API 키 (Codemagic용)

1. Users and Access → Integrations → **App Store Connect API** → 키 생성 (Access: Admin 또는 App Manager)  
2. `.p8` 파일 · Issuer ID · Key ID 보관  
3. [Codemagic](https://codemagic.io) → Team settings → Integrations → **Developer Portal**에 등록  
4. Integration 이름을 **`amginote`** 로 맞추기 (`codemagic.yaml`과 동일)

### Codemagic에서 첫 iOS 빌드

1. Codemagic → Add application → GitHub `Cloudori-debug/app-garim`  
2. Workflow: **iOS TestFlight**  
3. Code signing identity: App Store, bundle `com.clowood.amginote` (자동 서명 권장)  
4. Start build → 성공 시 TestFlight에 올라감  
5. 내부 테스터로 본인 Apple ID 추가 후 아이패드에서 설치

---

## B. Google Play Console (안드로이드)

1. [Play Console](https://play.google.com/console) → 앱 만들기  
   - 앱 이름: 암기노트  
   - 기본 언어: 한국어  
   - 앱/게임: 앱 · 무료  
2. 대시보드 필수 항목 채우기 (개인정보처리방침 URL 포함)  
3. **로컬에서 AAB 만들기** (이미 Windows에서 가능):

```bash
npm run cap:sync
cd android
.\gradlew.bat bundleRelease
```

산출물: `android/app/build/outputs/bundle/release/app-release.aab`

4. Play Console → 테스트 → 내부 테스트 → 새 버전 → AAB 업로드  
5. **서명 키**: 로컬 `android/app/amginote-release.keystore` + `android/keystore.properties`  
   - **Git에 올리지 말 것**  
   - 비밀번호 관리자에 백업 (분실 시 업데이트 불가)

### (선택) Codemagic → Play

1. Play Console 서비스 계정 JSON 생성 후 Codemagic에 업로드  
2. Codemagic Android keystore에 `amginote-release.keystore` 등록, 참조 이름 `amginote`  
3. `codemagic.yaml`의 `android-play-internal` publishing 주석 해제

---

## C. 지금 바로 확인할 순서 (추천)

1. Play: 내부 테스트에 AAB 1회 업로드 (Windows만으로 가능)  
2. ASC: Bundle ID + 앱 생성 + Apple ID 숫자를 yaml에 반영  
3. Codemagic: API 키 `amginote` 연결 후 iOS TestFlight 빌드  

막히는 단계(에러 문구·스크린)를 알려주시면 그다음을 이어서 잡습니다.
