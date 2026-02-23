/**
 * Policy Learner
 * 누적 메트릭 기반 라우팅/할당 최적화 제안
 */
const path = require('path');
const { io } = require('../core');

const POLICY_FILE = 'wave-policy.json';
const MIN_RUNS_FOR_POLICY = 5;
const LOW_SUCCESS_THRESHOLD = 0.7;
const SLOW_LAYER_RATIO = 2.0;

function getPolicyPath(projectRoot) {
  return path.join(projectRoot, '.demodev', POLICY_FILE);
}

function loadPolicy(projectRoot) {
  const filePath = getPolicyPath(projectRoot);
  if (!io.fileExists(filePath)) return { version: '1.0', layerPolicies: {}, agentPolicies: {} };
  try {
    return io.readJson(filePath) || { version: '1.0', layerPolicies: {}, agentPolicies: {} };
  } catch {
    return { version: '1.0', layerPolicies: {}, agentPolicies: {} };
  }
}

function computeLayerPolicy(layerTasks) {
  if (!Array.isArray(layerTasks) || layerTasks.length === 0) return null;
  const completed = layerTasks.filter(t => t.status === 'completed').length;
  const successRate = completed / layerTasks.length;
  const durations = layerTasks
    .filter(t => t.durationMs != null && Number.isFinite(t.durationMs) && t.durationMs >= 0)
    .map(t => t.durationMs);
  const avgDurationMs = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  // 최빈 failureClass
  const failureCounts = {};
  for (const t of layerTasks) {
    if (t.failureClass) {
      failureCounts[t.failureClass] = (failureCounts[t.failureClass] || 0) + 1;
    }
  }
  const failurePattern = Object.keys(failureCounts).length > 0
    ? Object.entries(failureCounts).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  let suggestion = null;
  if (successRate < LOW_SUCCESS_THRESHOLD) {
    suggestion = `${layerTasks[0]?.layer || 'unknown'} layer 성공률 ${(successRate * 100).toFixed(0)}% — 실패 패턴: ${failurePattern || 'N/A'}`;
  }

  return { successRate, avgDurationMs, failurePattern, suggestion };
}

function computeAgentPolicy(agentTasks) {
  if (!Array.isArray(agentTasks) || agentTasks.length === 0) return null;
  const completed = agentTasks.filter(t => t.status === 'completed').length;
  const successRate = completed / agentTasks.length;

  let suggestion = null;
  if (successRate < LOW_SUCCESS_THRESHOLD) {
    suggestion = `${agentTasks[0]?.agent || 'unknown'} agent 성공률 ${(successRate * 100).toFixed(0)}% — 재할당 검토 필요`;
  }

  return { successRate, suggestion };
}

function computeWaveGroupingSuggestion(layerPolicies) {
  if (!layerPolicies || typeof layerPolicies !== 'object') return null;
  const entries = Object.entries(layerPolicies).filter(([, p]) => p && p.avgDurationMs > 0);
  if (entries.length < 2) return null;

  const totalAvg = entries.reduce((sum, [, p]) => sum + p.avgDurationMs, 0) / entries.length;
  const slowLayers = entries.filter(([, p]) => p.avgDurationMs > totalAvg * SLOW_LAYER_RATIO);

  if (slowLayers.length > 0) {
    const names = slowLayers.map(([layer]) => layer).join(', ');
    return `${names} layer가 평균 대비 ${SLOW_LAYER_RATIO}배 이상 느림 — 별도 wave 분리 권장`;
  }
  return null;
}

function rebuildPolicy(projectRoot) {
  const { loadMetrics } = require('./wave-metrics');
  const metrics = loadMetrics(projectRoot);
  if (metrics.runs.length < MIN_RUNS_FOR_POLICY) return;

  // layer별 task 수집
  const layerMap = {};
  const agentMap = {};
  for (const run of metrics.runs) {
    for (const wave of run.waves || []) {
      for (const task of wave.tasks || []) {
        if (task.layer) {
          if (!layerMap[task.layer]) layerMap[task.layer] = [];
          layerMap[task.layer].push(task);
        }
        if (task.agent) {
          if (!agentMap[task.agent]) agentMap[task.agent] = [];
          agentMap[task.agent].push(task);
        }
      }
    }
  }

  const layerPolicies = {};
  for (const [layer, tasks] of Object.entries(layerMap)) {
    const policy = computeLayerPolicy(tasks);
    if (policy) layerPolicies[layer] = policy;
  }

  const agentPolicies = {};
  for (const [agent, tasks] of Object.entries(agentMap)) {
    const policy = computeAgentPolicy(tasks);
    if (policy) agentPolicies[agent] = policy;
  }

  const waveGroupingSuggestion = computeWaveGroupingSuggestion(layerPolicies);

  const policyData = {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    layerPolicies,
    agentPolicies,
    waveGroupingSuggestion,
  };

  const filePath = getPolicyPath(projectRoot);
  io.ensureDir(path.dirname(filePath));
  io.withFileLock(filePath, () => {
    io.writeJson(filePath, policyData);
  });
}

function getPolicySuggestions(projectRoot) {
  const policy = loadPolicy(projectRoot);
  const suggestions = [];

  for (const [layer, p] of Object.entries(policy.layerPolicies || {})) {
    if (p.suggestion) {
      suggestions.push({ type: 'layer', target: layer, message: p.suggestion });
    }
  }

  for (const [agent, p] of Object.entries(policy.agentPolicies || {})) {
    if (p.suggestion) {
      suggestions.push({ type: 'agent', target: agent, message: p.suggestion });
    }
  }

  if (policy.waveGroupingSuggestion) {
    suggestions.push({ type: 'wave_grouping', target: null, message: policy.waveGroupingSuggestion });
  }

  return suggestions;
}

module.exports = {
  MIN_RUNS_FOR_POLICY,
  LOW_SUCCESS_THRESHOLD,
  SLOW_LAYER_RATIO,
  loadPolicy,
  rebuildPolicy,
  getPolicySuggestions,
  computeLayerPolicy,
  computeAgentPolicy,
  computeWaveGroupingSuggestion,
};
