# moldClaw 보안 감사 보고서

> 작성일: 2026-02-23
> 검사 대상: moldClaw v0.5.2
> 범위: 메신저 설정의 법적/보안 리스크

---

## 🚨 심각 (P0) - 즉시 수정 필요

### 1. MessengerSettings에서 `groupPolicy: 'open'` 하드코딩

**위치:**
- `MessengerSettings.tsx:225` (Slack modal)
- `MessengerSettings.tsx:419` (Google Chat modal)
- `MessengerSettings.tsx:588` (Mattermost modal)
- `MessengerSettings.tsx:784` (Default messenger modal)

**코드:**
```typescript
await invoke('update_messenger_config', {
  channel: 'slack',
  token: botToken,
  dmPolicy: dmPolicy,
  allowFrom: allowFrom,
  groupPolicy: 'open',  // ← 하드코딩!
  requireMention: true,
});
```

**문제점:**
1. **사용자 선택권 없음**: Settings에서 메신저 설정 시 `groupPolicy`를 선택할 UI가 없음
2. **안전한 기본값 무시**: `defaultMessengerConfig.groupPolicy: 'allowlist'`가 무시됨
3. **온보딩 설정 덮어씀**: 온보딩에서 `allowlist`로 설정해도, Settings에서 수정하면 `open`으로 변경됨
4. **API 비용 리스크**: 모든 그룹 메시지 허용 → 스팸 공격 시 AI API 비용 폭증

**법적 리스크:**
- 사용자 동의 없이 모든 그룹 메시지를 AI에게 전달
- GDPR/개인정보보호법 위반 가능성 (제3자 메시지 처리)
- "사용자가 명시적으로 open을 선택했다"고 주장 불가

**수정 방안:**
```typescript
// 1. 상태 추가
const [groupPolicy, setGroupPolicy] = useState<'open' | 'allowlist' | 'disabled'>('allowlist');

// 2. UI 셀렉터 추가
<select value={groupPolicy} onChange={(e) => setGroupPolicy(...)}>
  <option value="allowlist">허용 목록만</option>
  <option value="open">모두 허용 ⚠️</option>
  <option value="disabled">비활성화</option>
</select>

// 3. invoke에 상태값 사용
groupPolicy: groupPolicy,  // 'open' 대신
```

---

## ✅ 정상 (안전한 설정)

### 1. DM Policy 기본값
```typescript
defaultMessengerConfig.dmPolicy: 'pairing'  // ✅ 안전
```
- 새 사용자는 페어링 코드 승인 필요
- 무단 접근 차단됨

### 2. DM Policy UI 경고
```tsx
<option value="open">모두 허용 ⚠️</option>

{dmPolicy === 'open' && (
  <div className="text-xs bg-forge-amber/10 border border-forge-amber/30 p-3 rounded-lg">
    <p className="text-forge-amber font-medium mb-1">⚠️ 보안 경고</p>
    <p>인터넷의 모든 사람이 이 봇에게 메시지를 보낼 수 있습니다...</p>
  </div>
)}
```
✅ 사용자에게 위험 고지함

### 3. Require Mention 기본값
```typescript
defaultMessengerConfig.requireMention: true  // ✅ 안전
```
- 그룹에서 봇 멘션 없으면 무시
- 불필요한 API 호출 방지

### 4. allowFrom 계산 함수
```typescript
const computeAllowFrom = (policy, allowListInput) => {
  if (policy === 'open') return ['*'];  // ✅ OpenClaw 스키마 준수
  if (policy === 'allowlist') return allowListInput.split('\n')...;
  return [];  // pairing
};
```
✅ 스키마 규칙 준수 (`open` → `["*"]`)

---

## ⚠️ 경고 (개선 권장)

### 1. 온보딩 vs Settings 불일치

| 기능 | 온보딩 | Settings |
|------|--------|----------|
| `dmPolicy` 선택 | ✅ | ✅ |
| `groupPolicy` 선택 | ✅ (Connect.tsx) | ❌ (하드코딩) |
| `requireMention` 선택 | ✅ | ❌ (하드코딩 true) |
| `allowFrom` 입력 | ✅ | ✅ |
| `groupAllowFrom` 입력 | ✅ (Connect.tsx) | ❌ (누락) |

**권장:** Settings 모달에서도 온보딩과 동일한 옵션 제공

### 2. 연결 해제 시 설정 완전 삭제

```typescript
// confirmDisconnect()에서
groupPolicy: 'disabled',  // ✅ OK - 비활성화
```

---

## 📋 수정 체크리스트

### 필수 (배포 전) - ✅ 완료
- [x] `MessengerSettings.tsx` - 모든 모달에서 `groupPolicy` 상태 추가
- [x] `MessengerSettings.tsx` - 모든 모달에 groupPolicy 셀렉터 UI 추가
- [x] `MessengerSettings.tsx` - invoke에서 하드코딩 `'open'` 제거
- [x] `GroupPolicyHelp` 툴팁 컴포넌트 추가
- [x] groupPolicy === 'open' 선택 시 경고 UI 추가

### 수정된 모달 (4개)
- SlackModal (line 213): `groupPolicy` state + UI
- GoogleChatModal (line 415): `groupPolicy` state + UI
- MattermostModal (line 627): `groupPolicy` state + UI
- DefaultMessengerModal (line 851): `groupPolicy` state + UI

### 권장 (QA 강화)
- [ ] `requireMention` 토글 UI 추가
- [ ] `groupAllowFrom` 입력 필드 추가 (groupPolicy: allowlist 시)
- [ ] 설정 변경 전 기존 config 읽어서 기본값 유지

---

## 요약

| 심각도 | 건수 | 설명 |
|--------|------|------|
| 🚨 P0 | 1 | groupPolicy 하드코딩 `'open'` |
| ⚠️ P2 | 2 | requireMention/groupAllowFrom UI 누락 |
| ✅ OK | 4 | dmPolicy, 경고 UI, allowFrom 계산 등 |

**결론:** `groupPolicy: 'open'` 하드코딩은 **배포 전 필수 수정** 사항입니다.
