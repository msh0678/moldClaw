# Skill System 전면 개편 계획

## 참조 문서
- `/home/sanghyuck/workspace/moldClaw_images/skill_tool_Implimentation_Guide.md` (메인)
- `/home/sanghyuck/workspace/moldClaw_images/SKILL_LIST_FILTERED.md`
- `/home/sanghyuck/workspace/moldClaw_images/SKILL_SETUP_REQUIREMENTS.md`
- `/home/sanghyuck/workspace/moldClaw_images/SKILL_SETUP_MACOS_ONLY.md`

---

## Phase 1: 데이터 구조 개편

### 1.1 SkillDefinition 구조 확장
```rust
pub struct SkillDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub emoji: String,
    pub category: String,
    
    // 기본 설치 방법 (macOS/Linux)
    pub install_method: InstallMethod,
    pub install_command: Option<String>,
    
    // Windows 전용 설치 방법 (있으면 우선 사용)
    pub windows_install_method: Option<InstallMethod>,
    pub windows_install_command: Option<String>,
    
    pub binary_name: Option<String>,
    pub platform: PlatformSupport,
    pub setup: SetupRequirement,
    pub disconnect: DisconnectConfig,
    pub hidden: bool,
}
```

### 1.2 수정 대상 스킬 (플랫폼별 설치 방법)

| 스킬 | macOS/Linux | Windows |
|------|-------------|---------|
| 1password | brew | winget |
| session-logs | brew (jq + rg) | winget |
| video-frames | brew (ffmpeg) | winget |
| wacli | brew | go |
| gifgrep | go | go |

---

## Phase 2: Rust Backend 수정

### 2.1 skills.rs 수정
- [x] SkillDefinition 구조체 확장
- [ ] install_skill() 플랫폼 분기 로직
- [ ] check_prerequisite() 함수 추가 (go, uv 설치 확인)
- [ ] install_prerequisite() 함수 추가 (go, uv 설치)

### 2.2 skill_definitions.rs 전면 재작성
45개 스킬 모두 문서 기반 재검증:
- 정확한 install_command
- 정확한 platform support
- 정확한 setup requirement
- 정확한 disconnect config
- Windows 전용 설치 방법 추가

### 2.3 새로운 Tauri Commands
```rust
#[tauri::command]
fn check_prerequisites() -> PrerequisiteStatus {
    // go, uv, brew 설치 여부 확인
}

#[tauri::command]
fn install_prerequisite(name: String) -> Result<String, String> {
    // go, uv 설치 (winget 사용)
}
```

---

## Phase 3: Frontend 수정

### 3.1 SkillsSettings.tsx 수정
- [ ] prerequisite 상태 조회 (go, uv)
- [ ] 미설치 시 스킬 비활성화 + 회색 처리
- [ ] 설정 사이드바 하단 경고 버튼 (노란색)
- [ ] macOS 전용 스킬 Windows에서 회색 처리 + 클릭 금지
- [ ] go install 과정 터미널 표시
- [ ] uv install은 백그라운드 (표시 안 함)

### 3.2 UI 컴포넌트
```tsx
// 경고 버튼 (사이드바 하단)
<PrerequisiteWarning 
  missing={['go', 'uv']} 
  onInstall={(name) => ...}
/>

// 스킬 카드 (비활성화 상태)
<SkillCard 
  skill={skill}
  disabled={!hasPrerequisite || !platformSupported}
  disabledReason="macOS 전용입니다" | "Go가 필요합니다"
/>
```

---

## Phase 4: 45개 스킬 상세 구현

### 자동 활성화 (hidden: true) - 4개
1. canvas
2. healthcheck
3. skill-creator
4. weather

### Windows + macOS/Linux - 26개
| # | ID | Install (macOS) | Install (Windows) | Setup |
|---|-----|-----------------|-------------------|-------|
| 1 | 1password | brew | winget | Login |
| 2 | blogwatcher | go | go | None |
| 3 | blucli | go | go | Hardware |
| 4 | clawhub | npm | npm | None |
| 5 | coding-agent | manual | manual | Custom |
| 6 | eightctl | go | go | ApiKey |
| 7 | food-order | go | go | Login |
| 8 | gifgrep | go | go | None |
| 9 | local-places | uv | uv | ApiKey |
| 10 | mcporter | npm | npm | None |
| 11 | nano-banana-pro | uv | uv | ApiKey |
| 12 | nano-pdf | uv | uv | None |
| 13 | openai-image-gen | manual | manual | ApiKey |
| 14 | openai-whisper-api | builtin | builtin | ApiKey |
| 15 | oracle | npm | npm | ApiKey |
| 16 | session-logs | brew | winget | None |
| 17 | sherpa-onnx-tts | manual | manual | Custom |
| 18 | sonoscli | go | go | Hardware |
| 19 | video-frames | brew | winget | None |
| 20 | voice-call | builtin | builtin | Custom |
| 21 | wacli | brew | go | Login |

### macOS + Linux only (brew) - 12개
| # | ID | Setup |
|---|-----|-------|
| 1 | camsnap | Config |
| 2 | gog | Login (OAuth) |
| 3 | goplaces | ApiKey |
| 4 | himalaya | Config |
| 5 | obsidian | Config |
| 6 | openhue | Login |
| 7 | openai-whisper | None |
| 8 | sag | ApiKey |
| 9 | songsee | None |
| 10 | spotify-player | Login |
| 11 | summarize | ApiKey |
| 12 | tmux | None |

### macOS only - 7개
| # | ID | Setup |
|---|-----|-------|
| 1 | apple-notes | MacPermission |
| 2 | apple-reminders | MacPermission |
| 3 | bear-notes | Login |
| 4 | imsg | MacPermission |
| 5 | model-usage | None |
| 6 | peekaboo | MacPermission |
| 7 | things-mac | MacPermission |

---

## Phase 5: 테스트

- [ ] Windows에서 go 스킬 설치 테스트
- [ ] Windows에서 winget 스킬 설치 테스트
- [ ] macOS에서 brew 스킬 설치 테스트
- [ ] prerequisite 경고 UI 테스트
- [ ] 스킬 비활성화/회색 처리 테스트

---

## 구현 순서

1. **skills.rs** 구조 확장 (SkillDefinition, PrerequisiteStatus)
2. **skill_definitions.rs** 전면 재작성 (45개 스킬)
3. **lib.rs** 새 명령어 등록
4. **SkillsSettings.tsx** UI 수정
5. **빌드 및 테스트**
