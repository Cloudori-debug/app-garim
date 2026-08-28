# 애플 App Store 출시 (Mac 없이)

가림 암기노트 · Bundle ID `com.clowood.amginote` · Apple ID `6797558440`

## 지금 할 일 (순서)

### 1. Codemagic에 서명용 개인키 등록 (1회 · 필수)

이전에 `No matching profiles found` 가 난 이유는, 프로필을 미리 올려두지 않았기 때문입니다.  
아래 방식으로 **빌드 중에 Apple이 인증서·프로필을 만들게** 바꿨습니다.

**Windows PowerShell**에서:

```powershell
cd C:\Cursor\app_garim
openssl genrsa -out amginote-cert.key 2048
Get-Content amginote-cert.key
```

1. 출력된 `-----BEGIN PRIVATE KEY-----` ~ `END` **전체** 복사  
2. Codemagic → 왼쪽 **Environment variables** (또는 Teams → Personal → Global variables)  
3. 그룹 이름: **`ios_signing`** (yaml과 동일)  
4. 변수 추가:
   - Name: `CERTIFICATE_PRIVATE_KEY`
   - Value: 방금 복사한 PEM 전체
   - Secure: ON  
5. `amginote-cert.key` 는 **Git에 올리지 말고** 비밀번호 관리자에 백업

`openssl`이 없으면 Git for Windows의 openssl을 쓰거나, [Git Bash](https://git-scm.com/)에서 같은 명령을 실행하세요.

### 2. Codemagic 빌드 → TestFlight

1. Applications → `app-garim`  
2. **Start new build**  
3. Branch: `main`  
4. Workflow: **iOS TestFlight**  
5. 성공 메일 → App Store Connect → TestFlight에서 빌드 확인  
6. 내부 테스터에 본인 추가 → 아이패드에서 설치·스모크 테스트

### 3. App Store Connect 리스팅 채우기

앱 → **앱 스토어** 탭 → iOS 버전:

| 항목 | 넣을 내용 |
|------|-----------|
| 이름 | 가림 암기노트 |
| 부제 | PDF 가리고 오늘 복습 |
| 설명 | 아래「스토어 문구」복사 |
| 키워드 | 아래 키워드 |
| 지원 URL | https://app-garim.pages.dev/support.html |
| 마케팅 URL | (비워도 됨) |
| 개인정보 처리방침 | https://app-garim.pages.dev/privacy.html |
| 카테고리 | 교육 / 생산성 |
| 연령 | 4+ (광고·수집 없음) |
| 가격 | 무료 |

문구 원본은 `store/ios/metadata/ko/` 에도 있습니다.

**스크린샷 (필수)**  
`store/ios/screenshots/` PNG를 App Store Connect에 그대로 업로드합니다.

| 세트 | 크기 | 폴더 |
|------|------|------|
| 아이폰 6.9" | 1320 × 2868 | `store/ios/screenshots/iphone-6.9/` |
| 아이패드 13" | 2064 × 2752 | `store/ios/screenshots/ipad-13/` |

캡처 화면: 오늘 복습 · 복습 가림 · 서재 · PDF 가림 · 가림 허브

### 앱 개인정보(App Privacy) 질문

| 질문 | 답 |
|------|-----|
| 데이터 수집 | 아니요 |
| 추적(ATT) | 아니요 |
| 광고 식별자 | 사용 안 함 |
| 계정 | 없음 |

### 4. 심사 제출

1. TestFlight 빌드를 **이 버전용으로 선택**  
2. 수출 규정: 암호화 — **표준 암호화만 사용**(앱에 `ITSAppUsesNonExemptEncryption=false` 반영됨)  
3. 광고 ID: 사용 안 함  
4. **심사를 위해 제출**

심사 메모 예시:

```text
로그인 없음. 첫 화면 「오늘」에서 「샘플 PDF로 시작」을 누르면
가림 3개가 만들어지고 복습이 바로 시작됩니다.
또는 기기의 학습용 PDF를 서재에 넣은 뒤 가림을 그려도 됩니다.
계정·서버 전송 없음. 데이터는 기기에만 저장됩니다.
```

---

## 스토어 문구 (복사용)

### 부제 (30자 이내 권장)
PDF 가리고 오늘 복습

### 설명
```text
가림 암기노트는 이미 가진 요약·기출·이론 PDF를 그대로 두고, 상자로 가린 뒤 다시 물어보는 로컬 암기 앱입니다.

• PDF 서재 — 폴더로 정리
• 단어·페이지 가림 — 손가락으로 상자 그리기
• 오늘 복습 — 잊기 전에 다시 등장
• 통계·테마·JSON 백업
• 계정 없음 — 데이터는 이 기기에만 저장

공시·자격·수험 자료처럼 “카드를 다시 만들기 싫은” 학습에 맞춰져 있습니다.
```

### 키워드 (쉼표 구분, 100자 제한에 맞춤)
```text
암기,가림,PDF,복습,공시,수험,자격증,플래시카드,SRS,노트
```

### 홍보 텍스트 (170자, 선택)
```text
내 PDF를 가리고 외우고, 오늘 할 복습만 모아 드립니다. 카드 제작 없이 바로 시작하세요.
```

---

## 막힐 때

| 증상 | 조치 |
|------|------|
| `CERTIFICATE_PRIVATE_KEY` 없음 | 1번 환경변수 그룹 `ios_signing` 확인 |
| API 키 인증 실패 | Integrations 키 이름이 정확히 `amginote`인지 |
| Distribution 인증서 한도 | developer.apple.com에서 오래된 Distribution 인증서 삭제 후 재빌드 |
| TestFlight 처리 중 오래 걸림 | 빌드 처리에 수분~수십 분 소요 정상 |
| post-processing failed · Beta App Information | https://appstoreconnect.apple.com/apps/6797558440/testflight/test-info 에서 Feedback Email·심사 연락처 입력 |

성공/실패 로그 일부를 보내 주시면 다음 조치를 이어서 잡습니다.
