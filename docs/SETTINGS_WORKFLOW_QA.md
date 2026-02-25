# moldClaw 설정 워크플로우 & QA 가이드

> 버전: 0.6.4  
> 최종 업데이트: 2026-02-25

---

## 목차

1. [전체 흐름 개요](#1-전체-흐름-개요)
2. [첫 실행 - 환경 설정](#2-첫-실행---환경-설정)
3. [온보딩 (4단계)](#3-온보딩-4단계)
4. [대시보드](#4-대시보드)
5. [설정 패널 (7개 탭)](#5-설정-패널-7개-탭)
6. [QA 체크리스트 - Windows](#6-qa-체크리스트---windows)
7. [QA 체크리스트 - macOS](#7-qa-체크리스트---macos)

---

## 1. 전체 흐름 개요

```
앱 실행
    ↓
┌─────────────────────────────────────────┐
│ DisclaimerPage (첫 실행만)              │
│ - 보안 경고 고지                        │
│ - API 비용 책임 고지                    │
│ - WhatsApp 경고 고지                    │
│ - 3개 항목 모두 동의 필수               │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Loading (환경 확인)                     │
│ 1. OS 확인                              │
│ 2. 백신 감지 (Windows만)                │
│ 3. Node.js 확인/설치                    │
│ 4. OpenClaw 확인/설치                   │
│ 5. 온보딩 완료 여부 확인                │
└─────────────────────────────────────────┘
    ↓
┌─────────────────┐    ┌─────────────────┐
│ OnboardingWizard│ OR │ Dashboard       │
│ (미완료 시)      │    │ (완료 시)        │
└─────────────────┘    └─────────────────┘
```

---

## 2. 첫 실행 - 환경 설정

### 2.1 DisclaimerPage (법적 고지)

**위치**: `src/components/pages/DisclaimerPage.tsx`

| 동의 항목 | 내용 |
|----------|------|
| 🔓 보안 취약점 | 프롬프트 주입, 토큰 평문 저장, 시스템 접근 위험 |
| 💰 API 비용 | 사용자 전적 책임, "모두 허용" 시 비용 폭증 가능 |
| 📱 WhatsApp | 비공식 API 사용, 계정 차단 위험 |

**동작**:
- 3개 항목 모두 체크해야 "동의하고 시작하기" 버튼 활성화
- `localStorage: moldclaw_disclaimer_agreed_v1 = true`로 저장
- 한번 동의하면 다시 안 나옴

### 2.2 Loading (환경 확인)

**위치**: `src/components/Loading.tsx`

#### 2.2.1 환경 사전 검사 (PrerequisiteStatus)

```typescript
interface PrerequisiteStatus {
  node_installed: boolean
  node_version: string | null
  node_compatible: boolean      // >= 22.12.0
  node_too_new: boolean         // >= 24.0.0 (네이티브 모듈 문제)
  npm_installed: boolean
  vc_redist_installed: boolean  // Windows만
  disk_space_gb: number
  disk_space_ok: boolean
  antivirus_detected: string | null
}
```

#### 2.2.2 Windows 백신 경고

- 감지 대상: Windows Defender, Avast, Norton 등
- `localStorage: moldclaw_antivirus_warning_shown`으로 한번만 표시
- "설치 계속하기" 클릭 시 진행

#### 2.2.3 Node.js 설치

| 플랫폼 | 자동 설치 | 수동 설치 |
|--------|----------|----------|
| Windows | `winget install OpenJS.NodeJS.LTS` | nodejs.org 링크 제공 |
| macOS | ❌ | nodejs.org 또는 brew 안내 |
| Linux | ❌ | 배포판별 안내 |

**주의**: Node.js 24+ 설치 시 네이티브 모듈 빌드 문제 → 22 LTS 권장

#### 2.2.4 OpenClaw 설치

```
npm install -g openclaw --ignore-scripts
```

**불완전 설치 감지**:
- `openclaw --version` 실패 시
- 자동 정리 후 재설치 시도

---

## 3. 온보딩 (4단계)

**위치**: `src/components/onboarding/OnboardingWizard.tsx`

```
┌──────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────┐
│ 1. 모델  │ → │ 2. 메신저 │ → │ 3. 메신저 연결│ → │ 4. 확인  │
│  설정    │   │   선택   │   │              │   │  & 설치  │
└──────────┘   └──────────┘   └──────────────┘   └──────────┘
```

### 3.1 Step 1: AI 모델 설정 (ModelStep)

**위치**: `src/components/onboarding/ModelStep.tsx`

#### 기본 프로바이더 (3개)

| ID | 이름 | 기본 모델 | API 키 URL |
|----|------|----------|-----------|
| `anthropic` | Anthropic | Claude Sonnet 4 | console.anthropic.com/settings/keys |
| `openai` | OpenAI | GPT-4o | platform.openai.com/api-keys |
| `google` | Google | Gemini 2.0 Flash | aistudio.google.com/app/apikey |

#### 추가 프로바이더 ("더 많은 모델 보기")

| ID | 이름 | 특징 |
|----|------|------|
| `openrouter` | OpenRouter | 여러 모델 경유 |
| `groq` | Groq | 초고속 추론 |
| `mistral` | Mistral | 유럽 AI |
| `together` | Together AI | 오픈소스 모델 |
| `deepseek` | DeepSeek | 중국 AI |
| `xai` | xAI | Grok 모델 |

**입력 필드**:
- 프로바이더 선택 (필수)
- 모델 선택 (필수)
- API 키 입력 (필수, 최소 10자)

### 3.2 Step 2: 메신저 선택 (MessengerStep)

**위치**: `src/components/onboarding/MessengerStep.tsx`

#### 기본 메신저 (3개)

| ID | 이름 | 난이도 | 필요 정보 |
|----|------|--------|----------|
| `telegram` | Telegram | ⭐☆☆ | Bot Token |
| `whatsapp` | WhatsApp | ⭐☆☆ | QR 스캔 |
| `discord` | Discord | ⭐⭐⭐ | Bot Token |

#### 추가 메신저 ("더 많은 메신저 보기")

| ID | 이름 | 필요 정보 |
|----|------|----------|
| `slack` | Slack | Bot Token + App Token |
| `googlechat` | Google Chat | Service Account JSON |
| `mattermost` | Mattermost | Bot Token + Server URL |

### 3.3 Step 3: 메신저 연결 (MessengerConnectStep)

**위치**: `src/components/onboarding/MessengerConnectStep.tsx`

#### 3.3.1 Telegram 설정

1. BotFather에서 봇 생성 (`/newbot`)
2. Bot Token 복사 (형식: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
3. DM 정책 선택:
   - **페어링** (권장): 첫 연락 시 승인 코드 필요
   - **허용 목록만**: `allowFrom`에 등록된 사용자만
   - **모두 허용**: ⚠️ 위험! 누구나 대화 가능

#### 3.3.2 WhatsApp 설정

1. "QR 코드로 연결" 클릭
2. 터미널에 QR 코드 표시
3. WhatsApp 앱 → 설정 → 연결된 기기 → QR 스캔
4. `creds.json` 생성 감지 (500ms 폴링)
5. 5분 타임아웃

**세션 파일 위치**: `~/.openclaw/credentials/whatsapp/default/creds.json`

#### 3.3.3 Discord 설정

1. Discord Developer Portal에서 Application 생성
2. Bot → Reset Token → 복사
3. **⚠️ MESSAGE CONTENT INTENT 활성화 필수**
4. OAuth2 URL Generator로 초대 링크 생성
5. 서버에 봇 초대

#### 3.3.4 Slack 설정

- **Bot Token**: `xoxb-...`
- **App Token**: `xapp-...` (Socket Mode용)
- Socket Mode 활성화 필수

#### 3.3.5 Google Chat 설정

- Service Account JSON 파일 경로 입력
- Google Cloud Console에서 생성

#### 3.3.6 Mattermost 설정

- Bot Token + Server URL 입력

### 3.4 Step 4: 설정 확인 (SummaryStep)

**위치**: `src/components/onboarding/SummaryStep.tsx`

**설치 단계**:

| 단계 | 설명 | 진행률 |
|------|------|--------|
| 1 | 공식 형식 Config 생성 | 15% |
| 2 | 모델 설정 추가 | 30% |
| 3 | 메신저 채널 추가 | 50% |
| 4 | 보안 설정 적용 | 65% |
| 5 | 설정 검증 | 80% |
| 6 | Gateway 시작 | 95% |
| 7 | 완료 | 100% |

**생성되는 파일**: `~/.openclaw/openclaw.json`

---

## 4. 대시보드

**위치**: `src/components/dashboard/DashboardPlanetary.tsx`

### 4.1 주요 기능

- **중앙**: Power 버튼 (Gateway ON/OFF)
- **궤도 버튼들**:
  - 📁 파일/기록
  - 🔔 알림 관리
  - 📋 로그
  - ⚙️ 설정
  - 📖 사용법
- **하단**: 삭제 버튼

### 4.2 Gateway 상태

| 상태 | 표시 |
|------|------|
| running | 🟢 연결됨 |
| stopped | 🔴 중지됨 |
| starting | 🟡 시작 중... |
| error | 🔴 오류 |

---

## 5. 설정 패널 (7개 탭)

**위치**: `src/components/settings/SettingsPanel.tsx`

### 5.1 🤖 AI 모델 (ModelSettings)

- 프로바이더 변경
- 모델 변경
- API 키 변경 (마스킹됨: `••••••••`)

### 5.2 💬 메신저 (MessengerSettings)

- 연결된 메신저 확인
- DM 정책 변경
- allowFrom 목록 편집
- 메신저 연결 해제/재연결

### 5.3 🔧 도구 (ToolsSettings)

- 도구 프로필: `minimal` / `coding` / `messaging` / `full`
- 파일 접근 권한
- 명령 실행 권한
- 브라우저 접근 권한

### 5.4 🎯 스킬 (SkillsSettings)

**2개 탭 구조**:

| 탭 | 개수 | 설명 |
|----|------|------|
| API 연동 | 11개 | API 키 기반 (Notion, GitHub 등) |
| CLI 도구 | 38개 | 바이너리 설치 필요 |

**CLI 스킬 카테고리**:
- productivity (생산성)
- dev (개발)
- media (미디어)
- smarthome (스마트홈)
- messaging (메시징)
- lifestyle (라이프스타일)

**플랫폼 지원**:
- ✅ Windows 호환: 21개
- ❌ macOS/Linux only: 12개 (brew only)
- ❌ macOS only: 7개

### 5.5 🔊 TTS (TTSSettings)

- TTS 제공자 선택
- 음성 선택
- 샘플 재생

### 5.6 📧 Gmail (GmailSettings)

- Google Cloud 프로젝트 설정
- OAuth 자격 증명 설정
- Pub/Sub 설정 (실시간 알림)

### 5.7 🌐 브라우저 (BrowserSettings)

- Chrome Browser Relay 설정
- 프로필 선택: `chrome` (기존 탭) / `openclaw` (격리)
- 익스텐션 설치 안내

---

## 6. QA 체크리스트 - Windows

### 6.1 첫 실행 (클린 설치)

| # | 항목 | 예상 결과 | Pass/Fail |
|---|------|----------|-----------|
| W1 | 앱 실행 | DisclaimerPage 표시 | |
| W2 | 3개 항목 미체크 | 버튼 비활성화 | |
| W3 | 전체 동의 | 버튼 활성화, 클릭 시 Loading으로 | |
| W4 | 백신 감지 (Defender) | 경고 화면 표시 | |
| W5 | "설치 계속하기" 클릭 | 환경 확인 계속 | |
| W6 | Node.js 미설치 시 | winget 자동 설치 시도 | |
| W7 | Node.js 설치 후 | "재시작 필요" 메시지 | |
| W8 | 앱 재시작 후 | OpenClaw 설치 진행 | |
| W9 | OpenClaw 설치 완료 | 온보딩 시작 | |

### 6.2 온보딩

| # | 항목 | 예상 결과 | Pass/Fail |
|---|------|----------|-----------|
| W10 | 모델 단계 진입 | 3개 프로바이더 표시 | |
| W11 | "더 많은 모델 보기" | 추가 프로바이더 표시 | |
| W12 | Anthropic 선택 | 모델 목록 표시 | |
| W13 | API 키 입력 (유효) | 다음 버튼 활성화 | |
| W14 | API 키 입력 (짧음) | 다음 버튼 비활성화 | |
| W15 | 메신저 단계 | 3개 메신저 표시 | |
| W16 | Telegram 선택 → 다음 | 토큰 입력 화면 | |
| W17 | 유효한 토큰 입력 | 다음 버튼 활성화 | |
| W18 | WhatsApp 선택 | QR 연결 버튼 표시 | |
| W19 | QR 연결 클릭 | 터미널에 QR 코드 | |
| W20 | QR 스캔 후 | "연결됨" 표시 | |
| W21 | Discord 선택 | 토큰 입력 + 안내 | |
| W22 | 설정 확인 단계 | 요약 정보 표시 | |
| W23 | "설치 시작" 클릭 | 진행률 바 + 단계 표시 | |
| W24 | 설치 완료 | 대시보드로 이동 | |

### 6.3 대시보드

| # | 항목 | 예상 결과 | Pass/Fail |
|---|------|----------|-----------|
| W25 | 대시보드 진입 | Gateway 상태 표시 | |
| W26 | Power 버튼 클릭 (OFF) | Gateway 시작 | |
| W27 | Power 버튼 클릭 (ON) | Gateway 중지 | |
| W28 | 설정 버튼 클릭 | 설정 패널 열림 | |

### 6.4 설정 패널

| # | 항목 | 예상 결과 | Pass/Fail |
|---|------|----------|-----------|
| W29 | AI 모델 탭 | 현재 설정 표시 | |
| W30 | API 키 표시 | 마스킹됨 (••••••••) | |
| W31 | 프로바이더 변경 | 저장 버튼 활성화 | |
| W32 | 메신저 탭 | 연결 상태 표시 | |
| W33 | 스킬 탭 - API 연동 | 11개 항목 표시 | |
| W34 | 스킬 탭 - CLI 도구 | 38개 항목 표시 | |
| W35 | Windows 전용 스킬 | 설치 버튼 활성화 | |
| W36 | macOS 전용 스킬 | 비활성화 + 경고 | |
| W37 | 대시보드 버튼 | 설정 닫고 돌아감 | |

### 6.5 삭제

| # | 항목 | 예상 결과 | Pass/Fail |
|---|------|----------|-----------|
| W38 | 삭제 버튼 클릭 | 확인 다이얼로그 | |
| W39 | 확인 클릭 | 삭제 진행 | |
| W40 | 파일 사용 중 | 안내 메시지 표시 | |

---

## 7. QA 체크리스트 - macOS

### 7.1 첫 실행

| # | 항목 | 예상 결과 | Pass/Fail |
|---|------|----------|-----------|
| M1 | 앱 실행 | DisclaimerPage 표시 | |
| M2 | 전체 동의 | Loading으로 이동 | |
| M3 | Node.js 미설치 시 | 수동 설치 안내 (brew/nodejs.org) | |
| M4 | OpenClaw 설치 | npm install 진행 | |
| M5 | 온보딩 시작 | 4단계 위자드 | |

### 7.2 온보딩

| # | 항목 | 예상 결과 | Pass/Fail |
|---|------|----------|-----------|
| M6 | 모델 설정 | Windows와 동일 | |
| M7 | WhatsApp QR 연결 | Terminal.app에 QR | |
| M8 | QR 스캔 후 | creds.json 감지 | |
| M9 | 설치 완료 | 대시보드 이동 | |

### 7.3 설정 패널

| # | 항목 | 예상 결과 | Pass/Fail |
|---|------|----------|-----------|
| M10 | 스킬 탭 | 전체 38개 표시 | |
| M11 | brew 스킬 | 설치 버튼 활성화 | |
| M12 | Windows 전용 스킬 | 비활성화 + 경고 | |
| M13 | macOS 권한 필요 스킬 | 권한 안내 표시 | |
| M14 | 1password 설치 | brew 명령 실행 | |
| M15 | apple-notes 설치 | Automation 권한 요청 | |

### 7.4 macOS 전용 스킬 (7개)

| 스킬 | 필요 권한 | 테스트 |
|------|----------|--------|
| apple-notes | Automation (Notes.app) | |
| apple-reminders | Reminders | |
| bear-notes | Bear API Token | |
| imsg | Full Disk Access + Automation (Messages) | |
| model-usage | 없음 (cask) | |
| peekaboo | Screen Recording + Accessibility | |
| things-mac | Full Disk Access | |

---

## 8. 알려진 이슈

| 이슈 | 플랫폼 | 상태 |
|------|--------|------|
| Node.js 24+ 네이티브 모듈 빌드 실패 | All | 22 LTS 권장 |
| WhatsApp 5분 타임아웃 | All | 재시도 안내 |
| winget PATH 업데이트 지연 | Windows | 재시작 필요 |
| brew 설치 후 PATH | macOS | 터미널 재시작 |

---

## 9. 파일 경로 참조

| 항목 | 경로 |
|------|------|
| Config | `~/.openclaw/openclaw.json` |
| WhatsApp 세션 | `~/.openclaw/credentials/whatsapp/default/` |
| 로그 | `~/.openclaw/sessions/` |
| 스킬 | `~/.openclaw/skills/` |

---

*문서 작성: 2026-02-25*
