# moldClaw Tools & Skills 법적 리스크 분석

> 작성일: 2026-02-24
> 검토 대상: TOOLS_SKILLS_REQUIRED_FIELDS.md 기반
> 범위: 도구/스킬 사용의 법적, 보안, ToS 위반 리스크

---

## 📋 요약

| 분류 | 리스크 레벨 | 상태 | 조치 필요 |
|------|------------|------|----------|
| Exec 도구 | 🔴 높음 | 기본값 안전 | 경고 UI 필요 |
| Web Scraping | 🟡 중간 | 사용자 책임 | 고지 필요 |
| Browser 자동화 | 🟡 중간 | 사용자 책임 | 고지 필요 |
| 제3자 API ToS | 🟢 낮음 | 대부분 허용 | 일부 주의 |
| API 키 보안 | 🟡 중간 | 로컬 저장 | 암호화 권장 |
| Elevated 권한 | 🔴 높음 | 기본 비활성 | 경고 필수 |

---

## 1. 🔴 Exec 도구 — 시스템 명령 실행

### 위험 시나리오

```
사용자: "디스크 정리해줘"
AI: exec("rm -rf /")  ← 시스템 파괴 가능
```

### 현재 기본값 (안전)

```yaml
tools:
  exec:
    security: "deny"  # ✅ 모든 명령 차단
    ask: "on-miss"    # ✅ 허용 목록 외 승인 필요
```

### 위험한 설정

| 설정 | 위험 | 법적 리스크 |
|------|------|-----------|
| `security: "full"` | 🔴 모든 명령 허용 | 시스템 손상 책임 |
| `security: "allowlist"` | 🟡 허용 목록만 | 목록 관리 책임 |
| `elevated: true` | 🔴 관리자 권한 | 시스템 전체 위험 |

### 법적 고려사항

1. **시스템 손상**: AI가 실행한 명령으로 데이터 손실 시 책임 소재
2. **제3자 피해**: AI가 네트워크 공격 명령 실행 시 법적 책임
3. **기업 환경**: 회사 시스템에서 무단 명령 실행 시 고용 계약 위반

### 필수 조치

```tsx
// security: "full" 또는 "allowlist" 선택 시 경고 UI
<div className="bg-forge-error/10 border border-forge-error/30 p-4 rounded-lg">
  <h4 className="text-forge-error font-bold">⚠️ 보안 경고</h4>
  <p className="text-sm text-forge-muted mt-2">
    이 설정은 AI가 시스템 명령을 실행할 수 있게 합니다.
    <strong className="text-forge-error">악성 명령 실행으로 인한 피해는
    사용자 책임</strong>입니다.
  </p>
</div>
```

---

## 2. 🟡 Web Scraping 도구 — 법적 회색 지대

### 관련 도구

- `web_fetch` — 웹페이지 내용 추출
- `Firecrawl` — 봇 차단 우회 스크래핑
- `ScraperAPI` — 프록시 스크래핑
- `Browserless` — 헤드리스 브라우저

### 법적 리스크

| 행위 | 리스크 | 관련 법률 |
|------|--------|----------|
| robots.txt 무시 | 🟡 중간 | 컴퓨터 사기 및 남용법 (CFAA) |
| ToS 위반 | 🟡 중간 | 계약 위반 |
| 과도한 요청 | 🟡 중간 | 서비스 방해 |
| 개인정보 수집 | 🔴 높음 | GDPR, 개인정보보호법 |

### 주요 판례

- **hiQ Labs v. LinkedIn (2022)**: 공개 데이터 스크래핑은 CFAA 위반 아님
- **단, ToS 위반은 여전히 계약법 문제**

### 현재 상태

```yaml
tools:
  web:
    fetch:
      firecrawl:
        # Firecrawl은 "proxy: auto" 사용 (봇 차단 우회)
        enabled: true  # API 키 있으면 자동 활성화
```

### 권장 고지문

```markdown
## 웹 스크래핑 고지

- `web_fetch` 및 관련 도구는 웹사이트 내용을 추출합니다.
- 일부 웹사이트는 자동화된 접근을 이용약관(ToS)에서 금지합니다.
- 사용자는 대상 웹사이트의 ToS 및 robots.txt를 확인할 책임이 있습니다.
- moldClaw는 스크래핑으로 인한 법적 문제에 책임지지 않습니다.
```

---

## 3. 🟡 Browser 자동화 — 사이트 ToS 위반 가능

### 관련 기능

- `browser` 도구 — Playwright/Chrome 자동화
- `act` 액션 — 클릭, 타이핑, 폼 제출

### 위험 시나리오

```
사용자: "이 사이트에서 자동으로 티켓 예매해줘"
AI: browser.act({ kind: "click", ref: "buyButton" })
→ 사이트 ToS 위반 (봇 사용 금지)
```

### 법적 리스크

| 사용 케이스 | 리스크 | 이유 |
|------------|--------|------|
| 가격 비교 | 🟢 낮음 | 대부분 허용 |
| 자동 로그인 | 🟡 중간 | ToS에 따라 다름 |
| 자동 구매/예약 | 🔴 높음 | 대부분 금지 |
| 계정 자동 생성 | 🔴 높음 | 거의 모든 사이트 금지 |
| 스팸/대량 작업 | 🔴 높음 | 법적 조치 가능 |

### 권장 고지문

```markdown
## 브라우저 자동화 고지

- 브라우저 도구는 웹사이트를 자동으로 조작합니다.
- 많은 웹사이트는 자동화된 접근을 금지합니다.
- 자동 구매, 계정 생성, 대량 작업은 법적 문제를 야기할 수 있습니다.
- 사용자는 자동화 대상 사이트의 이용약관을 확인할 책임이 있습니다.
```

---

## 4. 🟢 제3자 API ToS — 대부분 허용

### 스킬별 ToS 분석

| 스킬 | 자동화 허용 | ToS 주의점 |
|------|------------|-----------|
| **Notion** | ✅ 공식 API | 정상 사용 |
| **GitHub** | ✅ 공식 API | Rate Limit 준수 |
| **Todoist** | ✅ 공식 API | 정상 사용 |
| **Linear** | ✅ 공식 API | 정상 사용 |
| **Trello** | ✅ 공식 API | 정상 사용 |
| **Jira** | ✅ 공식 API | 정상 사용 |
| **Asana** | ✅ 공식 API | 정상 사용 |
| **Figma** | ⚠️ 읽기 위주 | 대량 수정 주의 |
| **Airtable** | ✅ 공식 API | Rate Limit 준수 |
| **Dropbox** | ✅ 공식 API | 저장 용량 제한 확인 |

### 공통 주의사항

1. **Rate Limit**: 과도한 API 호출은 계정 정지 가능
2. **자동화 범위**: 사용자 대리 행위 범위 확인
3. **데이터 내보내기**: 대량 데이터 추출 시 ToS 확인

### 결론

대부분의 Skills는 **공식 API**를 사용하므로 ToS 위반 위험이 낮음.
단, Rate Limit과 사용량 제한은 사용자가 관리해야 함.

---

## 5. 🟡 API 키 보안 — 평문 저장 이슈

### 현재 저장 방식

```
~/.openclaw/openclaw.json (평문 JSON)
├── tools.web.search.apiKey: "BSA..."
├── skills.entries.github.apiKey: "ghp_..."
└── providers.anthropic.apiKey: "sk-ant-..."
```

### 보안 위험

| 위험 | 가능성 | 영향 |
|------|--------|------|
| 파일 시스템 접근으로 키 탈취 | 🟡 중간 | API 비용 청구 |
| 백업/공유 시 키 노출 | 🟡 중간 | 계정 침해 |
| 악성 소프트웨어 탈취 | 🟢 낮음 | 전체 키 유출 |

### 법적 고려사항

1. **키 유출 시 책임**: 사용자 관리 책임
2. **제3자 피해**: 탈취된 키로 제3자 서비스 남용 시 복잡한 책임 문제
3. **기업 정책**: 회사 API 키를 개인 PC에 저장 시 정책 위반 가능

### 권장 고지문

```markdown
## API 키 보안 고지

- 모든 API 키는 로컬 컴퓨터에 **평문**으로 저장됩니다.
- 저장 위치: `~/.openclaw/openclaw.json`
- **권장 사항**:
  - 컴퓨터 암호 잠금 설정
  - config 파일 공유 시 API 키 제거
  - 정기적으로 API 키 순환
- API 키 유출로 인한 피해는 사용자 책임입니다.
```

### 장기 개선 권장

- [ ] OS 키체인/Credential Manager 연동
- [ ] config 파일 암호화 옵션
- [ ] 키 마스킹 UI 개선

---

## 6. 🔴 Elevated 권한 — 관리자 실행

### 위험 시나리오

```yaml
tools:
  elevated:
    enabled: true  # 🔴 위험!
```

```
AI가 관리자 권한으로 명령 실행
→ 시스템 설정 변경, 소프트웨어 설치, 방화벽 수정 가능
→ 악의적 프롬프트 주입 시 시스템 전체 위험
```

### 법적 리스크

| 시나리오 | 리스크 |
|---------|--------|
| 시스템 파일 삭제 | 데이터 손실 책임 |
| 악성 소프트웨어 설치 | 보안 침해 책임 |
| 네트워크 설정 변경 | 기업 보안 정책 위반 |
| 제3자 시스템 접근 | 불법 접근 (형사 책임) |

### 현재 기본값 (안전)

```yaml
tools:
  elevated:
    enabled: false  # ✅ 기본 비활성화
```

### 필수 조치

elevated 활성화 시 **반드시** 경고 + 동의 체크박스:

```tsx
<div className="bg-forge-error/10 border border-forge-error/30 p-4 rounded-lg">
  <h4 className="text-forge-error font-bold">🚨 최고 위험: 관리자 권한</h4>
  <p className="text-sm text-forge-muted mt-2">
    이 설정은 AI에게 <strong className="text-forge-error">관리자(root/sudo) 권한</strong>을 
    부여합니다. 악성 프롬프트로 인해 <strong>시스템이 완전히 손상</strong>될 수 있습니다.
  </p>
  <p className="text-sm text-forge-error mt-2 font-bold">
    일반 사용자에게 절대 권장하지 않습니다.
  </p>
  <label className="flex items-center gap-3 mt-4 pt-3 border-t border-forge-error/20">
    <input type="checkbox" required />
    <span className="text-sm text-forge-error font-medium">
      위험을 완전히 이해했으며, 모든 결과에 대해 책임집니다.
    </span>
  </label>
</div>
```

---

## 7. 📋 법적 리스크 대응 체크리스트

### 🔴 필수 (배포 전)

- [x] `exec.security` 기본값 "deny" 확인
- [x] `elevated.enabled` 기본값 false 확인
- [ ] **Exec "full" 선택 시 경고 모달** 추가
- [ ] **Elevated 활성화 시 경고 모달** 추가
- [ ] **전체 면책 조항** 앱 내 명시

### 🟡 권장 (배포 후 보완)

- [ ] Web Scraping 고지문 추가
- [ ] Browser 자동화 고지문 추가
- [ ] API 키 보안 가이드 문서화
- [ ] Rate Limit 초과 시 경고 UI

### 🟢 선택 (장기 개선)

- [ ] API 키 암호화 저장
- [ ] OS 키체인 연동
- [ ] 사용량 모니터링 대시보드

---

## 8. 권장 전체 면책 조항

### Settings 또는 About 페이지용

```markdown
## 도구 및 스킬 면책 조항

### 시스템 명령 (Exec)
- AI가 실행하는 시스템 명령은 사용자 환경에서 직접 실행됩니다.
- 잘못된 명령으로 인한 데이터 손실, 시스템 손상은 **사용자 책임**입니다.
- 기본 설정(security: "deny")을 변경할 경우 각별히 주의하세요.

### 웹 스크래핑 및 자동화
- 웹 스크래핑 및 브라우저 자동화는 대상 사이트의 이용약관을 위반할 수 있습니다.
- 사용자는 대상 서비스의 ToS 및 robots.txt를 확인할 책임이 있습니다.
- 자동화로 인한 계정 정지, 법적 조치는 **사용자 책임**입니다.

### API 키 보안
- 모든 API 키는 로컬 컴퓨터에 저장됩니다.
- API 키 유출 방지는 **사용자 책임**입니다.
- config 파일을 타인과 공유하지 마세요.

### 제3자 서비스
- Skills를 통해 연결된 제3자 서비스의 ToS를 준수해야 합니다.
- moldClaw는 제3자 서비스 이용으로 인한 문제에 책임지지 않습니다.
```

---

## 9. 결론

### 현재 상태 평가

| 영역 | 기본 설정 | 사용자 변경 시 |
|------|----------|--------------|
| Exec | 🟢 안전 (deny) | 🔴 위험 (full) |
| Elevated | 🟢 안전 (false) | 🔴 매우 위험 |
| Web Scraping | 🟡 사용자 재량 | 🟡 ToS 확인 필요 |
| Browser | 🟡 사용자 재량 | 🟡 ToS 확인 필요 |
| API 키 | 🟡 평문 저장 | 🟡 보안 주의 |
| Skills | 🟢 공식 API | 🟢 대부분 안전 |

### 최종 판정

**배포 가능 여부: 🟡 조건부 가능**

**필수 조건:**
1. Exec "full" 선택 시 경고 모달
2. Elevated 활성화 시 경고 모달 + 동의 체크박스
3. 전체 면책 조항 앱 내 표시

기본 설정은 안전하지만, 사용자가 위험한 설정으로 변경할 경우에 대한 **명확한 경고와 면책**이 필요합니다.
