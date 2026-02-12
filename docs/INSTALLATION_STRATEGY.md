# moldClaw 설치 전략

## 문제: 파일시스템 접근 권한

moldClaw와 OpenClaw의 역할 분리:
- **moldClaw**: GUI 래퍼, 설정 관리
- **OpenClaw**: 실제 AI 엔진, 파일시스템 접근 필요

## 디렉토리 구조

```
사용자 홈 디렉토리/
├── .openclaw/              # OpenClaw 설정 (config, workspace 등)
│   ├── openclaw.json       # 설정 파일
│   └── workspace/          # 작업 디렉토리
├── .openclaw-install/      # OpenClaw 설치 위치
│   └── node_modules/
│       └── .bin/
│           └── openclaw    # 실행파일
└── .local/share/moldClaw/  # moldClaw 앱 데이터
    └── node-portable/      # 번들된 Node.js (필요시)
```

## 왜 분리해야 하나?

1. **샌드박싱 회피**:
   - moldClaw 디렉토리 내부 = 앱 샌드박스 적용 가능
   - 사용자 홈 직속 = 전체 파일시스템 접근

2. **권한 문제**:
   - AppImage/Flatpak 등은 자체 디렉토리만 쓰기 가능
   - OpenClaw는 사용자 문서, 다운로드 등 접근 필요

3. **업데이트 독립성**:
   - moldClaw 업데이트 시 OpenClaw 영향 없음
   - OpenClaw 업데이트는 npm으로 독립적 관리

## 대안 고려사항

### 옵션 1: 현재 방식 (권장)
- 설치: `~/.openclaw-install/`
- 장점: 전체 파일시스템 접근
- 단점: 사용자 홈 디렉토리에 폴더 생성

### 옵션 2: 시스템 전역 설치
- 설치: `npm install -g openclaw`
- 장점: 표준적인 Node.js 방식
- 단점: 관리자 권한 필요, 버전 관리 어려움

### 옵션 3: PATH에 추가
- moldClaw가 설치 후 PATH 환경변수 수정
- 장점: 터미널에서도 openclaw 사용 가능
- 단점: 시스템 설정 변경 필요

## 보안 고려사항

- OpenClaw는 로컬 파일 접근이 핵심 기능
- 샌드박싱하면 기능 제한됨
- 대신 API 키를 사용자가 직접 입력하도록 함