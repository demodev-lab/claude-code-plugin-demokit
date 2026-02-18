/**
 * Team Strategy
 * 프로젝트 레벨별 팀 구성 전략 정의
 */

const TEAM_STRATEGIES = {
  Starter: {
    teammates: 0,
    ctoAgent: null,
    roles: [],
    phaseStrategy: {
      plan: 'single', design: 'single', do: 'single',
      analyze: 'single', iterate: 'single', report: 'single',
    },
  },
  SingleModule: {
    teammates: 2,
    ctoAgent: 'spring-architect',
    roles: [
      {
        name: 'architect-role',
        description: '설계 담당 (Plan/Design phase)',
        agents: ['spring-architect'],
        phases: ['plan', 'design'],
      },
      {
        name: 'implementation-role',
        description: '구현 담당 (Do phase)',
        agents: ['domain-expert', 'service-expert'],
        phases: ['do'],
      },
      {
        name: 'quality-role',
        description: '품질 분석 (Analyze/Iterate phase)',
        agents: ['gap-detector'],
        phases: ['analyze', 'iterate'],
      },
    ],
    phaseStrategy: {
      plan: 'leader', design: 'leader', do: 'swarm',
      analyze: 'leader', iterate: 'leader', report: 'leader',
    },
  },
  MultiModule: {
    teammates: 3,
    ctoAgent: 'spring-architect',
    roles: [
      {
        name: 'architect-role',
        description: '설계 담당 (Plan/Design phase)',
        agents: ['spring-architect'],
        phases: ['plan', 'design'],
      },
      {
        name: 'implementation-role',
        description: '구현 담당 (Do phase)',
        agents: ['domain-expert', 'service-expert', 'api-expert'],
        phases: ['do'],
      },
      {
        name: 'quality-role',
        description: '품질 분석 (Analyze/Iterate phase)',
        agents: ['gap-detector', 'pdca-iterator'],
        phases: ['analyze', 'iterate'],
      },
    ],
    phaseStrategy: {
      plan: 'leader', design: 'leader', do: 'swarm',
      analyze: 'council', iterate: 'leader', report: 'leader',
    },
  },
  Monolith: {
    teammates: 3,
    ctoAgent: 'spring-architect',
    roles: [
      {
        name: 'architect-role',
        description: '설계 담당 (Plan/Design phase)',
        agents: ['spring-architect'],
        phases: ['plan', 'design'],
      },
      {
        name: 'implementation-role',
        description: '구현 담당 (Do phase)',
        agents: ['domain-expert', 'service-expert', 'api-expert'],
        phases: ['do'],
      },
      {
        name: 'quality-role',
        description: '품질 분석 (Analyze/Iterate phase)',
        agents: ['gap-detector', 'pdca-iterator'],
        phases: ['analyze', 'iterate'],
      },
    ],
    phaseStrategy: {
      plan: 'leader', design: 'leader', do: 'swarm',
      analyze: 'council', iterate: 'leader', report: 'leader',
    },
  },
  MSA: {
    teammates: 5,
    ctoAgent: 'spring-architect',
    roles: [
      {
        name: 'architect-role',
        description: '설계 담당 (Plan/Design phase)',
        agents: ['spring-architect'],
        phases: ['plan', 'design'],
      },
      {
        name: 'implementation-role',
        description: '구현 담당 (Do phase)',
        agents: ['domain-expert', 'service-expert', 'api-expert'],
        phases: ['do'],
      },
      {
        name: 'quality-role',
        description: '품질 분석 (Analyze/Iterate phase)',
        agents: ['gap-detector', 'pdca-iterator'],
        phases: ['analyze', 'iterate'],
      },
      {
        name: 'watchdog-role',
        description: '테스트/보안 감시',
        agents: ['test-expert', 'security-expert'],
        phases: ['do', 'analyze'],
      },
    ],
    phaseStrategy: {
      plan: 'council', design: 'leader', do: 'swarm',
      analyze: 'watchdog', iterate: 'swarm', report: 'leader',
    },
  },
};

/**
 * 레벨별 teammate 역할 목록 반환
 * @param {string} level - 'Starter'|'SingleModule'|'MultiModule'|'Monolith'|'MSA'
 * @returns {Array<{name, description, agents, phases}>}
 */
function getTeammateRoles(level) {
  const strategy = TEAM_STRATEGIES[level];
  return strategy ? strategy.roles : [];
}

/**
 * 레벨별 추천 teammate 수 반환
 * @param {string} level
 * @returns {number}
 */
function getRecommendedTeammateCount(level) {
  const strategy = TEAM_STRATEGIES[level];
  return strategy ? strategy.teammates : 0;
}

/**
 * 레벨/phase별 실행 패턴 반환
 * @param {string} level
 * @param {string} phase
 * @returns {'single'|'leader'|'swarm'|'council'|'pipeline'|'watchdog'}
 */
function getPhaseExecutionPattern(level, phase) {
  const strategy = TEAM_STRATEGIES[level];
  if (!strategy) return 'single';
  return strategy.phaseStrategy[phase] || 'single';
}

/**
 * 레벨별 CTO agent 반환
 * @param {string} level
 * @returns {string|null}
 */
function getCtoAgent(level) {
  const strategy = TEAM_STRATEGIES[level];
  return strategy ? strategy.ctoAgent : null;
}

module.exports = {
  TEAM_STRATEGIES,
  getTeammateRoles,
  getRecommendedTeammateCount,
  getPhaseExecutionPattern,
  getCtoAgent,
};
