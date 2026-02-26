/**
 * Session State Manager
 * hook 간 session 상태 공유 (파일 기반)
 *
 * 저장 위치: {projectRoot}/.demodev/sessions/current.json
 */
const path = require('path');
const { io } = require('../core');

const DEMODEV_DIR = '.demodev';
const SESSIONS_DIR = 'sessions';
const CURRENT_FILE = 'current.json';

function getSessionsDir(projectRoot) {
  return path.join(projectRoot, DEMODEV_DIR, SESSIONS_DIR);
}

function getCurrentPath(projectRoot) {
  return path.join(getSessionsDir(projectRoot), CURRENT_FILE);
}

function loadCurrentSession(projectRoot) {
  return io.readJson(getCurrentPath(projectRoot));
}

function saveCurrentSession(projectRoot, data) {
  io.ensureDir(getSessionsDir(projectRoot));
  io.writeJson(getCurrentPath(projectRoot), data);
}

/**
 * 세션 초기화 또는 프롬프트 번호 증가
 * 동일 sessionId면 promptNumber 증가, 새 세션이면 초기화
 * withFileLock으로 race condition 방지
 */
function initSession(projectRoot, sessionId) {
  io.ensureDir(getSessionsDir(projectRoot));
  return io.withFileLock(getCurrentPath(projectRoot), () => {
    const existing = loadCurrentSession(projectRoot);
    if (existing && existing.sessionId === sessionId) {
      existing.promptNumber = (existing.promptNumber || 0) + 1;
      saveCurrentSession(projectRoot, existing);
      return existing;
    }

    // 새 세션 시작 시 이전 observations 초기화
    try {
      const sessionLog = require('./session-log');
      sessionLog.clearObservations(projectRoot);
    } catch { /* ignore */ }

    const session = {
      sessionId,
      project: path.basename(projectRoot),
      promptNumber: 1,
      sessionStart: Date.now(),
      observationsCount: 0,
      contextInjected: false,
    };
    saveCurrentSession(projectRoot, session);
    return session;
  });
}

function isContextInjected(projectRoot) {
  const session = loadCurrentSession(projectRoot);
  return session?.contextInjected === true;
}

function markContextInjected(projectRoot) {
  io.withFileLock(getCurrentPath(projectRoot), () => {
    const session = loadCurrentSession(projectRoot);
    if (session) {
      session.contextInjected = true;
      saveCurrentSession(projectRoot, session);
    }
  });
}

/**
 * 원자적 check-and-mark: 컨텍스트 미주입 시 true 반환 + 주입 플래그 설정
 * TOCTOU 방지 — isContextInjected + markContextInjected를 하나의 lock 안에서 수행
 */
function checkAndMarkContextInjected(projectRoot) {
  return io.withFileLock(getCurrentPath(projectRoot), () => {
    const session = loadCurrentSession(projectRoot);
    if (!session || session.contextInjected === true) return false;
    session.contextInjected = true;
    saveCurrentSession(projectRoot, session);
    return true;
  });
}

function clearCurrentSession(projectRoot) {
  try {
    require('fs').unlinkSync(getCurrentPath(projectRoot));
  } catch { /* ignore */ }
}

module.exports = {
  getSessionsDir,
  loadCurrentSession,
  saveCurrentSession,
  initSession,
  isContextInjected,
  markContextInjected,
  checkAndMarkContextInjected,
  clearCurrentSession,
};
