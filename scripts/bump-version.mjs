#!/usr/bin/env node
/**
 * 버전 동기화 스크립트
 * 사용법:
 *   npm run version:patch  # 0.1.0 → 0.1.1
 *   npm run version:minor  # 0.1.0 → 0.2.0
 *   npm run version:major  # 0.1.0 → 1.0.0
 *   npm run version:set 0.2.5  # 특정 버전으로 설정
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// 파일 경로
const files = {
  package: join(rootDir, 'package.json'),
  tauri: join(rootDir, 'src-tauri', 'tauri.conf.json'),
  cargo: join(rootDir, 'src-tauri', 'Cargo.toml'),
};

// 현재 버전 읽기
function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync(files.package, 'utf-8'));
  return pkg.version;
}

// 버전 bump
function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      // 직접 버전 지정
      if (/^\d+\.\d+\.\d+$/.test(type)) {
        return type;
      }
      throw new Error(`Invalid version type: ${type}`);
  }
}

// package.json 업데이트
function updatePackageJson(version) {
  const content = JSON.parse(readFileSync(files.package, 'utf-8'));
  content.version = version;
  writeFileSync(files.package, JSON.stringify(content, null, 2) + '\n');
  console.log(`✓ package.json → ${version}`);
}

// tauri.conf.json 업데이트
function updateTauriConf(version) {
  const content = JSON.parse(readFileSync(files.tauri, 'utf-8'));
  content.version = version;
  writeFileSync(files.tauri, JSON.stringify(content, null, 2) + '\n');
  console.log(`✓ tauri.conf.json → ${version}`);
}

// Cargo.toml 업데이트
function updateCargoToml(version) {
  let content = readFileSync(files.cargo, 'utf-8');
  content = content.replace(
    /^version = "[\d.]+"$/m,
    `version = "${version}"`
  );
  writeFileSync(files.cargo, content);
  console.log(`✓ Cargo.toml → ${version}`);
}

// 도움말 출력
function showHelp() {
  const currentVersion = getCurrentVersion();
  console.log(`
📦 moldClaw 버전 관리 스크립트

현재 버전: ${currentVersion}

사용법:
  npm run version:patch     # ${currentVersion} → ${bumpVersion(currentVersion, 'patch')} (버그 수정)
  npm run version:minor     # ${currentVersion} → ${bumpVersion(currentVersion, 'minor')} (새 기능)
  npm run version:major     # ${currentVersion} → ${bumpVersion(currentVersion, 'major')} (큰 변경)
  npm run version:set 1.2.3 # 특정 버전으로 설정

업데이트되는 파일:
  - package.json
  - src-tauri/tauri.conf.json
  - src-tauri/Cargo.toml
`);
}

// 메인
function main() {
  const args = process.argv.slice(2);
  const type = args[0];
  
  // 도움말
  if (!type || type === '--help' || type === '-h') {
    showHelp();
    return;
  }
  
  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, type);
  
  console.log(`\n🔄 버전 업데이트: ${currentVersion} → ${newVersion}\n`);
  
  updatePackageJson(newVersion);
  updateTauriConf(newVersion);
  updateCargoToml(newVersion);
  
  console.log(`\n✅ 완료! 다음 단계:`);
  console.log(`   git add .`);
  console.log(`   git commit -m "v${newVersion}"`);
  console.log(`   git tag v${newVersion}`);
  console.log(`   git push origin main --tags\n`);
}

main();
