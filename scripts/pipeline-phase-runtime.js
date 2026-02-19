#!/usr/bin/env node
/**
 * pipeline-phase-runtime.js
 * pipeline phase pre/post/stop/transition script 공통 런타임
 */
const fs = require('fs');
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

const STAGE_CONTROL = {
  pre: {
    eventName: 'PreToolUse',
    scriptKey: 'pipelinePhasePre',
    hookEventName: 'PreToolUse',
  },
  post: {
    eventName: 'PostToolUse',
    scriptKey: 'pipelinePhasePost',
    hookEventName: 'PostToolUse',
  },
  stop: {
    eventName: 'Stop',
    scriptKey: 'pipelinePhaseStop',
    hookEventName: 'Stop',
  },
  transition: {
    eventName: 'TaskCompleted',
    scriptKey: 'pipelinePhaseTransition',
    hookEventName: 'TaskCompleted',
  },
};

const STAGE_HINTS = {
  schema: {
    pre: 'DDL/마이그레이션 설계와 인덱스 전략을 먼저 확정하세요.',
    post: '스키마 변경이 반영됐다면 /pipeline next 로 다음 단계를 진행하세요.',
  },
  convention: {
    pre: '패키지/네이밍 컨벤션과 공통 컴포넌트 구조를 먼저 맞추세요.',
    post: '컨벤션 적용이 끝났다면 /pipeline next 로 Infra 단계로 전환하세요.',
  },
  infra: {
    pre: 'Gradle/환경설정/로컬 인프라 구성을 먼저 점검하세요.',
    post: '인프라 준비가 끝났다면 /pipeline next 로 Feature 구현으로 이동하세요.',
  },
  feature: {
    pre: '도메인 로직과 API 구현 범위를 작게 나눠 순차 적용하세요.',
    post: '핵심 기능 완료 후 /pipeline status 로 진행률을 확인하세요.',
  },
  integration: {
    pre: '서비스 간 연결 지점(트랜잭션/예외 처리)을 먼저 검증하세요.',
    post: '통합 검증이 끝났다면 /pipeline next 로 Testing 단계로 이동하세요.',
  },
  testing: {
    pre: '단위/통합 테스트 우선순위를 정하고 실패 케이스부터 고정하세요.',
    post: '테스트 통과 후 /pipeline next 로 Performance 단계를 진행하세요.',
  },
  performance: {
    pre: '쿼리/캐시/병목 지표를 먼저 수집하고 최적화하세요.',
    post: '성능 개선 검증 후 /pipeline next 로 Review 단계로 이동하세요.',
  },
  review: {
    pre: '리스크, 보안, 회귀 가능성을 중심으로 리뷰하세요.',
    post: '리뷰 반영 완료 시 /pipeline next 로 Deployment 단계를 준비하세요.',
  },
  deployment: {
    pre: '배포 체크리스트(설정/헬스체크/롤백 경로)를 확인하세요.',
    post: '배포 준비가 끝났다면 /pipeline status 로 최종 상태를 확인하세요.',
  },
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
    stopEnabled: cfg.stopEnabled !== false,
    transitionEnabled: cfg.transitionEnabled !== false,
    emitOncePerPhase: cfg.emitOncePerPhase !== false,
  };
}

function getStageHookControl(stage) {
  return STAGE_CONTROL[stage] || null;
}

function stageDefaultEnabled(stage, phaseScriptConfig) {
  if (!phaseScriptConfig || !phaseScriptConfig.enabled) return false;

  switch (stage) {
    case 'pre':
      return phaseScriptConfig.preEnabled;
    case 'post':
      return phaseScriptConfig.postEnabled;
    case 'stop':
      return phaseScriptConfig.stopEnabled;
    case 'transition':
      return phaseScriptConfig.transitionEnabled;
    default:
      return false;
  }
}

function isStageEnabled(stage, phaseScriptConfig) {
  return stageDefaultEnabled(stage, phaseScriptConfig);
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

function getRuntimeMarkerPath(projectRoot) {
  return path.join(projectRoot, '.pipeline', '.phase-runtime-markers.json');
}

function loadRuntimeMarkers(projectRoot) {
  const markerPath = getRuntimeMarkerPath(projectRoot);
  try {
    const raw = fs.readFileSync(markerPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveRuntimeMarkers(projectRoot, markers) {
  const markerPath = getRuntimeMarkerPath(projectRoot);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  fs.writeFileSync(markerPath, JSON.stringify(markers, null, 2), 'utf-8');
}

function markStageEmission(projectRoot, feature, runId, phaseId, stage, emitOncePerPhase) {
  if (!emitOncePerPhase) return true;

  const normalizedFeature = feature || 'unknown';
  const normalizedRunId = runId || 'run';
  const markerKey = `${normalizedFeature}:${normalizedRunId}:${phaseId}:${stage}`;
  const markers = loadRuntimeMarkers(projectRoot);

  // 동일 feature의 이전 run marker는 정리해 재시작/리셋 후 힌트가 정상 재노출되도록 한다.
  const featurePrefix = `${normalizedFeature}:`;
  const currentRunPrefix = `${normalizedFeature}:${normalizedRunId}:`;
  Object.keys(markers).forEach((key) => {
    if (key.startsWith(featurePrefix) && !key.startsWith(currentRunPrefix)) {
      delete markers[key];
    }
  });

  if (markers[markerKey]) {
    return false;
  }

  markers[markerKey] = {
    emittedAt: new Date().toISOString(),
  };
  saveRuntimeMarkers(projectRoot, markers);
  return true;
}

function getStageHint(phaseMeta, stage) {
  if (!phaseMeta) return null;
  return STAGE_HINTS[phaseMeta.slug]?.[stage] || null;
}

function createPhaseActivityHandler({ phaseId, phaseName, stage }) {
  if (!phaseId || !phaseName || !stage) {
    throw new Error('phaseId, phaseName, stage are required');
  }

  const hookControl = getStageHookControl(stage);
  const hookEventName = hookControl?.hookEventName || (stage === 'pre' ? 'PreToolUse' : 'PostToolUse');

  return async function runPhaseActivity(context = {}) {
    const state = context.pipelineState;
    if (!state || Number(state.currentPhase) !== Number(phaseId)) {
      return {};
    }

    const shouldEmit = markStageEmission(
      context.projectRoot,
      state.feature,
      state.startedAt,
      phaseId,
      stage,
      context.phaseScriptConfig?.emitOncePerPhase !== false,
    );

    if (!shouldEmit) {
      return {};
    }

    const hint = getStageHint(context.phaseMeta, stage);
    const stageLabel = stage.toUpperCase();
    const lines = [`[Pipeline][Phase ${phaseId} ${stageLabel}] ${phaseName}`];
    if (hint) lines.push(hint);

    return {
      systemMessage: lines.join('\n'),
      hookSpecificOutput: {
        hookEventName,
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
  const { platform, config: coreConfig, hookRuntime } = require(path.join(__dirname, '..', 'lib', 'core'));
  const phaseScriptConfig = getPhaseScriptConfig(coreConfig);

  const stageControl = getStageHookControl(stage);
  const stageEnabledDefault = stageDefaultEnabled(stage, phaseScriptConfig);

  if (!stageControl || !stageEnabledDefault) {
    return { enabled: false };
  }

  const shouldRun = hookRuntime.shouldRun({
    eventName: stageControl.eventName,
    scriptKey: stageControl.scriptKey,
    eventFallback: true,
    scriptFallback: stageEnabledDefault,
  });

  if (!shouldRun) {
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
  getStageHookControl,
  isStageEnabled,
  getPhaseMeta,
  getNextPhaseMeta,
  createPhaseActivityHandler,
  resolvePipelineContext,
  markStageEmission,
  getStageHint,
  printJson,
};
