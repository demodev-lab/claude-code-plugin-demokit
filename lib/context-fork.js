/**
 * Context Fork Isolation
 * skill/agent 실행 시 격리된 컨텍스트 복사본 생성
 */
const path = require('path');

// Fork 저장소 (in-memory)
const _forks = new Map();
let _forkIdCounter = 0;

/**
 * Fork 생성 (deep clone 격리)
 * @param {string} name - skill/agent 이름
 * @param {Object} options
 * @param {boolean} options.mergeResult - 병합 여부 (기본: true)
 * @param {string[]} options.includeFields - 포함할 필드
 * @returns {{ forkId: string, context: Object }}
 */
function forkContext(name, options = {}) {
  const forkId = `fork-${++_forkIdCounter}-${Date.now()}`;

  // PDCA 상태 deep clone
  let currentStatus = {};
  try {
    const { status: pdcaStatus } = require(path.join(__dirname, 'pdca'));
    const { platform } = require(path.join(__dirname, 'core'));
    const projectRoot = platform.findProjectRoot(process.cwd());
    if (projectRoot) {
      const features = pdcaStatus.listFeatures(projectRoot);
      currentStatus = { features };
    }
  } catch { /* ignore */ }

  const forkedStatus = JSON.parse(JSON.stringify(currentStatus));

  const fork = {
    id: forkId,
    name,
    createdAt: new Date().toISOString(),
    parentState: currentStatus,
    forkedState: forkedStatus,
    mergeResult: options.mergeResult !== false,
    includeFields: options.includeFields || ['features', 'history'],
    merged: false,
  };

  _forks.set(forkId, fork);

  return { forkId, context: forkedStatus };
}

/**
 * Fork 조회
 * @param {string} forkId
 * @returns {Object|null}
 */
function getForkedContext(forkId) {
  const fork = _forks.get(forkId);
  return fork ? fork.forkedState : null;
}

/**
 * Fork 업데이트
 * @param {string} forkId
 * @param {Object} updates
 */
function updateForkedContext(forkId, updates) {
  const fork = _forks.get(forkId);
  if (!fork) return;
  Object.assign(fork.forkedState, updates);
}

/**
 * Fork를 원본에 병합 + conflict 감지
 * @param {string} forkId
 * @param {Object} options
 * @param {string[]} options.fields - 병합 필드
 * @returns {{ success: boolean, merged: Object|null, conflicts: Array, error: string|null }}
 */
function mergeForkedContext(forkId, options = {}) {
  const fork = _forks.get(forkId);

  if (!fork) {
    return { success: false, merged: null, conflicts: [], error: 'Fork not found' };
  }

  if (!fork.mergeResult) {
    _forks.delete(forkId);
    return { success: true, merged: null, conflicts: [], error: null };
  }

  const mergeFields = options.fields || fork.includeFields || ['features', 'history'];
  const conflicts = [];

  // live 상태를 조회하여 fork 시점 스냅샷과 비교
  let liveState = {};
  try {
    const { status: pdcaStatus } = require(path.join(__dirname, 'pdca'));
    const { platform } = require(path.join(__dirname, 'core'));
    const projectRoot = platform.findProjectRoot(process.cwd());
    if (projectRoot) {
      liveState = { features: pdcaStatus.listFeatures(projectRoot) };
    }
  } catch { /* ignore */ }

  const merged = JSON.parse(JSON.stringify(fork.parentState));

  for (const field of mergeFields) {
    if (fork.forkedState[field] === undefined) continue;

    // conflict 감지: fork 시점 스냅샷 vs 현재 live 상태
    const snapshotAtFork = JSON.stringify(fork.parentState[field]);
    const hasFieldInLive = field in liveState;
    const currentLive = hasFieldInLive ? JSON.stringify(liveState[field]) : undefined;
    if (currentLive !== undefined && snapshotAtFork !== currentLive) {
      conflicts.push({
        field,
        parentValue: liveState[field],
        forkValue: fork.forkedState[field],
        resolved: 'fork-wins',
      });
    }

    // Fork wins 전략으로 병합
    if (Array.isArray(fork.forkedState[field])) {
      merged[field] = [
        ...new Set([
          ...(merged[field] || []),
          ...fork.forkedState[field],
        ].map(v => typeof v === 'object' ? JSON.stringify(v) : v)),
      ].map(v => { try { return JSON.parse(v); } catch { return v; } });
    } else if (typeof fork.forkedState[field] === 'object' && fork.forkedState[field] !== null) {
      merged[field] = {
        ...merged[field],
        ...fork.forkedState[field],
      };
    } else {
      merged[field] = fork.forkedState[field];
    }
  }

  fork.merged = true;
  _forks.delete(forkId);

  return { success: true, merged, conflicts, error: null };
}

/**
 * Fork 폐기 (병합 없이)
 * @param {string} forkId
 */
function discardFork(forkId) {
  _forks.delete(forkId);
}

/**
 * 활성 Fork 목록
 * @returns {Array<{ forkId: string, name: string, createdAt: string }>}
 */
function getActiveForks() {
  return Array.from(_forks.entries()).map(([forkId, fork]) => ({
    forkId,
    name: fork.name,
    createdAt: fork.createdAt,
    mergeResult: fork.mergeResult,
  }));
}

/**
 * 전체 Fork 정리
 */
function clearAllForks() {
  _forks.clear();
  _forkIdCounter = 0;
}

module.exports = {
  forkContext,
  getForkedContext,
  updateForkedContext,
  mergeForkedContext,
  discardFork,
  getActiveForks,
  clearAllForks,
};
