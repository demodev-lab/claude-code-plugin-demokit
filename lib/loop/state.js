/**
 * Loop 상태 관리
 * Ralph Wiggum 스타일 자율 반복 루프의 상태를 파일 기반으로 관리
 *
 * 상태 파일 위치: {projectRoot}/.demodev/loop-state.json
 */
const fs = require('fs');
const path = require('path');
const { ensureDir } = require('../core/io');

const LOOP_DIR = '.demodev';
const STATE_FILENAME = 'loop-state.json';

function getStateFilePath(projectRoot) {
  return path.join(projectRoot, LOOP_DIR, STATE_FILENAME);
}

/**
 * 현재 루프 상태 조회
 */
function getState(projectRoot) {
  const filePath = getStateFilePath(projectRoot);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { active: false };
}

/**
 * 루프 시작
 */
function startLoop(projectRoot, { prompt, maxIterations = 10, completionPromise = 'LOOP_DONE' }) {
  // 이전 loop-log.md 아카이브
  try {
    const { writer } = require('../context-store');
    writer.archiveLoopLog(projectRoot);
  } catch { /* context-store 로드 실패 시 무시 */ }

  const filePath = getStateFilePath(projectRoot);
  ensureDir(path.dirname(filePath));
  const state = {
    active: true,
    prompt,
    completionPromise,
    maxIterations,
    currentIteration: 0,
    startedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

/**
 * 반복 횟수 증가
 */
function incrementIteration(projectRoot) {
  const state = getState(projectRoot);
  state.currentIteration = (state.currentIteration || 0) + 1;
  const filePath = getStateFilePath(projectRoot);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

/**
 * 루프 완료 표시
 */
function completeLoop(projectRoot) {
  const state = getState(projectRoot);
  state.active = false;
  state.completedAt = new Date().toISOString();
  const filePath = getStateFilePath(projectRoot);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

/**
 * 루프 취소 (상태 파일 삭제)
 */
function cancelLoop(projectRoot) {
  const filePath = getStateFilePath(projectRoot);
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

/**
 * max iterations 도달 여부
 */
function isMaxReached(state) {
  return state.active && state.currentIteration >= state.maxIterations;
}

module.exports = {
  getState,
  startLoop,
  incrementIteration,
  completeLoop,
  cancelLoop,
  isMaxReached,
  getStateFilePath,
  LOOP_DIR,
};
