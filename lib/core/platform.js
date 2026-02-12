/**
 * 플랫폼 감지 유틸리티
 */
const os = require('os');
const path = require('path');

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
 * build.gradle 또는 pom.xml 기준
 */
function findProjectRoot(startDir) {
  let dir = startDir || process.cwd();
  const root = path.parse(dir).root;

  while (dir !== root) {
    const buildGradle = path.join(dir, 'build.gradle');
    const buildGradleKts = path.join(dir, 'build.gradle.kts');
    const pomXml = path.join(dir, 'pom.xml');
    const fs = require('fs');
    if (fs.existsSync(buildGradle) || fs.existsSync(buildGradleKts) || fs.existsSync(pomXml)) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

module.exports = { isWindows, isMac, isLinux, pathSep, normalizePath, findProjectRoot };
