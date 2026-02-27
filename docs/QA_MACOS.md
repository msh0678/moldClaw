# moldClaw macOS QA 체크리스트 v0.7.5

## 1. 환경 요구사항 확인

### 1.1 시스템 요구사항
- [ ] macOS 11 (Big Sur) 이상
- [ ] Apple Silicon (M1/M2/M3) 또는 Intel Mac

### 1.2 Homebrew 환경
- [ ] Homebrew 설치됨: `brew --version`
- [ ] Homebrew 경로 확인:
  - Apple Silicon: `/opt/homebrew/bin/brew`
  - Intel Mac: `/usr/local/bin/brew`

### 1.3 Node.js 환경
- [ ] Node.js 18+ 설치됨: `node --version`
- [ ] npm 경로 확인: `npm config get prefix`
  - Homebrew 설치: `/opt/homebrew` 또는 `/usr/local` → 권한 OK
  - 시스템 설치: `/usr/local` → 보통 OK

### 1.4 OpenClaw 설치
- [ ] `npm install -g openclaw` 성공
- [ ] `openclaw --version` 동작

---

## 2. 앱 시작 및 초기 설정

### 2.1 앱 실행
- [ ] DMG에서 앱 드래그 또는 직접 실행
- [ ] Gatekeeper 경고 시 "열기" 허용
- [ ] 앱이 정상 실행됨

### 2.2 첫 실행
- [ ] 이용약관 페이지 표시
- [ ] 동의 후 온보딩 진행
- [ ] localStorage에 동의 상태 저장됨

### 2.3 온보딩
- [ ] AI 모델 선택
- [ ] API 키 입력
- [ ] 메신저 선택
- [ ] 대시보드 이동

---

## 3. PATH 인식 테스트 (macOS 특수)

### 3.1 GUI 앱 PATH 문제
macOS에서 GUI 앱은 터미널과 다른 PATH를 가짐. moldClaw가 아래 경로를 인식하는지 확인:

| 경로 | 용도 | 확인 |
|------|------|------|
| `/opt/homebrew/bin` | Homebrew (Apple Silicon) | [ ] |
| `/opt/homebrew/sbin` | Homebrew (Apple Silicon) | [ ] |
| `/usr/local/bin` | Homebrew (Intel) | [ ] |
| `/usr/local/sbin` | Homebrew (Intel) | [ ] |
| `~/go/bin` | Go binaries | [ ] |
| `~/.cargo/bin` | Rust/Cargo | [ ] |
| `~/.local/bin` | pipx, uv | [ ] |
| `~/Library/npm/bin` | npm global | [ ] |

### 3.2 테스트 방법
```bash
# 터미널에서 바이너리 설치
go install github.com/steipete/gifgrep/cmd/gifgrep@latest

# moldClaw 앱에서 gifgrep이 "설치됨"으로 표시되는지 확인
```

---

## 4. Prerequisite (전제조건) 설치

### 4.1 Go 설치
```
명령: brew install go
```
- [ ] "Go 설치" 버튼 클릭
- [ ] Terminal.app 열림 (osascript 사용)
- [ ] brew 명령 자동 실행
- [ ] 설치 완료 메시지
- [ ] moldClaw에서 Go 감지됨
- [ ] 버전 표시

### 4.2 uv 설치
```
명령: curl -LsSf https://astral.sh/uv/install.sh | sh
```
- [ ] "uv 설치" 버튼 클릭
- [ ] Terminal.app 열림
- [ ] curl 스크립트 실행
- [ ] 설치 완료 메시지
- [ ] moldClaw에서 uv 감지됨

### 4.3 Homebrew 설치 (미설치 시)
```
명령: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
- [ ] "Homebrew 설치" 버튼 클릭
- [ ] Terminal.app 열림
- [ ] 설치 스크립트 실행
- [ ] 비밀번호 입력 필요할 수 있음

---

## 5. 스킬 설치 테스트

### 5.1 brew 스킬 설치
**테스트 스킬**: `himalaya` (`brew install himalaya`)
- [ ] 설치 버튼 클릭
- [ ] 로딩 스피너 표시
- [ ] 백그라운드 실행 (NONINTERACTIVE=1, HOMEBREW_NO_AUTO_UPDATE=1)
- [ ] 완료 후 "설치됨" 상태로 전환
- [ ] 바이너리 확인: `which himalaya`

**여러 패키지 스킬**: `session-logs` (`brew install jq ripgrep`)
- [ ] 설치 버튼 클릭
- [ ] jq와 ripgrep 둘 다 설치됨
- [ ] `which jq` 및 `which ripgrep` 확인

**tap 스킬**: `wacli` (`brew install steipete/tap/wacli`)
- [ ] 설치 버튼 클릭
- [ ] tap 자동 추가됨
- [ ] 바이너리 설치됨

### 5.2 Go 스킬 설치
**테스트 스킬**: `gifgrep` (`go install github.com/steipete/gifgrep/cmd/gifgrep@latest`)
- [ ] Go prerequisite 확인
- [ ] 설치 버튼 클릭
- [ ] 백그라운드 실행 (macos_sh 사용)
- [ ] 완료 후 "설치됨"
- [ ] 바이너리 확인: `~/go/bin/gifgrep`

### 5.3 npm 스킬 설치
**테스트 스킬**: `clawhub` (`npm install -g clawhub`)
- [ ] 설치 버튼 클릭
- [ ] 백그라운드 실행
- [ ] 완료 후 "설치됨"
- [ ] 바이너리 확인: `which clawhub`

### 5.4 uv 스킬 설치
**테스트 스킬**: `nano-pdf` (`uv tool install nano-pdf`)
- [ ] uv prerequisite 확인
- [ ] 설치 버튼 클릭
- [ ] 백그라운드 실행
- [ ] 완료 후 "설치됨"
- [ ] 바이너리 확인: `~/.local/bin/nano-pdf`

---

## 6. 스킬 삭제 테스트

### 6.1 brew 스킬 삭제
**테스트 스킬**: `himalaya`
- [ ] "삭제" 버튼 클릭
- [ ] 확인 모달 표시
- [ ] 삭제 클릭 → 로딩 스피너
- [ ] `NONINTERACTIVE=1 brew uninstall himalaya` 실행
- [ ] 삭제 완료 → 설치 UI로 전환
- [ ] 바이너리 없음: `which himalaya` 실패

**여러 패키지 삭제**: `session-logs`
- [ ] "삭제" 버튼 클릭
- [ ] `brew uninstall jq ripgrep` 실행
- [ ] jq와 ripgrep 둘 다 삭제됨

**tap 스킬 삭제**: `wacli`
- [ ] "삭제" 버튼 클릭
- [ ] `brew uninstall steipete/tap/wacli` 실행
- [ ] 삭제 완료

### 6.2 Go 스킬 삭제
**테스트 스킬**: `gifgrep`
- [ ] "삭제" 버튼 클릭
- [ ] 파일 직접 삭제: `~/go/bin/gifgrep`
- [ ] 삭제 완료 → 설치 UI로 전환

### 6.3 npm 스킬 삭제
**테스트 스킬**: `clawhub`
- [ ] "삭제" 버튼 클릭
- [ ] `npm uninstall -g clawhub` 실행
- [ ] 삭제 완료 → 설치 UI로 전환

### 6.4 uv 스킬 삭제
**테스트 스킬**: `nano-pdf`
- [ ] "삭제" 버튼 클릭
- [ ] `uv tool uninstall nano-pdf` 실행
- [ ] 삭제 완료 → 설치 UI로 전환

---

## 7. macOS 전용 스킬 테스트

### 7.1 camsnap (macOS ARM64 only)
- [ ] Apple Silicon Mac에서만 표시
- [ ] Intel Mac에서 숨김 또는 비활성화
- [ ] `brew install steipete/tap/camsnap` 설치
- [ ] 카메라 설정 마법사 동작

### 7.2 apple-reminders
- [ ] `brew install reminders-cli` 설치
- [ ] macOS Reminders 권한 요청

### 7.3 imsg (iMessage)
- [ ] `brew install steipete/tap/imsg` 설치
- [ ] Full Disk Access 권한 필요 안내

---

## 8. 연결 해제 vs 삭제 테스트

### 8.1 SetupRequirement::None 스킬
**예**: `nano-pdf`, `gifgrep`
- [ ] "삭제" 버튼만 표시 (연결 해제 없음)
- [ ] 삭제 시 바이너리 삭제됨

### 8.2 SetupRequirement::Login 스킬
**예**: `himalaya`, `1password`
- [ ] "연결 해제" 버튼 (노란색) + "삭제" 버튼 (빨간색)
- [ ] 연결 해제: config 파일만 삭제, 바이너리 유지
- [ ] 삭제: 바이너리까지 삭제

---

## 9. UI/UX 테스트

### 9.1 로딩 상태
- [ ] 설치/삭제 중 스피너 표시
- [ ] 버튼 비활성화
- [ ] 다른 스킬 조작 가능 (독립적)

### 9.2 에러 처리
- [ ] 설치 실패: 에러 메시지 표시
- [ ] 삭제 실패: 에러 + 수동 명령어 표시
- [ ] 권한 에러: 수동 명령어 안내

---

## 10. 확인 명령어 모음

```bash
# 환경 확인
brew --version
node --version
npm --version
go version
uv --version

# npm 경로
npm config get prefix

# 바이너리 위치
which himalaya
which gifgrep
which clawhub
which nano-pdf

# 경로 직접 확인
ls ~/go/bin/
ls ~/.local/bin/
ls /opt/homebrew/bin/ | grep -E "himalaya|jq|ripgrep"

# Homebrew 설치 목록
brew list
```

---

## 테스트 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| PATH 인식 | | |
| Prerequisite 설치 | | |
| brew 스킬 설치/삭제 | | |
| Go 스킬 설치/삭제 | | |
| npm 스킬 설치/삭제 | | |
| uv 스킬 설치/삭제 | | |
| 여러 패키지 삭제 | | |
| 연결 해제 vs 삭제 | | |

**테스터**: ________________
**날짜**: ________________
**Mac 종류**: Apple Silicon / Intel
**버전**: 0.7.5
