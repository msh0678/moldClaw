# OpenClaw 설치 감지 로직

## 감지 순서

1. **로컬 설치 확인**
   - Windows: `%LOCALAPPDATA%\Programs\openclaw\node_modules\.bin\openclaw.cmd`
   - macOS: `~/Library/Application Support/openclaw/node_modules/.bin/openclaw`
   - Linux: `~/.local/share/openclaw/node_modules/.bin/openclaw`

2. **시스템 전역 설치 확인**
   - `which openclaw` (Unix) / `where openclaw` (Windows)
   - npm 전역 설치된 경우 감지

3. **버전 확인**
   - `openclaw --version` 실행
   - 정상 응답 시 설치 건너뛰기

## 설치 건너뛰기 조건

```typescript
if (isOpenClawInstalled && versionIsValid) {
  // 설치 건너뛰고 바로 사용
  console.log("기존 OpenClaw 사용:", version);
  return;
}
```

## 재설치가 필요한 경우

1. **버전 불일치**
   - 최소 요구 버전보다 낮은 경우
   - 주요 버전 업데이트가 있는 경우

2. **손상된 설치**
   - 실행파일은 있지만 `--version` 실패
   - 필수 파일 누락

3. **사용자 요청**
   - "재설치" 버튼 제공
   - 설정에서 강제 재설치 옵션

## 장점

- **빠른 시작**: 이미 설치된 경우 즉시 사용
- **시스템 전역 설치 존중**: `npm install -g openclaw` 사용자 지원
- **중복 설치 방지**: 디스크 공간 절약
- **버전 관리**: 필요시에만 업데이트