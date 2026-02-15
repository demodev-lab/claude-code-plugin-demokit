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
    phaseHistory: [],
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

  // phase 완료 시 phaseHistory에 기록
  if (updates.status === 'completed') {
    if (!status.phaseHistory) status.phaseHistory = [];
    status.phaseHistory.push({
      phase,
      completedAt: updates.completedAt || new Date().toISOString(),
    });
  }

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

// === Multi-Feature 관리 ===
const MULTI_FEATURE_FILE = '.pdca/multi-feature.json';

function multiFeaturePath(projectRoot) {
  return path.join(projectRoot, MULTI_FEATURE_FILE);
}

/**
 * Multi-Feature 상태 로드
 */
function loadMultiFeatureState(projectRoot) {
  const filePath = multiFeaturePath(projectRoot);
  const data = io.readJson(filePath);
  if (!data) return { activeFeatures: [], primaryFeature: null };
  return {
    activeFeatures: Array.isArray(data.activeFeatures) ? data.activeFeatures : [],
    primaryFeature: data.primaryFeature || null,
  };
}

/**
 * Multi-Feature 상태 저장
 */
function saveMultiFeatureState(projectRoot, state) {
  const filePath = multiFeaturePath(projectRoot);
  io.writeJson(filePath, { ...state, updatedAt: new Date().toISOString() });
}

/**
 * 활성 기능 추가
 */
function addActiveFeature(projectRoot, feature, setAsPrimary = false) {
  const state = loadMultiFeatureState(projectRoot);
  if (!state.activeFeatures.includes(feature)) {
    state.activeFeatures.push(feature);
  }
  if (setAsPrimary || !state.primaryFeature) {
    state.primaryFeature = feature;
  }
  saveMultiFeatureState(projectRoot, state);
  return state;
}

/**
 * 활성 기능 제거
 */
function removeActiveFeature(projectRoot, feature) {
  const state = loadMultiFeatureState(projectRoot);
  state.activeFeatures = state.activeFeatures.filter(f => f !== feature);
  if (state.primaryFeature === feature) {
    state.primaryFeature = state.activeFeatures[0] || null;
  }
  saveMultiFeatureState(projectRoot, state);
  return state;
}

/**
 * 주요 기능 전환
 */
function switchFeatureContext(projectRoot, feature) {
  const state = loadMultiFeatureState(projectRoot);
  if (!state.activeFeatures.includes(feature)) {
    state.activeFeatures.push(feature);
  }
  state.primaryFeature = feature;
  saveMultiFeatureState(projectRoot, state);
  return true;
}

/**
 * 활성 기능 목록 조회
 */
function getActiveFeatures(projectRoot) {
  return loadMultiFeatureState(projectRoot).activeFeatures;
}

/**
 * 주요 기능 조회
 */
function getPrimaryFeature(projectRoot) {
  return loadMultiFeatureState(projectRoot).primaryFeature;
}

/**
 * 확장된 feature 목록 (multi-feature 상태 반영)
 */
function listFeaturesExtended(projectRoot) {
  const features = listFeatures(projectRoot);
  const multiState = loadMultiFeatureState(projectRoot);

  return features.map(f => ({
    ...f,
    isPrimary: f.feature === multiState.primaryFeature,
    isActive: multiState.activeFeatures.includes(f.feature),
  }));
}

module.exports = {
  loadStatus, saveStatus, createStatus, updatePhaseStatus, listFeatures, statusFilePath,
  loadMultiFeatureState, saveMultiFeatureState,
  addActiveFeature, removeActiveFeature, switchFeatureContext,
  getActiveFeatures, getPrimaryFeature, listFeaturesExtended,
};
