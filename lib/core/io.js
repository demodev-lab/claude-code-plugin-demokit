/**
 * I/O 유틸리티 - 파일/디렉토리 읽기/쓰기 래퍼
 */
const fs = require('fs');
const path = require('path');

/**
 * 파일 읽기 (UTF-8)
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 파일 쓰기 (디렉토리 자동 생성)
 */
function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * JSON 파일 읽기
 */
function readJson(filePath) {
  const content = readFile(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * JSON 파일 쓰기
 */
function writeJson(filePath, data) {
  writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * 디렉토리 존재 확인 및 생성
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 파일 존재 여부
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 디렉토리 내 파일 목록 (재귀)
 */
function listFiles(dirPath, pattern) {
  try {
    const results = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        results.push(...listFiles(fullPath, pattern));
      } else if (!pattern || entry.name.match(pattern)) {
        results.push(fullPath);
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * 파일 단위 락 (O_EXCL 기반, 외부 의존성 없음)
 * Read-Modify-Write 패턴에서 race condition 방지
 */
function withFileLock(filePath, fn, timeoutMs = 5000) {
  const lockPath = `${filePath}.lock`;
  const deadline = Date.now() + timeoutMs;

  // 락 획득 (O_EXCL: 파일 존재하면 실패 — 원자적)
  while (true) {
    try {
      const fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: Date.now() }));
      fs.closeSync(fd);
      break;
    } catch {
      // stale lock 감지 (timeout 이상 된 락 파일 제거)
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > timeoutMs) {
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch { /* lock 파일이 사라졌으면 재시도 */ }

      if (Date.now() >= deadline) {
        throw new Error(`Lock timeout: ${lockPath}`);
      }
      // 50ms 대기 (동기 busy-wait)
      const waitUntil = Date.now() + 50;
      while (Date.now() < waitUntil) { /* spin */ }
    }
  }

  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      throw new Error('withFileLock does not support async callbacks');
    }
    return result;
  } finally {
    try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
  }
}

module.exports = { readFile, writeFile, readJson, writeJson, ensureDir, fileExists, listFiles, withFileLock };
