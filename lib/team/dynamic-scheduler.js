/**
 * Dynamic Scheduler
 * 실패 task에 대해 policy 기반 동적 agent 재할당 + 구조화된 spawn helper payload 생성
 */
const { LAYER_AGENT_MAP } = require('./wave-dispatcher');
const { LAYER_FILE_PATTERNS } = require('./layer-constants');

const FAILURE_APPROACH_MAP = {
  verify_fail: '테스트 실패 원인 분석 후 수정',
  merge_conflict: 'conflict 해소 후 재병합',
  agent_error: 'agent 실행 환경 점검 후 재시도',
};

/**
 * policy 기반으로 대체 agent를 결정
 * @param {string} layer
 * @param {string} currentAgent
 * @param {{ agentPolicies: Object }} policy
 * @returns {string|null}
 */
function resolveAlternateAgent(layer, currentAgent, policy) {
  if (!layer) return null;

  // policy에서 successRate > 0.5인 후보 (currentAgent 제외)
  const agentPolicies = (policy && policy.agentPolicies) || {};
  const candidates = Object.entries(agentPolicies)
    .filter(([agent, p]) => agent !== currentAgent && p && p.successRate > 0.5)
    .sort((a, b) => b[1].successRate - a[1].successRate);

  if (candidates.length > 0) return candidates[0][0];

  // static fallback
  const staticAgent = LAYER_AGENT_MAP[layer] || null;
  if (staticAgent && staticAgent !== currentAgent) return staticAgent;

  return null;
}

/**
 * 실패 task에 대해 재할당 결정
 * @param {{ layer: string, agentId: string, failureClass: string }} failedTaskInfo
 * @param {{ agentPolicies: Object }} policy
 * @returns {{ layer, originalAgent, reassignedAgent, reassigned: boolean, reason }|null}
 */
function reassignFailedTask(failedTaskInfo, policy) {
  if (!failedTaskInfo) return null;
  const { layer, agentId, failureClass } = failedTaskInfo;
  const alternate = resolveAlternateAgent(layer, agentId, policy);
  if (alternate) {
    return {
      layer,
      originalAgent: agentId,
      reassignedAgent: alternate,
      reassigned: true,
      reason: `policy 기반 재할당 (failureClass: ${failureClass || 'unknown'})`,
    };
  }
  return {
    layer,
    originalAgent: agentId,
    reassignedAgent: agentId,
    reassigned: false,
    reason: '대체 agent 없음',
  };
}

/**
 * 실패 task에 대한 구조화된 spawn helper payload 생성
 * @param {{ layer, errorDetails, worktreePath, branchName, waveIndex, failureClass }} failedTaskContext
 * @param {{ featureSlug?: string }} waveState
 * @returns {Object|null}
 */
function buildSpawnHelperPayload(failedTaskContext, waveState) {
  if (!failedTaskContext || !failedTaskContext.layer) return null;

  const { layer, errorDetails, worktreePath, branchName, waveIndex, failureClass } = failedTaskContext;
  const ownFiles = (LAYER_FILE_PATTERNS[layer] || []).slice();
  const suggestedApproach = FAILURE_APPROACH_MAP[failureClass] || '원인 분석 후 재시도';
  const spawnAgent = LAYER_AGENT_MAP[layer] || null;
  const featureSlug = (waveState && waveState.featureSlug) || null;

  return {
    targetLayer: layer,
    worktreePath: worktreePath || null,
    branchName: branchName || null,
    waveIndex: waveIndex != null ? waveIndex : null,
    failureContext: { errorDetails: errorDetails || null, failureClass: failureClass || null },
    suggestedApproach,
    ownFiles,
    spawnAgent,
    featureSlug,
  };
}

module.exports = { resolveAlternateAgent, reassignFailedTask, buildSpawnHelperPayload };
