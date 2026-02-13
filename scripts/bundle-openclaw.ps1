# OpenClaw를 번들에 포함시키기 (Windows)

Write-Host "OpenClaw 번들링 스크립트" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# 디렉토리 생성
$bundleDir = "src-tauri\resources\openclaw-bundle"
if (!(Test-Path $bundleDir)) {
    New-Item -ItemType Directory -Path $bundleDir -Force
}

Set-Location $bundleDir

# OpenClaw 최신 버전 정보 가져오기
Write-Host "OpenClaw 정보 확인 중..." -ForegroundColor Yellow
$npmInfo = npm view openclaw --json | ConvertFrom-Json
$version = $npmInfo.version
$tarballUrl = $npmInfo.dist.tarball

Write-Host "OpenClaw $version 다운로드 중..." -ForegroundColor Yellow

# tarball 다운로드
Invoke-WebRequest -Uri $tarballUrl -OutFile "openclaw.tgz"

Write-Host "✓ OpenClaw 번들 준비 완료" -ForegroundColor Green
Write-Host "이제 Git 없이도 설치 가능합니다!" -ForegroundColor Green