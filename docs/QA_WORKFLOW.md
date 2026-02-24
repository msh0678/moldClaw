# moldClaw QA 워크플로우

> **모든 변경 후 반드시 이 체크리스트 수행**

---

## 1. 첫 실행 테스트 (Fresh Install)

### 1.1 환경 초기화
```bash
# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\.openclaw" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\com.forgeclaw.moldclaw" -ErrorAction SilentlyContinue

# Linux
rm -rf ~/.openclaw ~/.local/share/com.forgeclaw.moldclaw

# localStorage 삭제 (DevTools > Application > Clear Storage)
```

### 1.2 체크리스트
- [ ] 앱 실행 시 DisclaimerPage 표시됨
- [ ] 동의 버튼 클릭 후 온보딩 시작
- [ ] localStorage에 `moldclaw_disclaimer_agreed_v1` 저장됨

---

## 2. 온보딩 플로우

### 2.1 ModelStep
- [ ] Provider 목록 표시 (Anthropic, OpenAI, Google 등)
- [ ] Provider 선택 시 모델 목록 표시
- [ ] API 키 입력 필드 표시
- [ ] 유효성 검사 (빈 키 불가)
- [ ] "다음" 버튼으로 진행

### 2.2 MessengerStep
- [ ] 메신저 목록 표시 (Telegram, Discord, WhatsApp 등)
- [ ] 메신저 선택 시 정책 설정 UI 표시
- [ ] dmPolicy 선택 가능 (pairing/allowlist/open)
- [ ] groupPolicy 선택 가능 (allowlist/open/disabled)
- [ ] allowFrom 입력 가능
- [ ] "다음" 버튼으로 진행

### 2.3 MessengerConnectStep
- [ ] 토큰 입력 필드 (Telegram, Discord)
- [ ] QR 코드 연결 (WhatsApp)
  - [ ] `openclaw plugins enable whatsapp` 실행됨
  - [ ] QR 코드 터미널 열림
  - [ ] 연결 성공 시 진행
- [ ] "다음" 버튼으로 진행

### 2.4 SummaryStep
- [ ] 모든 설정 요약 표시
- [ ] "설치 시작" 버튼 클릭
- [ ] 진행률 표시
- [ ] 각 단계 상태 표시:
  - [ ] 설정 초기화 (create_official_config)
  - [ ] AI 모델 설정 (add_model_to_config)
  - [ ] 메신저 연결 (add_channel_to_config + enable_channel_plugin)
  - [ ] 보안 설정 (apply_default_security_settings)
  - [ ] 설정 검증 (validate_config)
  - [ ] Gateway 시작
- [ ] 완료 후 대시보드로 전환

---

## 3. 대시보드 테스트

### 3.1 초기 상태
- [ ] DashboardPlanetary 렌더링됨 (빈 화면 아님!)
- [ ] 전원 버튼 중앙에 표시
- [ ] Gateway 상태 표시 (하단)
- [ ] 주변 기능 버튼들 표시

### 3.2 기능 버튼
- [ ] ⚙️ 설정 → SettingsPanel 열림
- [ ] 🔔 알림 → NotificationsPage 열림
- [ ] 📁 파일 → FilesPage 열림
- [ ] 📋 로그 → LogsPage 열림
- [ ] 🌐 웹 → 브라우저에서 localhost:18789 열림
- [ ] 📖 가이드 → GuidePage 열림
- [ ] ⚠️ 삭제 → DeleteModal 열림

### 3.3 전원 버튼
- [ ] 중지 상태 → 클릭 → 시작 (시작 중 애니메이션)
- [ ] 실행 상태 → 클릭 → 중지
- [ ] 에러 발생 시 에러 상태 표시

---

## 4. 설정 → 대시보드 복귀

- [ ] 설정에서 변경 후 닫기
- [ ] 대시보드로 정상 복귀 (빈 화면 아님!)
- [ ] Gateway 상태 자동 체크
- [ ] settingsJustClosed 플래그 리셋

---

## 5. 에러 케이스

### 5.1 API 키 오류
- [ ] 잘못된 API 키 → 에러 메시지 표시
- [ ] 에러 후 재시도 가능

### 5.2 플러그인 오류
- [ ] "Unsupported channel" → enable_channel_plugin 호출 확인
- [ ] 플러그인 목록에서 loaded 상태 확인

### 5.3 Gateway 오류
- [ ] Gateway 시작 실패 → 에러 메시지 표시
- [ ] 재시도 가능

### 5.4 네트워크 오류
- [ ] 오프라인 상태 → 적절한 에러 메시지

---

## 6. React 규칙 준수

### 6.1 Hooks 규칙
- [ ] 모든 useCallback/useState/useEffect는 컴포넌트 최상위에 위치
- [ ] 조건문 안에서 Hook 호출 없음
- [ ] Hook 호출 순서 일관성

### 6.2 빌드 검증
```bash
npm run build  # TypeScript 에러 확인
cargo check --manifest-path src-tauri/Cargo.toml  # Rust 에러 확인
```

---

## 7. 자동 QA 스크립트

```bash
#!/bin/bash
# qa-check.sh

echo "=== moldClaw QA Check ==="

cd /path/to/moldClaw

# 1. TypeScript 빌드
echo "1. TypeScript 빌드..."
npm run build || { echo "❌ TS 빌드 실패"; exit 1; }
echo "✅ TS 빌드 성공"

# 2. Rust 빌드
echo "2. Rust 빌드..."
cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | grep -E "^error" && { echo "❌ Rust 빌드 실패"; exit 1; }
echo "✅ Rust 빌드 성공"

# 3. Hook 규칙 검사
echo "3. Hook 규칙 검사..."
grep -rn "return.*<" src/*.tsx src/components/**/*.tsx | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  linenum=$(echo "$line" | cut -d: -f2)
  # return 후에 useCallback/useState가 있는지 확인
  tail -n +$linenum "$file" | head -20 | grep -q "useCallback\|useState\|useEffect" && \
    echo "⚠️ 잠재적 Hook 위반: $file:$linenum"
done
echo "✅ Hook 검사 완료"

echo "=== QA 완료 ==="
```

---

## 변경 시 필수 확인

1. **App.tsx 수정 시**: Hook 위치 확인
2. **openclaw.rs 채널 관련 수정 시**: enable_channel_plugin 호출 확인
3. **온보딩 플로우 수정 시**: 전체 플로우 테스트
4. **대시보드 수정 시**: 설정 → 대시보드 복귀 테스트

---

*Last Updated: 2026-02-24*
