# moldClaw - OpenClaw Desktop Manager

OpenClaw를 쉽게 설치하고 관리할 수 있는 데스크톱 애플리케이션

## 개요

moldClaw는 OpenClaw의 온보딩 과정을 단순화한 GUI 래퍼입니다. 비전공자도 쉽게 AI 메신저를 설정할 수 있도록 도와줍니다.

## 주요 기능

- ✅ OpenClaw 자동 설치 및 설정
- ✅ AI 모델 선택 (Claude, GPT, Gemini)
- ✅ 메신저 연동 (Telegram, Discord, WhatsApp)
- ✅ Gateway 관리 (시작/중지/재시작)
- ✅ 안전한 로컬 키 관리 (외부 전송 없음)

## 설치 방법

### 사전 요구사항
- Node.js 18+ (없으면 앱이 자동으로 안내)
- Linux/macOS/Windows

### 빌드된 앱 실행
1. Releases에서 OS별 설치 파일 다운로드
   - Linux: `.AppImage`, `.deb`, `.rpm`
   - macOS: `.dmg`
   - Windows: `.msi`

### 개발 환경 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run tauri:dev

# 빌드
npm run tauri:build
```

## 프로젝트 구조

```
moldClaw/
├── src/                  # React 프론트엔드
│   ├── components/       # UI 컴포넌트
│   └── App.tsx          # 메인 앱 로직
├── src-tauri/           # Rust 백엔드
│   └── src/
│       └── openclaw.rs  # OpenClaw 통합 로직
└── dist/                # 빌드 결과물
```

## 보안

- API 키는 로컬에만 저장 (`~/.openclaw/openclaw.json`)
- 외부 서버로 키 전송 없음
- 사용자가 직접 API 키 입력

## 라이선스

MIT License