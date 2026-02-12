/**
 * PDCA Phase 정의 및 전이 규칙
 */

const PHASES = ['plan', 'design', 'do', 'analyze', 'iterate', 'report'];

const PHASE_INFO = {
  plan: {
    name: 'Plan',
    description: '요구사항 정의 + API 초안 + 데이터 모델 초안',
    agent: 'spring-architect',
    template: 'plan.template.md',
    next: 'design',
    prev: null,
  },
  design: {
    name: 'Design',
    description: 'DB 스키마 상세 + API 상세 + 패키지 구조',
    agent: 'spring-architect',
    template: 'design.template.md',
    next: 'do',
    prev: 'plan',
  },
  do: {
    name: 'Do',
    description: 'Entity → Repo → Service → Controller → DTO → Test 구현',
    agent: 'domain-expert',
    template: 'do.template.md',
    next: 'analyze',
    prev: 'design',
  },
  analyze: {
    name: 'Analyze',
    description: '설계 vs 구현 Gap 분석, Match Rate 산출',
    agent: 'gap-detector',
    template: 'analysis.template.md',
    next: 'iterate',
    prev: 'do',
  },
  iterate: {
    name: 'Iterate',
    description: 'Match Rate < 90% 시 자동 수정 반복',
    agent: 'pdca-iterator',
    template: 'iteration-report.template.md',
    next: 'report',
    prev: 'analyze',
  },
  report: {
    name: 'Report',
    description: '완료 보고서 생성',
    agent: 'report-generator',
    template: 'report.template.md',
    next: null,
    prev: 'iterate',
  },
};

/**
 * phase 유효성 검사
 */
function isValidPhase(phase) {
  return PHASES.includes(phase);
}

/**
 * 다음 phase 반환
 */
function getNextPhase(currentPhase) {
  const info = PHASE_INFO[currentPhase];
  return info ? info.next : null;
}

/**
 * 이전 phase 반환
 */
function getPrevPhase(currentPhase) {
  const info = PHASE_INFO[currentPhase];
  return info ? info.prev : null;
}

/**
 * phase 정보 반환
 */
function getPhaseInfo(phase) {
  return PHASE_INFO[phase] || null;
}

/**
 * phase 전이 가능 여부 (이전 phase가 완료되었는지)
 */
function canTransition(currentPhase, targetPhase, phases) {
  if (!isValidPhase(targetPhase)) return false;
  if (targetPhase === 'plan') return true; // plan은 항상 시작 가능

  const prevPhase = getPrevPhase(targetPhase);
  if (!prevPhase) return false;
  return phases[prevPhase]?.status === 'completed';
}

module.exports = { PHASES, PHASE_INFO, isValidPhase, getNextPhase, getPrevPhase, getPhaseInfo, canTransition };
