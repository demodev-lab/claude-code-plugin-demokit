/**
 * Team Config
 * 팀 설정/매트릭스 관리
 */
const { config } = require('../core');

// 오케스트레이션 패턴
const ORCHESTRATION_PATTERNS = {
  leader: 'leader',   // 리더가 지시, 멤버가 실행
  council: 'council',  // 멤버들이 독립 분석 후 종합
  swarm: 'swarm',     // 멤버들이 의존성 순서대로 병렬/순차 실행
};

// Phase별 기본 팀 구성
const DEFAULT_PHASE_TEAMS = {
  plan: { lead: 'spring-architect', members: ['domain-expert'], pattern: 'leader' },
  design: { lead: 'spring-architect', members: ['api-expert', 'domain-expert'], pattern: 'leader' },
  do: { lead: null, members: ['domain-expert', 'service-expert', 'api-expert'], pattern: 'swarm' },
  analyze: { lead: null, members: ['gap-detector', 'code-reviewer', 'test-expert'], pattern: 'council' },
  iterate: { lead: null, members: ['pdca-iterator'], pattern: 'leader' },
  report: { lead: null, members: ['report-generator'], pattern: 'leader' },
};

/**
 * 레벨별 최대 팀원 수
 */
function getMaxTeammates(level) {
  try {
    const cfg = config.loadConfig();
    const maxMap = cfg.team?.maxTeammates || {};
    return maxMap[level] || (level === 'MSA' ? 5 : 3);
  } catch {
    return level === 'MSA' ? 5 : 3;
  }
}

/**
 * Phase별 팀 구성 반환
 */
function getPhaseTeam(phase, level) {
  try {
    const cfg = config.loadConfig();
    const configTeams = cfg.team?.phaseTeams;
    const team = configTeams?.[phase] || DEFAULT_PHASE_TEAMS[phase];
    if (!team) return null;

    const max = getMaxTeammates(level);
    return {
      lead: team.lead || null,
      members: (team.members || []).slice(0, max),
      pattern: team.pattern || 'leader',
    };
  } catch {
    const team = DEFAULT_PHASE_TEAMS[phase];
    if (!team) return null;
    const max = getMaxTeammates(level);
    return {
      lead: team.lead || null,
      members: (team.members || []).slice(0, max),
      pattern: team.pattern || 'leader',
    };
  }
}

/**
 * 팀 모드 활성화 여부
 */
function isTeamEnabled() {
  try {
    const cfg = config.loadConfig();
    return cfg.team?.enabled === true;
  } catch {
    return false;
  }
}

module.exports = {
  ORCHESTRATION_PATTERNS,
  DEFAULT_PHASE_TEAMS,
  getMaxTeammates,
  getPhaseTeam,
  isTeamEnabled,
};
