# moldClaw Windows QA 체크리스트 v0.7.5

## 1. 환경 요구사항 확인

### 1.1 시스템 요구사항
- [ ] Windows 10 버전 1809 이상 또는 Windows 11
- [ ] WebView2 런타임 설치됨 (Edge 기반)
- [ ] winget 사용 가능 (`winget --version`)

### 1.2 Node.js 환경
- [ ] Node.js 18+ 설치됨
- [ ] npm 글로벌 경로 확인: `npm config get prefix`
  - `%APPDATA%\npm` → 권한 문제 없음
  - `C:\Program Files\nodejs` → 관리자 권한 필요 가능

### 1.3 OpenClaw 설치
- [ ] `npm install -g openclaw` 성공
- [ ] `openclaw --version` 동작

---

## 2. 앱 시작 및 초기 설정

### 2.1 첫 실행
- [ ] 이용약관 페이지 표시
- [ ] 동의 체크박스 클릭 가능
- [ ] "동의" 버튼 클릭 후 온보딩 진행
- [ ] localStorage에 `moldclaw_disclaimer_agreed_v1` 저장됨

### 2.2 온보딩
- [ ] AI 모델 선택 단계
- [ ] API 키 입력 단계
- [ ] 메신저 선택 단계
- [ ] 완료 후 대시보드 이동

### 2.3 재실행
- [ ] 이용약관 다시 안 뜸
- [ ] 바로 대시보드 또는 온보딩 상태로 복귀

---

## 3. Prerequisite (전제조건) 설치

### 3.1 Go 설치
```
경로: winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements
```
- [ ] "Go 설치" 버튼 클릭
- [ ] cmd 창 열림 (보이는 터미널)
- [ ] winget 자동 진행 (Y/N 프롬프트 없음)
- [ ] 설치 완료 메시지 표시
- [ ] "앱을 재시작해주세요" 안내
- [ ] 재시작 후 Go 감지됨
- [ ] 버전 표시: `go version`

### 3.2 uv 설치
```
경로: PowerShell irm https://astral.sh/uv/install.ps1 | iex
```
- [ ] "uv 설치" 버튼 클릭
- [ ] PowerShell 창 열림
- [ ] 설치 스크립트 자동 실행
- [ ] 설치 완료 메시지 표시
- [ ] 재시작 후 uv 감지됨
- [ ] 버전 표시: `uv --version`

### 3.3 Homebrew (Windows)
- [ ] Windows에서 brew 체크 건너뜀
- [ ] brew 관련 UI 표시 안 됨

---

## 4. 스킬 설치 테스트

### 4.1 npm 스킬 설치
**테스트 스킬**: `clawhub` (`npm install -g clawhub`)
- [ ] 설치 버튼 클릭
- [ ] 로딩 스피너 표시
- [ ] 백그라운드 실행 (CREATE_NO_WINDOW)
- [ ] 완료 후 "설치됨" 상태로 전환
- [ ] 바이너리 확인: `where clawhub` 또는 `%APPDATA%\npm\clawhub.cmd`

### 4.2 Go 스킬 설치
**테스트 스킬**: `gifgrep` (`go install github.com/steipete/gifgrep/cmd/gifgrep@latest`)
- [ ] Go prerequisite 설치됨 확인
- [ ] 설치 버튼 클릭
- [ ] 로딩 스피너 표시
- [ ] 백그라운드 실행
- [ ] 완료 후 "설치됨" 상태로 전환
- [ ] 바이너리 확인: `%USERPROFILE%\go\bin\gifgrep.exe`

### 4.3 uv 스킬 설치
**테스트 스킬**: `nano-pdf` (`uv tool install nano-pdf`)
- [ ] uv prerequisite 설치됨 확인
- [ ] 설치 버튼 클릭
- [ ] 로딩 스피너 표시
- [ ] 백그라운드 실행
- [ ] 완료 후 "설치됨" 상태로 전환
- [ ] 바이너리 확인: `%USERPROFILE%\.local\bin\nano-pdf.exe`

### 4.4 winget 스킬 설치
**테스트 스킬**: `1password` (`winget install AgileBits.1Password.CLI`)
- [ ] 설치 버튼 클릭
- [ ] 백그라운드 실행 (--accept 플래그 자동 추가)
- [ ] 완료 후 "설치됨" 상태로 전환
- [ ] 바이너리 확인: `where op`

---

## 5. 스킬 삭제 테스트

### 5.1 npm 스킬 삭제
**테스트 스킬**: `clawhub`
- [ ] "삭제" 버튼 표시됨
- [ ] 삭제 확인 모달 표시
- [ ] "삭제" 클릭 → 로딩 스피너
- [ ] 버튼 비활성화 (클릭 불가)
- [ ] 삭제 완료 → 설치 UI로 전환
- [ ] 바이너리 없음 확인: `where clawhub` 실패

**권한 에러 케이스** (npm prefix가 시스템 경로인 경우):
- [ ] 에러 메시지 표시
- [ ] 수동 명령어 표시: `sudo npm uninstall -g clawhub`

### 5.2 Go 스킬 삭제
**테스트 스킬**: `gifgrep`
- [ ] "삭제" 버튼 클릭
- [ ] 파일 직접 삭제: `%USERPROFILE%\go\bin\gifgrep.exe`
- [ ] 삭제 완료 → 설치 UI로 전환
- [ ] 바이너리 없음 확인

### 5.3 uv 스킬 삭제
**테스트 스킬**: `nano-pdf`
- [ ] "삭제" 버튼 클릭
- [ ] `uv tool uninstall nano-pdf` 실행
- [ ] 삭제 완료 → 설치 UI로 전환
- [ ] 바이너리 없음 확인

### 5.4 winget 스킬 삭제
**테스트 스킬**: `1password`
- [ ] "삭제" 버튼 클릭
- [ ] `winget uninstall AgileBits.1Password.CLI` 실행
- [ ] 삭제 완료 또는 에러 메시지

---

## 6. 바이너리 감지 테스트

### 6.1 PATH 기반 감지
- [ ] `where` 명령으로 감지되는 바이너리 → "설치됨"

### 6.2 일반 경로 직접 확인
| 경로 | 용도 | 확인 |
|------|------|------|
| `%USERPROFILE%\.local\bin\` | uv tools | [ ] |
| `%USERPROFILE%\go\bin\` | go install | [ ] |
| `%USERPROFILE%\.cargo\bin\` | cargo | [ ] |
| `%APPDATA%\npm\` | npm global | [ ] |

### 6.3 이미 설치된 바이너리
- [ ] 외부에서 설치한 바이너리도 "설치됨" 표시
- [ ] moldClaw 통하지 않고 설치해도 감지됨

---

## 7. UI/UX 테스트

### 7.1 로딩 상태
- [ ] 설치 중: 버튼에 스피너 + "설치 중..." 텍스트
- [ ] 삭제 중: 버튼에 스피너 + "삭제 중..." 텍스트
- [ ] 작업 중 버튼 클릭 불가 (disabled)

### 7.2 상태 배지
- [ ] 미설치: 설치 버튼 표시
- [ ] 설치됨 + SetupRequirement::None: "삭제" 버튼만
- [ ] 설치됨 + 설정 필요: "연결 해제" + "삭제" 버튼

### 7.3 에러 표시
- [ ] 설치 실패: 빨간색 에러 메시지
- [ ] 삭제 실패: 에러 + 수동 명령어 코드 블록

---

## 8. 특수 케이스

### 8.1 여러 패키지 설치 스킬
**테스트 스킬**: `session-logs` (Windows: `winget install jqlang.jq && winget install BurntSushi.ripgrep.MSVC`)
- [ ] 첫 번째 패키지(jq)만 삭제됨
- [ ] binary_name이 jq이므로 "미설치" 상태로 전환

### 8.2 앱 삭제 옵션 (Settings > General)
- [ ] "moldClaw만 삭제" → ~/.openclaw 유지
- [ ] "전부 삭제" → OpenClaw npm 패키지 + ~/.openclaw 삭제

---

## 9. 확인 명령어 모음

```powershell
# Node.js 환경
node --version
npm --version
npm config get prefix

# Prerequisite
go version
uv --version
winget --version

# 바이너리 위치 확인
where clawhub
where gifgrep
where nano-pdf
where op

# 경로 직접 확인
dir %USERPROFILE%\.local\bin
dir %USERPROFILE%\go\bin
dir %APPDATA%\npm
```

---

## 테스트 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| Prerequisite 설치 | | |
| npm 스킬 설치/삭제 | | |
| Go 스킬 설치/삭제 | | |
| uv 스킬 설치/삭제 | | |
| winget 스킬 설치/삭제 | | |
| 바이너리 감지 | | |
| UI 로딩 상태 | | |

**테스터**: ________________
**날짜**: ________________
**버전**: 0.7.5
