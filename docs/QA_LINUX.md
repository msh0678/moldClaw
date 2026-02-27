# moldClaw Linux QA 체크리스트 v0.7.5

## 1. 환경 요구사항 확인

### 1.1 시스템 요구사항
- [ ] Linux 배포판: Ubuntu, Fedora, Arch, Linux Mint 등
- [ ] WebKitGTK 4.1 설치됨 (Tauri 요구사항)
- [ ] 데스크톱 환경: GNOME, KDE, XFCE 등

### 1.2 패키지 매니저 확인
사용 가능한 패키지 매니저 확인:
- [ ] apt (Debian/Ubuntu): `apt --version`
- [ ] dnf (Fedora/RHEL): `dnf --version`
- [ ] pacman (Arch): `pacman --version`
- [ ] brew (Linuxbrew): `brew --version`

### 1.3 Node.js 환경
- [ ] Node.js 18+ 설치됨
- [ ] npm 경로 확인: `npm config get prefix`
  - `/usr/local` 또는 `/usr` → **sudo 필요**
  - `~/.npm-global` 또는 `~/.nvm/...` → 권한 OK

### 1.4 OpenClaw 설치
- [ ] `npm install -g openclaw` 성공 (sudo 필요할 수 있음)
- [ ] `openclaw --version` 동작

---

## 2. 앱 실행 테스트

### 2.1 실행 방식별 테스트
- [ ] AppImage: `chmod +x moldClaw.AppImage && ./moldClaw.AppImage`
- [ ] DEB 패키지: `sudo dpkg -i moldclaw.deb`
- [ ] RPM 패키지: `sudo rpm -i moldclaw.rpm`

### 2.2 첫 실행
- [ ] 이용약관 페이지 표시
- [ ] 동의 후 온보딩 진행
- [ ] **confirm()/alert() 대신 인라인 UI 사용** (Tauri WebView 이슈)

### 2.3 온보딩
- [ ] AI 모델 선택
- [ ] API 키 입력
- [ ] 메신저 선택
- [ ] 대시보드 이동

---

## 3. PATH 인식 테스트 (Linux 특수)

### 3.1 GUI 앱 PATH 문제
Linux GUI 앱(AppImage 등)은 셸 프로필을 로드하지 않음. moldClaw가 아래 경로를 인식하는지 확인:

| 경로 | 용도 | 확인 |
|------|------|------|
| `/home/linuxbrew/.linuxbrew/bin` | 시스템 Linuxbrew | [ ] |
| `~/.linuxbrew/bin` | 사용자 Linuxbrew | [ ] |
| `/usr/local/bin` | 시스템 바이너리 | [ ] |
| `~/go/bin` | Go binaries | [ ] |
| `~/.cargo/bin` | Rust/Cargo | [ ] |
| `~/.local/bin` | pipx, uv, pip --user | [ ] |
| `~/.npm-global/bin` | npm global (사용자 설정) | [ ] |
| `/snap/bin` | Snap packages | [ ] |

### 3.2 테스트 방법
```bash
# 터미널에서 바이너리 설치
go install github.com/steipete/gifgrep/cmd/gifgrep@latest

# moldClaw 앱에서 gifgrep이 "설치됨"으로 표시되는지 확인
```

---

## 4. Prerequisite (전제조건) 설치

### 4.1 Go 설치
패키지 매니저 자동 감지:
- apt: `sudo apt update && sudo apt install -y golang-go`
- dnf: `sudo dnf install -y golang`
- pacman: `sudo pacman -S --noconfirm go`
- brew: `brew install go`

테스트:
- [ ] "Go 설치" 버튼 클릭
- [ ] 터미널 자동 감지 (gnome-terminal, konsole, xfce4-terminal, xterm)
- [ ] 터미널 창 열림
- [ ] sudo 비밀번호 입력
- [ ] 설치 완료 메시지
- [ ] moldClaw 재시작 후 Go 감지됨

### 4.2 uv 설치
```
명령: curl -LsSf https://astral.sh/uv/install.sh | sh
```
- [ ] "uv 설치" 버튼 클릭
- [ ] 터미널 창 열림
- [ ] curl 스크립트 실행
- [ ] `~/.local/bin`에 설치됨
- [ ] moldClaw에서 감지됨

### 4.3 Homebrew (Linuxbrew) 설치
```
명령: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
- [ ] "Homebrew 설치" 버튼 클릭
- [ ] 터미널 창 열림
- [ ] 설치 스크립트 실행
- [ ] `/home/linuxbrew/.linuxbrew` 또는 `~/.linuxbrew`에 설치

---

## 5. 스킬 설치 테스트

### 5.1 npm 스킬 설치
**테스트 스킬**: `clawhub` (`npm install -g clawhub`)
- [ ] 설치 버튼 클릭
- [ ] 로딩 스피너 표시
- [ ] 백그라운드 실행 (linux_sh 사용)
- [ ] 완료 후 "설치됨"
- [ ] 바이너리 확인: `which clawhub`

### 5.2 Go 스킬 설치
**테스트 스킬**: `gifgrep` (`go install github.com/steipete/gifgrep/cmd/gifgrep@latest`)
- [ ] Go prerequisite 확인
- [ ] 설치 버튼 클릭
- [ ] 백그라운드 실행
- [ ] 완료 후 "설치됨"
- [ ] 바이너리 확인: `~/go/bin/gifgrep`

### 5.3 uv 스킬 설치
**테스트 스킬**: `nano-pdf` (`uv tool install nano-pdf`)
- [ ] uv prerequisite 확인
- [ ] 설치 버튼 클릭
- [ ] 백그라운드 실행
- [ ] 완료 후 "설치됨"
- [ ] 바이너리 확인: `~/.local/bin/nano-pdf`

### 5.4 brew 스킬 설치 (Linuxbrew 사용 시)
**테스트 스킬**: `jq` (`brew install jq`)
- [ ] Linuxbrew 설치됨 확인
- [ ] 설치 버튼 클릭
- [ ] `NONINTERACTIVE=1 HOMEBREW_NO_AUTO_UPDATE=1 brew install jq`
- [ ] 완료 후 "설치됨"

---

## 6. 스킬 삭제 테스트

### 6.1 npm 스킬 삭제 (권한 문제 핵심 테스트)

**Case A: npm prefix가 사용자 경로**
- npm prefix: `~/.npm-global` 또는 `~/.nvm/...`
- [ ] "삭제" 버튼 클릭
- [ ] `npm uninstall -g clawhub` 실행
- [ ] 삭제 성공 → 설치 UI로 전환

**Case B: npm prefix가 시스템 경로 (⚠️ 중요)**
- npm prefix: `/usr/local` 또는 `/usr`
- [ ] "삭제" 버튼 클릭
- [ ] 삭제 실패 (권한 없음)
- [ ] 에러 메시지 표시
- [ ] 수동 명령어 표시: `sudo npm uninstall -g clawhub`

**npm prefix 확인 방법**:
```bash
npm config get prefix
# /usr/local → sudo 필요
# ~/.npm-global → sudo 불필요
```

### 6.2 Go 스킬 삭제
**테스트 스킬**: `gifgrep`
- [ ] "삭제" 버튼 클릭
- [ ] 파일 직접 삭제: `~/go/bin/gifgrep`
- [ ] 삭제 완료 → 설치 UI로 전환
- [ ] 바이너리 없음 확인

### 6.3 uv 스킬 삭제
**테스트 스킬**: `nano-pdf`
- [ ] "삭제" 버튼 클릭
- [ ] `uv tool uninstall nano-pdf` 실행
- [ ] 삭제 완료 → 설치 UI로 전환

### 6.4 brew 스킬 삭제
**테스트 스킬**: `jq`
- [ ] "삭제" 버튼 클릭
- [ ] `NONINTERACTIVE=1 brew uninstall jq` 실행
- [ ] 삭제 완료 → 설치 UI로 전환

---

## 7. 터미널 감지 테스트

### 7.1 지원 터미널
moldClaw는 다음 순서로 터미널을 찾음:
1. gnome-terminal
2. konsole
3. xfce4-terminal
4. xterm

- [ ] 데스크톱 환경에 맞는 터미널 열림
- [ ] 터미널 없으면 에러 메시지

### 7.2 터미널별 테스트
| 터미널 | 데스크톱 | 확인 |
|--------|----------|------|
| gnome-terminal | GNOME | [ ] |
| konsole | KDE | [ ] |
| xfce4-terminal | XFCE | [ ] |
| xterm | 기타 | [ ] |

---

## 8. Linux 특수 케이스

### 8.1 인라인 UI (confirm/alert 대체)
- [ ] 삭제 확인: 모달 대신 인라인 UI 표시
- [ ] 취소/확인 버튼 정상 동작
- [ ] JavaScript confirm() 사용 안 함

### 8.2 Snap/Flatpak 패키지 (미래)
- [ ] /snap/bin 경로 인식
- [ ] Snap으로 설치된 바이너리 감지

### 8.3 SELinux/AppArmor
- [ ] 보안 정책으로 인한 실행 제한 확인
- [ ] 필요시 정책 추가 안내

---

## 9. 연결 해제 vs 삭제 테스트

### 9.1 SetupRequirement::None 스킬
**예**: `nano-pdf`, `gifgrep`, `clawhub`
- [ ] "삭제" 버튼만 표시
- [ ] 삭제 시 바이너리 삭제됨

### 9.2 SetupRequirement::Login 스킬
**예**: `himalaya` (Linuxbrew 사용 시)
- [ ] "연결 해제" + "삭제" 버튼 표시
- [ ] 연결 해제: config만 삭제
- [ ] 삭제: 바이너리까지 삭제

---

## 10. 확인 명령어 모음

```bash
# 환경 확인
cat /etc/os-release
node --version
npm --version
npm config get prefix

# Prerequisite
go version
uv --version
brew --version  # Linuxbrew

# 바이너리 위치
which clawhub
which gifgrep
which nano-pdf

# 경로 직접 확인
ls ~/go/bin/
ls ~/.local/bin/
ls ~/.npm-global/bin/  # 또는 npm prefix 경로

# npm 권한 확인
npm config get prefix
ls -la $(npm config get prefix)/lib/node_modules

# 터미널 확인
which gnome-terminal
which konsole
which xfce4-terminal
which xterm
```

---

## 11. 배포판별 특이사항

### Ubuntu/Debian
- [ ] apt로 Node.js 설치 시 npm prefix = `/usr/local` (sudo 필요)
- [ ] nvm 사용 권장

### Fedora/RHEL
- [ ] dnf로 설치 시 경로 확인
- [ ] SELinux 정책 확인

### Arch Linux
- [ ] pacman으로 설치
- [ ] AUR 패키지 고려

### Linux Mint
- [ ] Ubuntu 기반이므로 apt 사용
- [ ] Cinnamon 데스크톱: gnome-terminal 또는 xterm

---

## 테스트 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| PATH 인식 | | |
| Prerequisite 설치 | | |
| npm 스킬 설치/삭제 | | |
| npm 권한 에러 처리 | | |
| Go 스킬 설치/삭제 | | |
| uv 스킬 설치/삭제 | | |
| brew 스킬 설치/삭제 | | |
| 터미널 감지 | | |
| 인라인 UI | | |

**테스터**: ________________
**날짜**: ________________
**배포판**: ________________
**데스크톱**: ________________
**버전**: 0.7.5
