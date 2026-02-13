# Git 없이 moldClaw/OpenClaw 설치하기

## 문제
Windows 사용자가 Git이 설치되지 않은 환경에서 `npm install` 시 에러 발생:
```
npm error code ENOENT
npm error path git
```

## 원인
- 일부 npm 패키지가 Git 저장소를 직접 참조
- Windows에 Git이 기본 설치되지 않음
- 비개발자 사용자는 Git을 모를 수 있음

## 해결 방법

### 방법 1: npm 옵션으로 우회 (권장)
```bash
npm install --no-optional --prefer-offline --registry https://registry.npmjs.org
```

### 방법 2: OpenClaw 수동 다운로드
1. https://www.npmjs.com/package/openclaw 접속
2. 우측 "Download" 클릭
3. tarball 다운로드
4. 압축 해제 후 설치

### 방법 3: Git Portable 사용 (개발자용)
1. https://git-scm.com/download/win 에서 "Portable" 버전 다운로드
2. 압축 해제
3. PATH에 추가하지 않고 사용:
   ```bash
   set PATH=%PATH%;C:\path\to\PortableGit\bin
   npm install
   ```

### 방법 4: moldClaw 개선 (구현 예정)
- Git 의존성 완전 제거
- OpenClaw를 번들로 포함
- 또는 tarball URL로 직접 설치

## Q&A

**Q: OpenClaw 설치에 Git이 필수인가?**
A: 아니요. OpenClaw 자체는 Git이 필요 없지만, npm이 의존성을 해결하는 과정에서 Git을 요구할 수 있습니다.

**Q: moldClaw의 목적과 맞는가?**
A: moldClaw는 비개발자를 위한 GUI 도구이므로 Git 없이도 설치되어야 합니다. 이는 개선이 필요한 부분입니다.