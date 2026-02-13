/**
 * Memory Scope
 * project / user / session 3단계 스코프 메모리 관리
 */
const path = require('path');
const os = require('os');
const { io } = require('../core');
const storage = require('./storage');

const USER_MEMORY_DIR = '.demodev';
const USER_MEMORY_FILE = 'user-memory.json';

/**
 * 프로젝트 메모리 (projectRoot/.demodev-memory.json)
 */
function getProjectMemory(projectRoot) {
  return storage.loadMemory(projectRoot);
}

/**
 * 사용자 메모리 (~/.demodev/user-memory.json)
 */
function getUserMemory() {
  const filePath = path.join(os.homedir(), USER_MEMORY_DIR, USER_MEMORY_FILE);
  const data = io.readJson(filePath);
  return data || { preferences: {} };
}

/**
 * 사용자 메모리 저장
 */
function saveUserMemory(data) {
  const filePath = path.join(os.homedir(), USER_MEMORY_DIR, USER_MEMORY_FILE);
  io.writeJson(filePath, data);
}

/**
 * 세션 메모리 (런타임 전용, 파일 저장 없음)
 */
const _sessionMemory = {};

function getSessionMemory(projectRoot) {
  if (!_sessionMemory[projectRoot]) {
    _sessionMemory[projectRoot] = {};
  }
  return _sessionMemory[projectRoot];
}

function setSessionMemory(projectRoot, data) {
  _sessionMemory[projectRoot] = data;
}

/**
 * dot-path 기반 메모리 업데이트
 * updateMemory(projectRoot, 'project.domains.user.entities', val => [...(val || []), 'User'])
 */
function updateMemory(projectRoot, dotPath, updater) {
  const memory = storage.loadMemory(projectRoot);
  const keys = dotPath.split('.');
  let current = memory;

  // 마지막 키 전까지 탐색 (중간 객체 자동 생성)
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] == null || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = updater(current[lastKey]);

  storage.saveMemory(projectRoot, memory);
  return memory;
}

module.exports = {
  getProjectMemory,
  getUserMemory,
  saveUserMemory,
  getSessionMemory,
  setSessionMemory,
  updateMemory,
};
