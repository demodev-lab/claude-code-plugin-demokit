/**
 * Wave Metrics
 * wave 완료 시 실패 분류 + 성공률/duration 수집
 */
const path = require('path');
const { io } = require('../core');

const METRICS_FILE = 'wave-metrics.json';
const MAX_RUNS = 50;

const FAILURE_CLASSES = {
  VERIFY_FAIL: 'verify_fail',
  MERGE_CONFLICT: 'merge_conflict',
  AGENT_ERROR: 'agent_error',
};

function getMetricsPath(projectRoot) {
  return path.join(projectRoot, '.demodev', METRICS_FILE);
}

function loadMetrics(projectRoot) {
  const filePath = getMetricsPath(projectRoot);
  if (!io.fileExists(filePath)) return { version: '1.0', runs: [] };
  try {
    return io.readJson(filePath) || { version: '1.0', runs: [] };
  } catch {
    return { version: '1.0', runs: [] };
  }
}

function classifyFailure(task, mergeResult) {
  if (mergeResult && Array.isArray(mergeResult.verifyFailed) && mergeResult.verifyFailed.includes(task.layer)) {
    return FAILURE_CLASSES.VERIFY_FAIL;
  }
  if (mergeResult && mergeResult.conflictCount > 0) {
    const conflictLayers = (mergeResult.results || [])
      .filter(r => r.conflict)
      .map(r => r.layer);
    if (conflictLayers.includes(task.layer)) return FAILURE_CLASSES.MERGE_CONFLICT;
  }
  return FAILURE_CLASSES.AGENT_ERROR;
}

function buildRunMetrics(waveState, options = {}) {
  const completedAt = options.completedAt || new Date().toISOString();
  const mergeResult = options.mergeResult || null;
  const featureSlug = waveState.featureSlug || 'unknown';
  const waves = Array.isArray(waveState.waves) ? waveState.waves : [];

  let totalTasks = 0;
  let completedTasks = 0;
  let failedTasks = 0;
  let rescheduledTasks = 0;

  const waveMetrics = waves.map(wave => {
    const tasks = Array.isArray(wave.tasks) ? wave.tasks : [];
    const taskMetrics = tasks.map(task => {
      totalTasks++;
      if (task.status === 'completed') completedTasks++;
      if (task.status === 'failed') failedTasks++;
      if (task.retryOf) rescheduledTasks++;

      let durationMs = null;
      if (task.startedAt && task.completedAt) {
        const d = new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime();
        if (Number.isFinite(d) && d >= 0) durationMs = d;
      }

      return {
        layer: task.layer || 'unknown',
        agent: task.agentId || null,
        status: task.status || 'unknown',
        durationMs,
        verifyPassed: task.status === 'completed',
        retryOf: task.retryOf || null,
        failureClass: task.status === 'failed' ? classifyFailure(task, mergeResult) : null,
      };
    });

    let waveDurationMs = null;
    const starts = tasks.filter(t => t.startedAt).map(t => new Date(t.startedAt).getTime()).filter(Number.isFinite);
    const ends = tasks.filter(t => t.completedAt).map(t => new Date(t.completedAt).getTime()).filter(Number.isFinite);
    if (starts.length > 0 && ends.length > 0) {
      const d = Math.max(...ends) - Math.min(...starts);
      if (d >= 0) waveDurationMs = d;
    }

    return {
      waveIndex: wave.waveIndex,
      durationMs: waveDurationMs,
      tasks: taskMetrics,
    };
  });

  const successRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

  return {
    runId: `${featureSlug}-${Date.now()}`,
    featureSlug,
    completedAt,
    totalWaves: waves.length,
    waves: waveMetrics,
    summary: { totalTasks, completedTasks, failedTasks, rescheduledTasks, successRate },
  };
}

function appendRunMetrics(projectRoot, runMetrics) {
  const filePath = getMetricsPath(projectRoot);
  io.ensureDir(path.dirname(filePath));
  io.withFileLock(filePath, () => {
    const data = loadMetrics(projectRoot);
    data.runs.push(runMetrics);
    if (data.runs.length > MAX_RUNS) {
      data.runs = data.runs.slice(data.runs.length - MAX_RUNS);
    }
    io.writeJson(filePath, data);
  });
}

function getLayerStats(projectRoot, layer) {
  const data = loadMetrics(projectRoot);
  const layerTasks = [];
  for (const run of data.runs) {
    for (const wave of run.waves || []) {
      for (const task of wave.tasks || []) {
        if (task.layer === layer) layerTasks.push(task);
      }
    }
  }
  if (layerTasks.length === 0) return { count: 0, successRate: 0, avgDurationMs: 0 };

  const completed = layerTasks.filter(t => t.status === 'completed').length;
  const durations = layerTasks
    .filter(t => t.durationMs != null && Number.isFinite(t.durationMs) && t.durationMs >= 0)
    .map(t => t.durationMs);
  const avgDurationMs = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  return {
    count: layerTasks.length,
    successRate: completed / layerTasks.length,
    avgDurationMs,
  };
}

function getAgentStats(projectRoot, agent) {
  const data = loadMetrics(projectRoot);
  const agentTasks = [];
  for (const run of data.runs) {
    for (const wave of run.waves || []) {
      for (const task of wave.tasks || []) {
        if (task.agent === agent) agentTasks.push(task);
      }
    }
  }
  if (agentTasks.length === 0) return { count: 0, successRate: 0, avgDurationMs: 0 };

  const completed = agentTasks.filter(t => t.status === 'completed').length;
  const durations = agentTasks
    .filter(t => t.durationMs != null && Number.isFinite(t.durationMs) && t.durationMs >= 0)
    .map(t => t.durationMs);
  const avgDurationMs = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  return {
    count: agentTasks.length,
    successRate: completed / agentTasks.length,
    avgDurationMs,
  };
}

module.exports = {
  FAILURE_CLASSES,
  MAX_RUNS,
  loadMetrics,
  classifyFailure,
  buildRunMetrics,
  appendRunMetrics,
  getLayerStats,
  getAgentStats,
};
