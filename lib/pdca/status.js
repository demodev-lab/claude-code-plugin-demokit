/**
 * PDCA 상태 관리
 * .pdca/ 디렉토리에 feature별 상태 파일 관리
 */
const path = require('path');
const { io, debug: log } = require('../core');

const PDCA_DIR = '.pdca';

/**
 * PDCA 상태 파일 경로
 */
function statusFilePath(projectRoot, featureName) {
  return path.join(projectRoot, PDCA_DIR, `${featureName}.status.json`);
}

/**
 * PDCA 상태 로드
 */
function loadStatus(projectRoot, featureName) {
  const filePath = statusFilePath(projectRoot, featureName);
  const data = io.readJson(filePath);
  if (!data) {
    log.debug('pdca-status', `상태 파일 없음: ${featureName}`);
    return null;
  }
  return data;
}

/**
 * PDCA 상태 저장
 */
function saveStatus(projectRoot, featureName, status) {
  const filePath = statusFilePath(projectRoot, featureName);
  io.writeJson(filePath, {
    ...status,
    updatedAt: new Date().toISOString(),
  });
  log.debug('pdca-status', `상태 저장: ${featureName} → ${status.currentPhase}`);
}

/**
 * 새 PDCA 상태 생성
 */
function createStatus(projectRoot, featureName) {
  const status = {
    feature: featureName,
    currentPhase: 'plan',
    phases: {
      plan: { status: 'pending', documentPath: null, startedAt: null, completedAt: null },
      design: { status: 'pending', documentPath: null, startedAt: null, completedAt: null },
      do: { status: 'pending', documentPath: null, startedAt: null, completedAt: null },
      analyze: { status: 'pending', matchRate: null, startedAt: null, completedAt: null },
      iterate: { status: 'pending', iterations: 0, startedAt: null, completedAt: null },
      report: { status: 'pending', documentPath: null, startedAt: null, completedAt: null },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveStatus(projectRoot, featureName, status);
  return status;
}

/**
 * 특정 phase 상태 업데이트
 */
function updatePhaseStatus(projectRoot, featureName, phase, updates) {
  const status = loadStatus(projectRoot, featureName);
  if (!status) {
    log.warn('pdca-status', `상태를 찾을 수 없습니다: ${featureName}`);
    return null;
  }
  if (!status.phases[phase]) {
    log.warn('pdca-status', `유효하지 않은 phase: ${phase}`);
    return null;
  }
  status.phases[phase] = { ...status.phases[phase], ...updates };
  saveStatus(projectRoot, featureName, status);
  return status;
}

/**
 * 현재 활성 feature 목록
 */
function listFeatures(projectRoot) {
  const pdcaDir = path.join(projectRoot, PDCA_DIR);
  if (!io.fileExists(pdcaDir)) return [];
  const files = io.listFiles(pdcaDir, /\.status\.json$/);
  return files
    .map(f => {
      const data = io.readJson(f);
      if (!data) return null;
      return {
        feature: data.feature,
        currentPhase: data.currentPhase,
        updatedAt: data.updatedAt,
      };
    })
    .filter(Boolean);
}

module.exports = { loadStatus, saveStatus, createStatus, updatePhaseStatus, listFeatures, statusFilePath };
