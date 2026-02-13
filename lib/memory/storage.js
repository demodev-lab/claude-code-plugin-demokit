/**
 * Memory Storage
 * .demodev-memory.json 파일 기반 프로젝트 메모리 저장소
 */
const path = require('path');
const { io } = require('../core');

const MEMORY_FILE = '.demodev-memory.json';
const SCHEMA_VERSION = '1.0';

/**
 * 초기 메모리 스키마
 */
function createEmptyMemory() {
  return {
    version: SCHEMA_VERSION,
    project: {
      domains: {},
      optimizations: {
        n1Resolved: [],
        indexesAdded: [],
      },
      apiEndpoints: {},
      migrations: {},
      securityConfig: {},
    },
    user: {
      preferences: {},
    },
  };
}

/**
 * 메모리 파일 경로
 */
function memoryFilePath(projectRoot) {
  return path.join(projectRoot, MEMORY_FILE);
}

/**
 * 메모리 로드
 */
function loadMemory(projectRoot) {
  const filePath = memoryFilePath(projectRoot);
  const data = io.readJson(filePath);

  if (!data) return createEmptyMemory();

  // 버전 마이그레이션 (향후 확장용)
  if (data.version !== SCHEMA_VERSION) {
    return { ...createEmptyMemory(), ...data, version: SCHEMA_VERSION };
  }

  return data;
}

/**
 * 메모리 저장
 */
function saveMemory(projectRoot, data) {
  const filePath = memoryFilePath(projectRoot);
  io.writeJson(filePath, { ...data, version: SCHEMA_VERSION });
}

/**
 * 메모리 요약 문자열 생성 (세션 시작 시 systemMessage용)
 */
function summarizeMemory(memory) {
  const parts = [];
  const project = memory.project || {};

  // 도메인 요약
  const domains = Object.keys(project.domains || {});
  if (domains.length > 0) {
    parts.push(`도메인: ${domains.join(', ')} (${domains.length}개)`);
  }

  // API 엔드포인트 수
  const apiCount = Object.keys(project.apiEndpoints || {}).length;
  if (apiCount > 0) {
    parts.push(`API 엔드포인트: ${apiCount}개`);
  }

  // 최적화 이력
  const n1Count = (project.optimizations?.n1Resolved || []).length;
  const idxCount = (project.optimizations?.indexesAdded || []).length;
  if (n1Count > 0 || idxCount > 0) {
    parts.push(`최적화: N+1 해결 ${n1Count}건, 인덱스 ${idxCount}건`);
  }

  // 보안 설정
  if (project.securityConfig?.type) {
    parts.push(`보안: ${project.securityConfig.type}`);
  }

  if (parts.length === 0) return null;
  return parts.join(' | ');
}

module.exports = { loadMemory, saveMemory, summarizeMemory, memoryFilePath, createEmptyMemory };
