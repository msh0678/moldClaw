#!/bin/bash
# OpenClaw를 번들에 포함시키기

echo "OpenClaw 번들링 스크립트"
echo "========================"

# OpenClaw tarball 다운로드
mkdir -p src-tauri/resources/openclaw-bundle
cd src-tauri/resources/openclaw-bundle

# npm pack으로 OpenClaw 패키지 다운로드
npm pack openclaw

# 또는 직접 다운로드
# curl -L https://registry.npmjs.org/openclaw/-/openclaw-latest.tgz -o openclaw.tgz

echo "OpenClaw 번들 준비 완료"
echo "이제 빌드 시 포함됩니다."