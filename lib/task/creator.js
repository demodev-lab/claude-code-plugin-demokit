/**
 * PDCA Task Creator
 * phase별 작업 생성, 메타데이터, task chain 구성
 */

const PHASE_ICONS = {
  plan: '\uD83D\uDCCB',
  design: '\uD83D\uDCD0',
  do: '\uD83D\uDD28',
  analyze: '\uD83D\uDD0D',
  iterate: '\uD83D\uDD04',
  report: '\uD83D\uDCCA',
};

const PHASE_LABELS = {
  plan: 'Plan',
  design: 'Design',
  do: 'Do',
  analyze: 'Analyze',
  iterate: 'Iterate',
  report: 'Report',
};

const PHASE_ORDER = ['plan', 'design', 'do', 'analyze', 'iterate', 'report'];

/**
 * PDCA task subject 생성
 * @param {string} phase
 * @param {string} feature
 * @returns {string} "📋 [Plan] feature-name"
 */
function generatePdcaTaskSubject(phase, feature) {
  const icon = PHASE_ICONS[phase] || '';
  const label = PHASE_LABELS[phase] || phase;
  return `${icon} [${label}] ${feature}`;
}

/**
 * PDCA task description 생성
 * @param {string} phase
 * @param {string} feature
 * @param {string} [docPath] - 관련 문서 경로
 * @returns {string}
 */
function generatePdcaTaskDescription(phase, feature, docPath) {
  let phaseInfo;
  try {
    const pdcaPhase = require('../pdca/phase');
    phaseInfo = pdcaPhase.getPhaseInfo(phase);
  } catch { /* pdca 모듈 미로드 시 무시 */ }

  const lines = [
    `Feature: ${feature}`,
    `Phase: ${PHASE_LABELS[phase] || phase}`,
  ];

  if (phaseInfo) {
    lines.push(`설명: ${phaseInfo.description}`);
    if (phaseInfo.agent) lines.push(`담당 Agent: ${phaseInfo.agent}`);
    if (phaseInfo.template) lines.push(`Template: ${phaseInfo.template}`);
  }

  if (docPath) {
    lines.push(`참조 문서: ${docPath}`);
  }

  return lines.join('\n');
}

/**
 * PDCA task 메타데이터 생성
 * @param {string} phase
 * @param {string} feature
 * @param {Object} [options]
 * @returns {Object}
 */
function getPdcaTaskMetadata(phase, feature, options = {}) {
  const order = PHASE_ORDER.indexOf(phase);
  return {
    pdcaPhase: phase,
    pdcaOrder: order >= 0 ? order : -1,
    feature,
    level: options.level || 'Monolith',
    createdAt: new Date().toISOString(),
  };
}

/**
 * phase별 가이드 메시지 생성
 * @param {string} phase
 * @param {string} feature
 * @param {string} [blockedByPhase] - 선행 phase
 * @returns {string}
 */
function generateTaskGuidance(phase, feature, blockedByPhase) {
  const lines = [];

  if (blockedByPhase) {
    lines.push(`[선행 조건] ${PHASE_LABELS[blockedByPhase] || blockedByPhase} phase 완료 필요`);
  }

  const guidanceMap = {
    plan: `요구사항을 정의하고 API 초안 및 데이터 모델을 작성하세요.`,
    design: `DB 스키마 상세, API 상세, 패키지 구조를 설계하세요.`,
    do: `설계 문서를 기반으로 Entity → Repo → Service → Controller → DTO → Test 순으로 구현하세요.`,
    analyze: `설계 vs 구현 Gap을 분석하고 Match Rate를 산출하세요.`,
    iterate: `Match Rate가 90% 이상이 될 때까지 수정을 반복하세요.`,
    report: `완료 보고서를 생성하세요.`,
  };

  lines.push(guidanceMap[phase] || `${phase} phase 작업을 수행하세요.`);
  return lines.join('\n');
}

/**
 * PDCA 전체 task chain 생성
 * @param {string} feature
 * @param {Object} [options] - { level, docPath }
 * @returns {{ feature, tasks: Object, phases: string[], createdAt: string }}
 */
function createPdcaTaskChain(feature, options = {}) {
  const tasks = {};
  const createdAt = new Date().toISOString();

  for (let i = 0; i < PHASE_ORDER.length; i++) {
    const phase = PHASE_ORDER[i];
    const prevPhase = i > 0 ? PHASE_ORDER[i - 1] : null;

    tasks[phase] = {
      id: `${feature}-${phase}`,
      subject: generatePdcaTaskSubject(phase, feature),
      description: generatePdcaTaskDescription(phase, feature, options.docPath),
      metadata: getPdcaTaskMetadata(phase, feature, options),
      guidance: generateTaskGuidance(phase, feature, prevPhase),
      status: 'pending',
      blockedBy: prevPhase ? [`${feature}-${prevPhase}`] : [],
    };
  }

  return { feature, tasks, phases: [...PHASE_ORDER], createdAt };
}

/**
 * 단일 PDCA task 생성
 * @param {string} feature
 * @param {string} phase
 * @param {Object} [options] - { level, docPath }
 * @returns {{ id, subject, description, metadata, status }}
 */
function autoCreatePdcaTask(feature, phase, options = {}) {
  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const prevPhase = phaseIdx > 0 ? PHASE_ORDER[phaseIdx - 1] : null;

  return {
    id: `${feature}-${phase}`,
    subject: generatePdcaTaskSubject(phase, feature),
    description: generatePdcaTaskDescription(phase, feature, options.docPath),
    metadata: getPdcaTaskMetadata(phase, feature, options),
    guidance: generateTaskGuidance(phase, feature, prevPhase),
    status: 'pending',
    blockedBy: prevPhase ? [`${feature}-${prevPhase}`] : [],
  };
}

module.exports = {
  PHASE_ICONS,
  PHASE_LABELS,
  PHASE_ORDER,
  generatePdcaTaskSubject,
  generatePdcaTaskDescription,
  getPdcaTaskMetadata,
  generateTaskGuidance,
  createPdcaTaskChain,
  autoCreatePdcaTask,
};
