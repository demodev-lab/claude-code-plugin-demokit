/**
 * Orchestrator
 * 팀 오케스트레이션 엔진
 */
const teamConfig = require('./team-config');
const coordinator = require('./coordinator');
const path = require('path');

/**
 * 팀 사용 여부 판단
 */
function shouldUseTeam(taskSize, pdcaActive) {
  if (!teamConfig.isTeamEnabled()) return false;
  // PDCA 활성이거나 feature 규모 이상일 때 팀 모드
  if (pdcaActive) return true;
  if (taskSize === 'feature' || taskSize === 'majorFeature') return true;
  return false;
}

/**
 * 팀 구성 빌드
 */
function buildTeamComposition(phase, level) {
  const team = teamConfig.getPhaseTeam(phase, level);
  if (!team) return null;

  const maxParallel = team.pattern === 'swarm' ? team.members.length : 1;

  return {
    lead: team.lead,
    members: team.members,
    pattern: team.pattern,
    maxParallel,
  };
}

/**
 * 작업 위임 객체 생성
 */
function delegateTask(agentId, taskDesc, context) {
  return {
    agent: agentId,
    task: taskDesc,
    context: context || {},
    timestamp: new Date().toISOString(),
  };
}

/**
 * phase 기반 팀 실행 컨텍스트 생성
 */
function buildTeamContextForPhase(phase, feature, options = {}) {
  const normalizedPhase = typeof phase === 'string' ? phase.toLowerCase() : '';
  const normalizedFeature = feature ? String(feature) : '';
  if (!normalizedPhase || !normalizedFeature) return null;

  const level = options.level || 'Monolith';
  const composition = buildTeamComposition(normalizedPhase, level);
  if (!composition) return null;

  return {
    phase: normalizedPhase,
    feature: normalizedFeature,
    level,
    pattern: composition.pattern,
    lead: composition.lead,
    members: composition.members,
    maxParallel: composition.maxParallel,
    taskQueue: coordinator.buildTaskQueueFromPhase(normalizedFeature, normalizedPhase, composition.members),
  };
}

function getFeatureUpdatedAt(feature) {
  if (!feature || !feature.updatedAt) return 0;
  const parsed = Date.parse(feature.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 현재 feature 내 활성 phase 조회
 */
function getActivePdcaFeature(projectRoot) {
  try {
    const { status: pdcaStatus } = require(path.join(__dirname, '..', 'pdca'));
    const features = pdcaStatus.listFeatures(projectRoot) || [];
    if (!Array.isArray(features)) return null;
    const activeFeatures = features
      .filter(f => f.currentPhase && f.currentPhase !== 'report' && f.feature)
      .sort((a, b) => {
        const byUpdatedAt = getFeatureUpdatedAt(b) - getFeatureUpdatedAt(a);
        if (byUpdatedAt !== 0) return byUpdatedAt;
        return String(a.feature).localeCompare(String(b.feature));
      });

    return activeFeatures[0] || null;
  } catch {
    return null;
  }
}

/**
 * PDCA 상태 기반 팀 큐 동기화
 */
function syncTeamQueueFromPdca(projectRoot, stateWriter) {
  if (!projectRoot || !stateWriter || typeof stateWriter.loadTeamState !== 'function' || typeof stateWriter.syncTaskQueue !== 'function') {
    return { updated: false, reason: 'state_writer_required' };
  }

  let currentState;
  try {
    currentState = stateWriter.loadTeamState(projectRoot);
    if (!currentState || currentState.enabled !== true) {
      return { updated: false, reason: 'team_disabled', state: currentState };
    }

    const activeFeature = getActivePdcaFeature(projectRoot);
    if (!activeFeature?.feature || !activeFeature.currentPhase) {
      return { updated: false, reason: 'no_active_feature', state: currentState };
    }

    const teamContext = buildTeamContextForPhase(activeFeature.currentPhase, activeFeature.feature);
    if (!teamContext || !Array.isArray(teamContext.taskQueue)) {
      return { updated: false, reason: 'team_context_missing', state: currentState };
    }

    const contextChanged =
      currentState.currentPhase !== activeFeature.currentPhase ||
      currentState.feature !== activeFeature.feature ||
      currentState.pattern !== teamContext.pattern;

    if (!contextChanged && Array.isArray(currentState.taskQueue) && currentState.taskQueue.length > 0) {
      return { updated: false, reason: 'no_change', state: currentState };
    }

    const updatedState = stateWriter.syncTaskQueue(projectRoot, {
      feature: activeFeature.feature,
      phase: activeFeature.currentPhase,
      pattern: teamContext.pattern,
      taskQueue: teamContext.taskQueue,
    });

    return {
      updated: true,
      reason: 'synced',
      state: updatedState,
      feature: activeFeature.feature,
      phase: activeFeature.currentPhase,
      pattern: teamContext.pattern,
    };
  } catch (err) {
    return {
      updated: false,
      reason: 'sync_failed',
      state: currentState,
      error: err.message,
    };
  }
}

/**
 * Phase에 맞는 패턴 선택
 */
function selectPattern(phase) {
  const team = teamConfig.getPhaseTeam(phase, 'Monolith');
  return team?.pattern || 'leader';
}

module.exports = {
  shouldUseTeam,
  buildTeamComposition,
  delegateTask,
  buildTeamContextForPhase,
  getActivePdcaFeature,
  syncTeamQueueFromPdca,
  selectPattern,
};
