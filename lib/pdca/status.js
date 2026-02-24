/**
 * PDCA 상태 관리
 * .pdca/ 디렉토리에 feature별 상태 파일 관리
 */
const fs = require('fs');
const path = require('path');
const { io, debug: log } = require('../core');

const PDCA_DIR = '.pdca';
const PHASE_ORDER = ['plan', 'design', 'do', 'analyze', 'iterate', 'report'];
const featuresListCache = new Map();

/**
 * phases 객체에서 현재 phase 추론 (currentPhase 필드가 없는 경우)
 * 마지막으로 완료된 phase의 다음 phase를 반환
 */
function deriveCurrentPhase(phases) {
  if (!phases || typeof phases !== 'object') return 'plan';
  let lastCompleted = -1;
  for (let i = 0; i < PHASE_ORDER.length; i++) {
    if (phases[PHASE_ORDER[i]]?.status === 'completed') {
      lastCompleted = i;
    }
  }
  if (lastCompleted === -1) return 'plan';
  if (lastCompleted >= PHASE_ORDER.length - 1) return 'report';
  return PHASE_ORDER[lastCompleted + 1];
}

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
  const content = JSON.stringify({
    ...status,
    updatedAt: new Date().toISOString(),
  }, null, 2) + '\n';
  // atomic write: tmp → rename
  io.ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.tmp`;
  io.writeFile(tmpPath, content);
  try {
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    throw err;
  }
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
  const filePath = statusFilePath(projectRoot, featureName);
  return io.withFileLock(filePath, () => {
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
  });
}

/**
 * 현재 활성 feature 목록
 */
function listFeatures(projectRoot) {
  const pdcaDir = path.join(projectRoot, PDCA_DIR);
  if (!io.fileExists(pdcaDir)) return [];

  let files = [];
  try {
    const entries = fs.readdirSync(pdcaDir, { withFileTypes: true });
    files = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.status.json'))
      .map(entry => path.join(pdcaDir, entry.name));
  } catch {
    return [];
  }

  const cacheKey = path.resolve(projectRoot);
  const previous = featuresListCache.get(cacheKey);
  const previousByPath = previous?.byPath || new Map();
  const nextByPath = new Map();
  const features = [];

  for (const filePath of files) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    const prev = previousByPath.get(filePath);
    const signature = `${stat.size}|${stat.mtimeNs || stat.mtimeMs}`;
    if (prev && prev.signature === signature) {
      features.push(prev.value);
      nextByPath.set(filePath, { signature, value: prev.value });
      continue;
    }

    const data = io.readJson(filePath);
    if (!data) continue;

    const value = {
      feature: data.feature || path.basename(filePath).replace('.status.json', ''),
      currentPhase: data.currentPhase || deriveCurrentPhase(data.phases),
      updatedAt: data.updatedAt,
    };
    features.push(value);
    nextByPath.set(filePath, { signature, value });
  }

  featuresListCache.set(cacheKey, { byPath: nextByPath });
  return features;
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
  const filePath = multiFeaturePath(projectRoot);
  return io.withFileLock(filePath, () => {
    const state = loadMultiFeatureState(projectRoot);
    if (!state.activeFeatures.includes(feature)) {
      state.activeFeatures.push(feature);
    }
    if (setAsPrimary || !state.primaryFeature) {
      state.primaryFeature = feature;
    }
    saveMultiFeatureState(projectRoot, state);
    return state;
  });
}

/**
 * 활성 기능 제거
 */
function removeActiveFeature(projectRoot, feature) {
  const filePath = multiFeaturePath(projectRoot);
  return io.withFileLock(filePath, () => {
    const state = loadMultiFeatureState(projectRoot);
    state.activeFeatures = state.activeFeatures.filter(f => f !== feature);
    if (state.primaryFeature === feature) {
      state.primaryFeature = state.activeFeatures[0] || null;
    }
    saveMultiFeatureState(projectRoot, state);
    return state;
  });
}

/**
 * 주요 기능 전환
 */
function switchFeatureContext(projectRoot, feature) {
  const filePath = multiFeaturePath(projectRoot);
  return io.withFileLock(filePath, () => {
    const state = loadMultiFeatureState(projectRoot);
    if (!state.activeFeatures.includes(feature)) {
      state.activeFeatures.push(feature);
    }
    state.primaryFeature = feature;
    saveMultiFeatureState(projectRoot, state);
    return true;
  });
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
  PHASE_ORDER,
  loadStatus, saveStatus, createStatus, updatePhaseStatus, listFeatures, statusFilePath,
  loadMultiFeatureState, saveMultiFeatureState,
  addActiveFeature, removeActiveFeature, switchFeatureContext,
  getActiveFeatures, getPrimaryFeature, listFeaturesExtended,
};
