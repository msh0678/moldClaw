# moldClaw 법적 리스크 분석 보고서

> 작성일: 2026-02-24
> 검토 대상: moldClaw v0.5.3+ 배포
> 기준 문서: MESSENGER_REQUIRED_FIELDS.md, SECURITY_AUDIT_2026-02-23.md

---

## 📋 요약

| 분류 | 리스크 레벨 | 상태 | 조치 필요 |
|------|------------|------|----------|
| 개인정보 보호법 | 🟡 중간 | 부분 대응 | 동의 UI 보강 |
| 메신저 ToS | 🔴 높음 | WhatsApp 위험 | 경고 고지 필수 |
| API 비용 책임 | 🟢 낮음 | 대응 완료 | 면책 조항 추가 |
| 데이터 보안 | 🟢 낮음 | 대응 완료 | - |
| 라이선스 | 🟢 낮음 | 확인 필요 | OpenClaw 라이선스 명시 |

---

## 1. 🔐 개인정보 보호법 (GDPR / 한국 개인정보보호법)

### 1.1 제3자 메시지 처리 문제

**위험 시나리오:**
```
사용자 A가 그룹에서 moldClaw 봇 활성화
→ 그룹 멤버 B, C의 메시지가 AI에게 전달됨
→ B, C는 자신의 메시지가 AI에게 전달되는지 모름
→ GDPR 제6조 (처리의 적법성) 위반 가능
```

**현재 대응 상태:**
| 항목 | 상태 | 설명 |
|------|------|------|
| `groupPolicy: allowlist` 기본값 | ✅ 완료 | 명시적 그룹 등록 필요 |
| `requireMention: true` | ✅ 완료 | 멘션 시에만 응답 |
| 그룹 참여자 동의 고지 | ❌ 미완 | UI에 고지문 없음 |

**권장 조치:**
```markdown
## 그룹 사용 시 주의사항

⚠️ **법적 고지**: 그룹 채팅에서 AI 봇을 사용할 경우, 해당 그룹의 모든 멤버에게 
AI가 메시지를 읽을 수 있음을 알리는 것이 좋습니다.

- GDPR (EU) 및 개인정보보호법 (한국)에 따라 개인 데이터 처리에는 
  정보 주체의 동의 또는 적법한 근거가 필요합니다.
- 그룹 관리자로서 봇 활성화 전 멤버들에게 고지하는 것을 권장합니다.
```

### 1.2 개인정보 수집 항목

**moldClaw가 처리하는 데이터:**

| 데이터 | 저장 위치 | 용도 | 민감도 |
|--------|----------|------|--------|
| Bot Token | `~/.openclaw/openclaw.json` | 메신저 인증 | 🔴 높음 |
| 사용자 ID (allowFrom) | config 파일 | 접근 제어 | 🟡 중간 |
| 그룹 ID (groupAllowFrom) | config 파일 | 접근 제어 | 🟢 낮음 |
| 채팅 내용 | 메모리 (일시적) | AI 처리 | 🔴 높음 |
| AI API 키 | config 파일 | AI 서비스 | 🔴 높음 |

**현재 보호 조치:**
- ✅ 토큰은 로컬 파일에만 저장 (서버 전송 없음)
- ✅ `type="password"` 입력 필드 사용
- ❌ config 파일 암호화 없음 (평문 JSON)

**권장 조치:**
1. 개인정보처리방침 문서 작성 및 링크 제공
2. 첫 실행 시 데이터 처리 동의 체크박스 추가

---

## 2. 📱 메신저 플랫폼 ToS (이용약관) 위반

### 2.1 WhatsApp — 🔴 높은 위험

**문제점:**
- WhatsApp은 **비공식 API 사용을 명시적으로 금지**
- OpenClaw의 WhatsApp 연동은 `whatsmeow` 라이브러리 사용 (비공식)
- Meta(WhatsApp)는 비공식 클라이언트 사용 시 **계정 차단 가능**

**WhatsApp ToS 위반 조항:**
> "You may not access, reproduce, download, distribute, transmit, broadcast, display, sell, license, alter, modify or otherwise use any portion of our Services except... through our interfaces and according to our Documentation."

**법적 리스크:**
| 리스크 | 가능성 | 영향 |
|--------|--------|------|
| 계정 영구 차단 | 높음 | 사용자 피해 |
| Meta 법적 조치 | 낮음 | 앱 배포 중단 요청 |
| 사용자 책임 전가 | - | 면책 조항 필요 |

**필수 조치:**
```tsx
// WhatsApp 연결 모달에 추가 필요
<div className="bg-forge-error/10 border border-forge-error/30 p-4 rounded-lg">
  <h4 className="text-forge-error font-bold">⚠️ 중요 경고</h4>
  <p className="text-sm text-forge-muted mt-2">
    WhatsApp 연동은 <strong>비공식 API</strong>를 사용합니다.
    Meta(WhatsApp)의 이용약관에 따라 계정이 <strong>차단될 수 있습니다</strong>.
  </p>
  <p className="text-sm text-forge-muted mt-2">
    moldClaw 개발자는 WhatsApp 사용으로 인한 계정 차단에 대해 
    <strong>책임지지 않습니다</strong>.
  </p>
  <label className="flex items-center gap-2 mt-3">
    <input type="checkbox" required />
    <span className="text-sm">위험을 이해했으며, 본인 책임하에 사용합니다.</span>
  </label>
</div>
```

### 2.2 Telegram — 🟢 낮은 위험

**상태:** 안전
- Telegram Bot API는 **공식 지원**
- BotFather를 통한 봇 생성은 정상적인 사용
- 자동화/봇 사용 권장됨

**ToS 확인:** ✅ 위반 없음

### 2.3 Discord — 🟡 주의 필요

**상태:** 대체로 안전, 일부 주의

**Discord ToS 관련:**
- Bot 사용은 공식 지원됨
- 단, **자동화된 사용자 계정**은 금지 (Self-bot)
- moldClaw는 Bot 계정 사용 → ✅ OK

**주의사항:**
- Rate Limit 준수 필요
- 스팸성 동작 금지
- 서버 관리자 권한으로만 봇 추가

### 2.4 Slack — 🟢 낮은 위험

**상태:** 안전
- Slack App API는 공식 지원
- Socket Mode는 권장 방식
- ✅ ToS 위반 없음

### 2.5 Google Chat — 🟢 낮은 위험

**상태:** 안전
- Service Account 방식은 공식 지원
- Google Workspace 관리자 승인 필요
- ✅ ToS 위반 없음

### 2.6 Mattermost — 🟢 낮은 위험

**상태:** 안전
- 오픈소스 플랫폼
- Bot 계정 공식 지원
- ✅ ToS 위반 없음

---

## 3. 💰 API 비용 관련 책임

### 3.1 비용 폭증 시나리오

**위험 케이스:**
```
1. 사용자가 dmPolicy: "open" 설정
2. 스팸 봇이 대량 메시지 전송
3. AI API (Claude/GPT) 호출 폭증
4. 예상치 못한 $1000+ 청구서
```

**현재 대응 상태:**
| 항목 | 상태 | 효과 |
|------|------|------|
| `dmPolicy: open` 경고 UI | ✅ 완료 | 비용 경고 표시 |
| `groupPolicy: allowlist` 기본값 | ✅ 완료 | 무분별한 그룹 차단 |
| Rate Limit 설정 UI | ❌ 미완 | 비용 상한 없음 |

**권장 조치:**
1. 첫 실행 시 **비용 경고 모달** 표시
2. 월간 사용량 제한 설정 옵션 추가 (OpenClaw 지원 시)
3. **면책 조항** 앱 내 명시

**면책 조항 예시:**
```markdown
## 비용 면책 조항

moldClaw는 AI API 사용에 따른 비용을 **직접 청구하지 않습니다**.
모든 AI API 비용은 사용자가 직접 설정한 API 키의 제공업체(Anthropic, OpenAI 등)에서 청구됩니다.

**사용자 책임:**
- API 키는 사용자 본인이 직접 관리합니다.
- "모두 허용" 설정 사용 시 예상치 못한 비용이 발생할 수 있습니다.
- moldClaw 개발자는 API 사용량 및 비용에 대해 책임지지 않습니다.

**권장 사항:**
- Anthropic/OpenAI 대시보드에서 월간 사용량 제한을 설정하세요.
- "페어링" 또는 "허용 목록" 정책을 사용하세요.
```

---

## 4. 🔒 데이터 보안

### 4.1 토큰/키 저장

**현재 방식:**
```
~/.openclaw/openclaw.json (평문 JSON)
├── channels.telegram.botToken: "123456:ABC..."
├── channels.discord.token: "MTIzNDU2..."
└── providers.anthropic.apiKey: "sk-ant-..."
```

**위험:**
- 파일 시스템 접근 권한 있으면 토큰 탈취 가능
- 백업/공유 시 노출 위험

**현재 대응:**
| 항목 | 상태 |
|------|------|
| OS 파일 권한 (600) | ❓ OpenClaw 의존 |
| UI에서 password 마스킹 | ✅ 완료 |
| 네트워크 전송 | ✅ 없음 (로컬 only) |

**권장 조치:**
- 민감 정보 취급 가이드 문서화
- 운영체제 키체인/Credential Manager 연동 고려 (장기)

### 4.2 네트워크 보안

**데이터 흐름:**
```
[User] → [Messenger] → [moldClaw/OpenClaw] → [AI Provider]
                              ↓
                       [Local Files Only]
```

**분석:**
- moldClaw 자체 서버 **없음** → 데이터 수집 없음
- AI API 호출은 **HTTPS** (TLS 암호화)
- 메신저 연결도 각 플랫폼의 **암호화 채널** 사용

**결론:** 🟢 네트워크 보안 적정

---

## 5. 📜 라이선스 및 법적 고지

### 5.1 OpenClaw 라이선스

**확인 필요:**
- OpenClaw 라이선스 확인 및 명시
- 파생 작업물 배포 조건 확인

### 5.2 moldClaw 자체 라이선스

**권장:**
```markdown
MIT License (또는 선택한 라이선스)

Copyright (c) 2026 [권리자]

이 소프트웨어는 "있는 그대로" 제공되며, 명시적이든 묵시적이든 
어떠한 종류의 보증도 없습니다. 저작자는 이 소프트웨어의 사용으로 
발생하는 어떠한 손해에 대해서도 책임지지 않습니다.
```

### 5.3 제3자 라이브러리

**주요 의존성:**
- Tauri (MIT/Apache 2.0) ✅
- React (MIT) ✅
- OpenClaw (확인 필요)
- whatsmeow (MIT) — 단, WhatsApp ToS 주의

---

## 6. 📋 법적 리스크 대응 체크리스트

### 🔴 필수 (배포 전)

- [ ] **WhatsApp 경고 모달** — ToS 위반 + 계정 차단 경고 + 동의 체크박스
- [ ] **비용 면책 조항** — Settings 또는 About 페이지에 명시
- [ ] **라이선스 파일** — LICENSE 파일 + About 페이지 링크
- [ ] **개인정보 처리 고지** — 어떤 데이터가 어디에 저장되는지 명시

### 🟡 권장 (배포 후 보완)

- [ ] **그룹 사용 경고** — groupPolicy UI에 제3자 데이터 처리 고지
- [ ] **개인정보처리방침** — 별도 문서 작성
- [ ] **GDPR 대응** — EU 사용자 대상 시 상세 동의 절차
- [ ] **Rate Limit 안내** — 비용 절감 가이드

### 🟢 선택 (장기 개선)

- [ ] **토큰 암호화** — OS 키체인 연동
- [ ] **사용량 모니터링** — 실시간 API 비용 표시
- [ ] **법률 자문** — 정식 배포 전 전문가 검토

---

## 7. 권장 법적 고지문 (앱 내 삽입용)

### About/Settings 페이지용

```markdown
## 법적 고지

### 면책 조항
moldClaw는 OpenClaw를 위한 데스크톱 인터페이스입니다.

- **API 비용**: AI API 사용에 따른 비용은 전적으로 사용자 책임입니다.
- **계정 제재**: 일부 메신저(특히 WhatsApp)는 비공식 API 사용 시 계정을 
  제한할 수 있습니다. moldClaw 개발자는 이에 대해 책임지지 않습니다.
- **데이터 처리**: 모든 데이터는 사용자의 로컬 컴퓨터에서만 처리됩니다.

### 개인정보
- 저장 데이터: API 키, 봇 토큰, 접근 제어 목록
- 저장 위치: ~/.openclaw/openclaw.json (로컬 파일)
- 서버 전송: 없음 (AI API 제공업체 직접 연결)

### 오픈소스
이 소프트웨어는 오픈소스 라이브러리를 사용합니다.
자세한 라이선스는 [LICENSE](./LICENSE) 파일을 참조하세요.
```

---

## 8. 결론

### 즉시 조치 필요
1. **WhatsApp 경고 모달** + 동의 체크박스
2. **면책 조항** 앱 내 표시
3. **LICENSE 파일** 추가

### 현재 잘 되어 있는 점
- ✅ `groupPolicy: allowlist` 기본값 (개인정보 보호)
- ✅ `dmPolicy: open` 경고 UI (비용 경고)
- ✅ 로컬 전용 데이터 저장 (서버 없음)
- ✅ HTTPS 통신 (AI API)

### 전체 리스크 평가
**배포 가능 여부: 🟡 조건부 가능**

WhatsApp 경고 + 면책 조항만 추가하면 법적 리스크를 상당 부분 완화할 수 있습니다.
