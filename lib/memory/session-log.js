/**
 * Session Log
 * PostToolUse hook에서 도구 사용 관찰을 JSONL로 기록
 *
 * - append-only (read-modify-write 없음, 즉시 반환)
 * - SHA-256 content hash 기반 30초 윈도우 중복 제거
 * - LLM 호출 절대 금지
 *
 * 저장 위치: {projectRoot}/.demodev/sessions/observations.jsonl
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { io } = require('../core');

const DEMODEV_DIR = '.demodev';
const SESSIONS_DIR = 'sessions';
const OBSERVATIONS_FILE = 'observations.jsonl';
const DEDUP_WINDOW_MS = 30000;
const DEDUP_READ_BYTES = 4096;

function getObservationsPath(projectRoot) {
  return path.join(projectRoot, DEMODEV_DIR, SESSIONS_DIR, OBSERVATIONS_FILE);
}

/**
 * 관찰 해시 생성 (type + tool + 핵심 데이터)
 */
function computeHash(entry) {
  const key = [
    entry.type,
    entry.tool,
    entry.file || entry.command || entry.skill || '',
    entry.exitCode != null ? String(entry.exitCode) : '',
  ].join('|');
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

/**
 * 30초 윈도우 내 중복 검사 (파일 끝 4KB만 읽어 O(1))
 */
function isDuplicate(obsPath, hash) {
  try {
    const stat = fs.statSync(obsPath);
    if (stat.size === 0) return false;

    const readSize = Math.min(stat.size, DEDUP_READ_BYTES);
    const buffer = Buffer.alloc(readSize);
    const fd = fs.openSync(obsPath, 'r');
    try {
      fs.readSync(fd, buffer, 0, readSize, stat.size - readSize);
    } finally {
      fs.closeSync(fd);
    }

    const rawLines = buffer.toString('utf-8').split('\n').filter(Boolean);
    // 파일 중간부터 읽은 경우 첫 줄은 잘린 상태 — 스킵
    const lines = readSize < stat.size ? rawLines.slice(1) : rawLines;
    const now = Date.now();

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.hash === hash && (now - new Date(entry.ts).getTime()) < DEDUP_WINDOW_MS) {
          return true;
        }
      } catch { /* malformed line 무시 */ }
    }
  } catch { /* 파일 없음 등 */ }

  return false;
}

/**
 * 관찰 기록 추가 (즉시 반환, LLM 호출 없음)
 * @param {string} projectRoot
 * @param {Object} entry - { type, tool, file?, command?, exitCode?, skill?, target? }
 * @returns {boolean} 추가 성공 여부
 */
function appendObservation(projectRoot, entry) {
  const obsPath = getObservationsPath(projectRoot);
  io.ensureDir(path.dirname(obsPath));

  return io.withFileLock(obsPath, () => {
    const hash = computeHash(entry);
    if (isDuplicate(obsPath, hash)) return false;

    const record = { ...entry, ts: new Date().toISOString(), hash };
    fs.appendFileSync(obsPath, JSON.stringify(record) + '\n', 'utf-8');
    return true;
  });
}

/**
 * 전체 관찰 기록 읽기
 */
function readObservations(projectRoot) {
  const obsPath = getObservationsPath(projectRoot);
  try {
    const content = fs.readFileSync(obsPath, 'utf-8');
    return content.split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

/**
 * 관찰 통계 생성 (stop-handler에서 summary stats용)
 */
function getObservationStats(projectRoot) {
  const observations = readObservations(projectRoot);
  const filesModified = new Set();
  const commandsRun = [];
  const skillsUsed = new Set();

  for (const obs of observations) {
    if (obs.type === 'write' && obs.file) {
      filesModified.add(obs.file);
    }
    if (obs.type === 'bash' && obs.command) {
      commandsRun.push(obs.command);
    }
    if (obs.type === 'skill' && obs.skill) {
      skillsUsed.add(obs.skill);
    }
  }

  return {
    total: observations.length,
    filesModified: [...filesModified],
    commandsRun: commandsRun.slice(-10),
    skillsUsed: [...skillsUsed],
  };
}

/**
 * 관찰 기록 초기화 (새 세션 시작 시)
 */
function clearObservations(projectRoot) {
  const obsPath = getObservationsPath(projectRoot);
  try { fs.unlinkSync(obsPath); } catch { /* ignore */ }
}

module.exports = {
  getObservationsPath,
  appendObservation,
  readObservations,
  getObservationStats,
  clearObservations,
};
