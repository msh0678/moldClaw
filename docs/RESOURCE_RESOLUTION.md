# moldClaw 리소스 경로 해석 가이드

## 문제: 사용자별 설치 경로

moldClaw는 다양한 환경에서 설치될 수 있습니다:
- Windows: `C:\Program Files\moldClaw\` 또는 `D:\Apps\moldClaw\`
- macOS: `/Applications/moldClaw.app` 또는 `~/Applications/moldClaw.app`
- Linux: `/opt/moldClaw`, `/usr/local/bin/moldClaw`, 또는 사용자 홈
- 한글 사용자명: `C:\Users\홍길동\AppData\Local\moldClaw`

## 해결책: 동적 리소스 탐색

### 1. Tauri의 Resource Resolver API
```rust
app_handle.path().resolve("node-portable", BaseDirectory::Resource)
```
- Tauri가 자동으로 올바른 경로 찾음
- 설치 위치와 무관하게 작동

### 2. 실행파일 기준 상대경로
```rust
std::env::current_exe()?.parent()?.join("resources/node-portable")
```
- Tauri API 실패 시 폴백
- OS별 번들 구조 고려

### 3. 환경변수 오버라이드
```bash
export MOLDCLAW_NODE_PATH=/custom/path/to/node-portable
```
- 개발/디버깅용
- 특수한 설치 환경 대응

### 4. AppData 폴백
- 번들에 Node.js가 없을 경우
- 첫 실행 시 AppData에 자동 다운로드 (구현 예정)

## OS별 특이사항

### Windows
- 한글 경로: USERPROFILE 환경변수 사용
- 드라이브 문자 변동 대응 (C:, D:, E: 등)

### macOS
- .app 번들 구조: `Contents/Resources/`
- 서명된 앱은 리소스 수정 불가

### Linux
- AppImage: 런타임 임시 마운트 `/tmp/.mount_*`
- 시스템 설치: `/usr/lib/moldclaw/resources/`

## 디버깅

리소스를 찾을 수 없을 때:
1. 콘솔 로그 확인 (시도한 모든 경로 표시)
2. `MOLDCLAW_NODE_PATH` 환경변수로 수동 지정
3. `check-resources.sh` 스크립트 실행

## 빌드 시 주의사항

`tauri.conf.json`:
```json
{
  "bundle": {
    "resources": ["resources/**/*"]
  }
}
```

반드시 `src-tauri/resources/node-portable/`에 Node.js 바이너리가 있어야 함!