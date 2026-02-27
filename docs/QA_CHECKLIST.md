# moldClaw QA 체크리스트 v0.7.5

## 공통 (모든 OS)

### 1. 앱 시작
- [ ] 앱 실행 시 이용약관 표시 (첫 실행)
- [ ] 이용약관 동의 후 온보딩 진행
- [ ] 온보딩 완료 후 대시보드 표시

### 2. 대시보드
- [ ] Gateway 시작/중지 버튼 동작
- [ ] 상태 표시 (Running/Stopped)
- [ ] 설정 버튼으로 설정 페이지 이동

### 3. 설정 - AI 모델
- [ ] 프로바이더 선택 (Anthropic, OpenAI 등)
- [ ] API 키 입력 및 저장
- [ ] 저장 후 설정 유지 확인

### 4. 설정 - 메신저
- [ ] 메신저 선택 (Telegram, Discord 등)
- [ ] 연결 설정 저장

### 5. 설정 - 스킬 (CLI 도구)

#### 5.1 스킬 설치
- [ ] Prerequisite 미설치 시 경고 표시
- [ ] Prerequisite 설치 버튼 동작
- [ ] 스킬 설치 버튼 클릭 → 로딩 스피너
- [ ] 설치 완료 후 상태 업데이트

#### 5.2 스킬 삭제 (v0.7.5 신규)
- [ ] "삭제" 버튼 표시 (설치된 스킬)
- [ ] 삭제 확인 모달 표시
- [ ] 삭제 중 로딩 스피너 + 버튼 비활성화
- [ ] 삭제 성공 → 설치 UI로 전환
- [ ] 삭제 실패 → 에러 메시지 + 수동 명령어 표시

#### 5.3 스킬 연결 해제 (SetupRequirement 있는 스킬만)
- [ ] "연결 해제" 버튼 표시 (노란색)
- [ ] 연결 해제 후 설정 필요 상태로 전환
- [ ] 바이너리는 유지됨 확인

### 6. 설정 - API 스킬
- [ ] API 키 입력 및 연결
- [ ] 연결 해제 동작

---

## Windows 전용

### 환경 확인
- [ ] Node.js 설치 확인 (winget 또는 수동)
- [ ] OpenClaw 설치 확인 (`npm install -g openclaw`)

### Prerequisite 설치
- [ ] Go 설치 (`winget install GoLang.Go`)
  - [ ] 터미널 창 열림
  - [ ] `--accept` 플래그로 자동 진행
  - [ ] 설치 후 앱 재시작 안내
- [ ] uv 설치 (PowerShell 스크립트)
  - [ ] 터미널 창 열림
  - [ ] 설치 완료 메시지

### 스킬 설치 테스트
| 스킬 | 방식 | 테스트 |
|------|------|--------|
| clawhub | npm | [ ] 설치 → [ ] 삭제 |
| nano-pdf | uv | [ ] 설치 → [ ] 삭제 |
| gifgrep | go | [ ] 설치 → [ ] 삭제 |
| 1password | winget | [ ] 설치 → [ ] 삭제 |

### 스킬 삭제 테스트 (상세)
- [ ] npm 스킬 삭제: `%APPDATA%\npm` 에서 제거 확인
- [ ] go 스킬 삭제: `%USERPROFILE%\go\bin\*.exe` 제거 확인
- [ ] uv 스킬 삭제: `%USERPROFILE%\.local\bin` 에서 제거 확인
- [ ] 권한 에러 시 수동 명령어 표시 확인

### 바이너리 감지
- [ ] 이미 설치된 바이너리 "설치됨" 표시
- [ ] 경로: `~/.local/bin`, `~/go/bin`, `%APPDATA%/npm`

---

## macOS 전용

### 환경 확인
- [ ] Homebrew 설치 확인
- [ ] Node.js 설치 확인 (`brew install node`)
- [ ] OpenClaw 설치 확인

### Prerequisite 설치
- [ ] Go 설치 (`brew install go`)
  - [ ] Terminal.app 열림
  - [ ] 설치 완료 메시지
- [ ] uv 설치 (curl 스크립트)
  - [ ] Terminal.app 열림
  - [ ] 설치 완료 메시지

### 스킬 설치 테스트
| 스킬 | 방식 | 테스트 |
|------|------|--------|
| clawhub | npm | [ ] 설치 → [ ] 삭제 |
| nano-pdf | uv | [ ] 설치 → [ ] 삭제 |
| gifgrep | go | [ ] 설치 → [ ] 삭제 |
| himalaya | brew | [ ] 설치 → [ ] 삭제 |
| session-logs | brew (jq + ripgrep) | [ ] 설치 → [ ] 삭제 (둘 다 삭제됨) |

### 스킬 삭제 테스트 (상세)
- [ ] brew 스킬 삭제: `NONINTERACTIVE=1` 자동 진행
- [ ] brew 여러 패키지: `jq ripgrep` 둘 다 삭제
- [ ] go 스킬 삭제: `~/go/bin/*` 제거 확인
- [ ] npm 스킬 삭제: 권한 에러 없이 삭제 (Homebrew npm)

### PATH 확인
- [ ] GUI 앱에서 `/opt/homebrew/bin` 인식
- [ ] `~/go/bin`, `~/.cargo/bin`, `~/.local/bin` 인식

---

## Linux 전용

### 환경 확인
- [ ] Node.js 설치 확인 (apt/dnf/brew)
- [ ] OpenClaw 설치 확인

### Prerequisite 설치
- [ ] Go 설치
  - [ ] 터미널 자동 감지 (gnome-terminal, konsole, xfce4-terminal, xterm)
  - [ ] 패키지 매니저 자동 감지 (apt, dnf, pacman, brew)
  - [ ] sudo 비밀번호 입력 필요
- [ ] uv 설치 (curl 스크립트)
  - [ ] 터미널 열림
  - [ ] 설치 완료 메시지

### 스킬 설치 테스트
| 스킬 | 방식 | 테스트 |
|------|------|--------|
| clawhub | npm | [ ] 설치 → [ ] 삭제 |
| nano-pdf | uv | [ ] 설치 → [ ] 삭제 |
| gifgrep | go | [ ] 설치 → [ ] 삭제 |

### 스킬 삭제 테스트 (상세)
- [ ] npm 스킬 삭제
  - [ ] prefix가 `/usr/local` → sudo 필요 → 수동 명령어 표시
  - [ ] prefix가 `~/.npm-global` → 자동 삭제
- [ ] go 스킬 삭제: `~/go/bin/*` 제거 확인
- [ ] uv 스킬 삭제: `~/.local/bin/*` 제거 확인

### PATH 확인
- [ ] GUI 앱에서 `/home/linuxbrew/.linuxbrew/bin` 인식
- [ ] `~/go/bin`, `~/.cargo/bin`, `~/.local/bin` 인식

### Linux 특이사항
- [ ] confirm()/alert() 대신 인라인 UI 사용
- [ ] 삭제 확인 모달 정상 표시

---

## 버그 리포트 템플릿

```
### 환경
- OS: Windows 11 / macOS 14 / Linux Mint 22
- moldClaw 버전: 0.7.5
- Node.js 버전:
- OpenClaw 버전:

### 재현 단계
1.
2.
3.

### 예상 동작

### 실제 동작

### 스크린샷/로그
```

---

## 테스트 완료 서명

| OS | 테스터 | 날짜 | 버전 | 결과 |
|----|--------|------|------|------|
| Windows | | | 0.7.5 | |
| macOS | | | 0.7.5 | |
| Linux | | | 0.7.5 | |
