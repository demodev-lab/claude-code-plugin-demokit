/**
 * 플랫폼 감지 유틸리티
 */
const os = require('os');
const path = require('path');
const fs = require('fs');

const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

/**
 * 플랫폼에 맞는 경로 구분자 반환
 */
function pathSep() {
  return path.sep;
}

/**
 * 경로를 플랫폼에 맞게 정규화
 */
function normalizePath(p) {
  return path.normalize(p).replace(/\\/g, '/');
}

/**
 * 프로젝트 루트 디렉토리 감지
 * build.gradle 또는 pom.xml 기준 (프로세스 내 캐시)
 */
const _rootCache = new Map();

function findProjectRoot(startDir) {
  let dir = startDir || process.cwd();
  if (_rootCache.has(dir)) return _rootCache.get(dir);

  const original = dir;
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (fs.existsSync(path.join(dir, 'build.gradle'))
        || fs.existsSync(path.join(dir, 'build.gradle.kts'))
        || fs.existsSync(path.join(dir, 'pom.xml'))) {
      _rootCache.set(original, dir);
      return dir;
    }
    const parentDir = path.dirname(dir);
    if (parentDir === dir) break;
    dir = parentDir;
  }
  _rootCache.set(original, null);
  return null;
}

module.exports = { isWindows, isMac, isLinux, pathSep, normalizePath, findProjectRoot };
