#!/usr/bin/env node
/**
 * pipeline-phase-runtime.js
 * pipeline phase pre/post/transition script 공통 런타임
 */
const path = require('path');

const PHASE_META = {
  1: { name: 'Schema', slug: 'schema' },
  2: { name: 'Convention', slug: 'convention' },
  3: { name: 'Infra', slug: 'infra' },
  4: { name: 'Feature', slug: 'feature' },
  5: { name: 'Integration', slug: 'integration' },
  6: { name: 'Testing', slug: 'testing' },
  7: { name: 'Performance', slug: 'performance' },
  8: { name: 'Review', slug: 'review' },
  9: { name: 'Deployment', slug: 'deployment' },
};

async function readHookDataFromStdin() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  if (!input || !input.trim()) return {};

  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function getPhaseScriptConfig(coreConfig) {
  const cfg = coreConfig.getConfigValue('developmentPipeline.phaseScripts', {});
  const enabled = cfg.enabled !== false;
  return {
    enabled,
    preEnabled: cfg.preEnabled === true,
    postEnabled: cfg.postEnabled === true,
    transitionEnabled: cfg.transitionEnabled !== false,
  };
}

function isStageEnabled(stage, phaseScriptConfig) {
  if (!phaseScriptConfig.enabled) return false;

  if (stage === 'pre') return phaseScriptConfig.preEnabled;
  if (stage === 'post') return phaseScriptConfig.postEnabled;
  if (stage === 'transition') return phaseScriptConfig.transitionEnabled;

  return false;
}

function getPhaseMeta(phaseId) {
  return PHASE_META[Number(phaseId)] || null;
}

function getNextPhaseMeta(state, phaseId) {
  if (!state || !Array.isArray(state.phases)) return null;
  const idx = state.phases.findIndex((p) => Number(p.id) === Number(phaseId));
  if (idx === -1) return null;
  const next = state.phases[idx + 1];
  if (!next) return null;

  return {
    id: next.id,
    name: next.name,
    agent: next.agent,
  };
}

function createPhaseActivityHandler({ phaseId, phaseName, stage }) {
  if (!phaseId || !phaseName || !stage) {
    throw new Error('phaseId, phaseName, stage are required');
  }

  return async function runPhaseActivity(context = {}) {
    const state = context.pipelineState;
    if (!state || Number(state.currentPhase) !== Number(phaseId)) {
      return {};
    }

    return {
      hookSpecificOutput: {
        hookEventName: stage === 'pre' ? 'PreToolUse' : 'PostToolUse',
        pipelinePhase: phaseId,
        pipelinePhaseName: phaseName,
        pipelineStage: stage,
      },
    };
  };
}

function printJson(payload) {
  console.log(JSON.stringify(payload || {}));
}

async function resolvePipelineContext(stage, hookData) {
  const { platform, config: coreConfig } = require(path.join(__dirname, '..', 'lib', 'core'));
  const phaseScriptConfig = getPhaseScriptConfig(coreConfig);

  if (!isStageEnabled(stage, phaseScriptConfig)) {
    return { enabled: false };
  }

  const projectRoot = platform.findProjectRoot(process.cwd());
  if (!projectRoot) {
    return { enabled: true, projectRoot: null };
  }

  const { state: pipelineStateModule } = require(path.join(__dirname, '..', 'lib', 'pipeline'));
  const pipelineState = pipelineStateModule.loadStatus(projectRoot);
  if (!pipelineState || !pipelineState.currentPhase) {
    return { enabled: true, projectRoot, pipelineState: null };
  }

  const phaseId = Number(pipelineState.currentPhase);
  const phaseMeta = getPhaseMeta(phaseId);

  return {
    enabled: true,
    projectRoot,
    hookData: hookData || {},
    pipelineState,
    phaseId,
    phaseMeta,
    phaseScriptConfig,
  };
}

module.exports = {
  PHASE_META,
  readHookDataFromStdin,
  getPhaseScriptConfig,
  isStageEnabled,
  getPhaseMeta,
  getNextPhaseMeta,
  createPhaseActivityHandler,
  resolvePipelineContext,
  printJson,
};
