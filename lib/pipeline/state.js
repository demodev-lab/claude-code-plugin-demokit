/**
 * Pipeline State
 * /pipeline status|next 자동 전이를 위한 상태 저장 로직
 */
const path = require('path');
const { io, config } = require('../core');

const STATUS_REL_PATH = path.join('.pipeline', 'status.json');

const DEFAULT_PHASES = [
  { id: 1, name: 'Schema', agent: 'dba-expert' },
  { id: 2, name: 'Convention', agent: 'spring-architect' },
  { id: 3, name: 'Infra', agent: 'infra-expert' },
  { id: 4, name: 'Feature', agent: 'domain-expert' },
  { id: 5, name: 'Integration', agent: 'service-expert' },
  { id: 6, name: 'Testing', agent: 'test-expert' },
  { id: 7, name: 'Performance', agent: 'dba-expert' },
  { id: 8, name: 'Review', agent: 'code-reviewer' },
  { id: 9, name: 'Deployment', agent: 'devops-engineer' },
];

function nowIso() {
  return new Date().toISOString();
}

function getStatusFile(projectRoot) {
  return path.join(projectRoot, STATUS_REL_PATH);
}

function getConfiguredPhases() {
  const phases = config.getConfigValue('developmentPipeline.phases', DEFAULT_PHASES);
  if (!Array.isArray(phases) || phases.length === 0) return DEFAULT_PHASES;

  const normalized = phases
    .map((p, idx) => ({
      id: Number.isFinite(Number(p.id)) ? Number(p.id) : idx + 1,
      name: p.name || `Phase-${idx + 1}`,
      agent: p.agent || 'spring-architect',
    }))
    .sort((a, b) => a.id - b.id);

  return normalized.length > 0 ? normalized : DEFAULT_PHASES;
}

function loadStatus(projectRoot) {
  return io.readJson(getStatusFile(projectRoot));
}

function saveStatus(projectRoot, state) {
  io.writeJson(getStatusFile(projectRoot), state);
}

function createInitialStatus(feature, phases) {
  const ts = nowIso();
  const firstPhase = phases[0];

  return {
    version: 1,
    feature,
    currentPhase: firstPhase.id,
    startedAt: ts,
    updatedAt: ts,
    completedAt: null,
    phases: phases.map((phase, index) => ({
      id: phase.id,
      name: phase.name,
      agent: phase.agent,
      status: index === 0 ? 'in-progress' : 'pending',
      startedAt: index === 0 ? ts : null,
      completedAt: null,
    })),
    history: [
      {
        action: 'start',
        feature,
        phaseId: firstPhase.id,
        phaseName: firstPhase.name,
        at: ts,
      },
    ],
  };
}

function startPipeline(projectRoot, feature, options = {}) {
  const { reset = false } = options;
  const phases = getConfiguredPhases();

  const existing = loadStatus(projectRoot);
  if (existing && !reset && existing.feature === feature && !existing.completedAt) {
    return { state: existing, reused: true };
  }

  const state = createInitialStatus(feature, phases);
  saveStatus(projectRoot, state);
  return { state, reused: false };
}

function getCurrentPhaseEntry(state) {
  if (!state || !Array.isArray(state.phases)) return null;
  return state.phases.find(p => p.id === state.currentPhase) || null;
}

function getNextPhaseEntry(state) {
  if (!state || !Array.isArray(state.phases)) return null;
  const idx = state.phases.findIndex(p => p.id === state.currentPhase);
  if (idx === -1) return null;
  return state.phases[idx + 1] || null;
}

function ensureHistory(state) {
  if (!Array.isArray(state.history)) state.history = [];
}

function completeCurrentPhase(state, ts) {
  const current = getCurrentPhaseEntry(state);
  if (!current) return false;

  if (current.status !== 'completed') {
    current.status = 'completed';
    current.completedAt = ts;
    if (!current.startedAt) current.startedAt = ts;
    return true;
  }

  return false;
}

function advancePipeline(projectRoot) {
  const state = loadStatus(projectRoot);
  if (!state) {
    throw new Error('pipeline 상태가 없습니다. 먼저 /pipeline {feature} 로 시작하세요.');
  }

  const ts = nowIso();
  ensureHistory(state);

  const current = getCurrentPhaseEntry(state);
  if (!current) {
    throw new Error(`현재 phase(${state.currentPhase}) 정보를 찾을 수 없습니다.`);
  }

  const completedNow = completeCurrentPhase(state, ts);
  const next = getNextPhaseEntry(state);

  if (!next) {
    if (!state.completedAt) state.completedAt = ts;
    state.updatedAt = ts;
    state.history.push({
      action: completedNow ? 'complete-final' : 'complete-noop',
      feature: state.feature,
      phaseId: state.currentPhase,
      phaseName: current.name,
      at: ts,
    });
    saveStatus(projectRoot, state);
    return {
      state,
      advanced: false,
      completed: true,
      from: current,
      to: null,
    };
  }

  // 다음 phase로 전이
  next.status = 'in-progress';
  if (!next.startedAt) next.startedAt = ts;

  const from = current;
  state.currentPhase = next.id;
  state.updatedAt = ts;
  state.history.push({
    action: 'next',
    feature: state.feature,
    fromPhaseId: from.id,
    fromPhaseName: from.name,
    toPhaseId: next.id,
    toPhaseName: next.name,
    at: ts,
  });

  saveStatus(projectRoot, state);

  return {
    state,
    advanced: true,
    completed: false,
    from,
    to: next,
  };
}

function summarizeStatus(state) {
  if (!state) return null;

  const current = getCurrentPhaseEntry(state);
  const completedCount = Array.isArray(state.phases)
    ? state.phases.filter(p => p.status === 'completed').length
    : 0;
  const total = Array.isArray(state.phases) ? state.phases.length : 0;

  return {
    feature: state.feature,
    currentPhase: current ? {
      id: current.id,
      name: current.name,
      agent: current.agent,
      status: current.status,
    } : null,
    progress: {
      completed: completedCount,
      total,
      percent: total > 0 ? Math.round((completedCount / total) * 100) : 0,
    },
    completed: Boolean(state.completedAt),
    updatedAt: state.updatedAt,
    phases: state.phases || [],
  };
}

module.exports = {
  STATUS_REL_PATH,
  getStatusFile,
  getConfiguredPhases,
  loadStatus,
  saveStatus,
  startPipeline,
  advancePipeline,
  summarizeStatus,
  getCurrentPhaseEntry,
  getNextPhaseEntry,
  createInitialStatus,
};
