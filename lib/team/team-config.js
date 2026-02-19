/**
 * Team Config
 * 팀 설정/매트릭스 관리
 */
const { config } = require('../core');

// 오케스트레이션 패턴
const ORCHESTRATION_PATTERNS = {
  leader: 'leader',     // 리더가 지시, 멤버가 실행
  council: 'council',   // 멤버들이 독립 분석 후 종합
  swarm: 'swarm',       // 멤버들이 의존성 순서대로 병렬/순차 실행
  pipeline: 'pipeline', // 순차 스테이지 실행
  watchdog: 'watchdog', // 전원 전체 작업 병렬 모니터링
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

function getPhasePerformanceValue(cfg, section, phase, level) {
  const sectionMap = cfg?.team?.performance?.[section];
  if (!sectionMap || typeof sectionMap !== 'object') return null;

  const phaseMap = sectionMap[phase];
  if (!phaseMap || typeof phaseMap !== 'object') return null;

  if (Object.prototype.hasOwnProperty.call(phaseMap, level)) {
    return phaseMap[level];
  }

  if (Object.prototype.hasOwnProperty.call(phaseMap, 'default')) {
    return phaseMap.default;
  }

  return null;
}

function normalizePositiveInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
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

    const maxTeammates = getMaxTeammates(level);
    const performanceMemberCap = normalizePositiveInteger(
      getPhasePerformanceValue(cfg, 'phaseMemberCap', phase, level)
    );
    const effectiveMemberCap = performanceMemberCap
      ? Math.min(maxTeammates, performanceMemberCap)
      : maxTeammates;

    // strategy.js의 level별 패턴이 있으면 우선 적용
    let pattern = team.pattern || 'leader';
    try {
      const { getPhaseExecutionPattern } = require('./strategy');
      const strategyPattern = getPhaseExecutionPattern(level, phase);
      if (strategyPattern === 'single') {
        // Starter 등 단독 실행 레벨: 팀 없이 반환
        return { lead: team.lead || null, members: [], pattern: 'single', maxParallel: 1 };
      }
      if (strategyPattern) {
        pattern = strategyPattern;
      }
    } catch { /* strategy 로드 실패 시 config 패턴 유지 */ }

    const patternOverride = getPhasePerformanceValue(cfg, 'phasePatternOverride', phase, level);
    if (typeof patternOverride === 'string' && patternOverride.trim()) {
      pattern = patternOverride.trim();
    }

    const members = (team.members || []).slice(0, effectiveMemberCap);
    const defaultMaxParallel = pattern === 'swarm' ? members.length : 1;
    const performanceMaxParallel = normalizePositiveInteger(
      getPhasePerformanceValue(cfg, 'phaseMaxParallel', phase, level)
    );
    const maxParallel = performanceMaxParallel
      ? Math.max(1, Math.min(defaultMaxParallel, performanceMaxParallel, Math.max(1, members.length)))
      : defaultMaxParallel;

    return {
      lead: team.lead || null,
      members,
      pattern,
      maxParallel,
    };
  } catch {
    const team = DEFAULT_PHASE_TEAMS[phase];
    if (!team) return null;
    const max = getMaxTeammates(level);
    const members = (team.members || []).slice(0, max);
    return {
      lead: team.lead || null,
      members,
      pattern: team.pattern || 'leader',
      maxParallel: (team.pattern || 'leader') === 'swarm' ? members.length : 1,
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

/**
 * 팀 정리 정책
 */
function getCleanupPolicy() {
  const normalizeClearMode = (value) => {
    if (value === true) return 'if_no_live';
    if (typeof value !== 'string') {
      return 'never';
    }

    const normalized = value.trim().toLowerCase();
    const alias = new Map([
      ['always', 'always'],
      ['on_stop', 'always'],
      ['force', 'always'],
      ['if_nolive', 'if_no_live'],
      ['if_no_live', 'if_no_live'],
      ['if-no-live', 'if_no_live'],
      ['if_idle', 'if_no_live'],
      ['idle_only', 'if_no_live'],
      ['ifnone', 'if_no_live'],
      ['never', 'never'],
      ['off', 'never'],
      ['disabled', 'never'],
    ]);
    return alias.get(normalized) || 'never';
  };

  try {
    const cfg = config.loadConfig();
    const cleanup = cfg.team?.cleanup || {};
    const configuredClearMode = cleanup.clearTeamStateOnStopMode ?? cleanup.clearTeamStateOnStop;
    const clearMode = cleanup.clearOnStop
      ? 'always'
      : normalizeClearMode(configuredClearMode);

    return {
      staleMemberMs: Number(cleanup.staleMemberMs) > 0
        ? Number(cleanup.staleMemberMs)
        : 30 * 60 * 1000,
      clearTeamStateOnStopMode: clearMode,
      clearOnStop: cleanup.clearOnStop === true,
      clearTeamStateOnStop: clearMode !== 'never',
      forceClearOnStop: cleanup.forceClearOnStop === true,
      pruneMembersOnStop: cleanup.pruneMembersOnStop === true,
    };
  } catch {
    return {
      staleMemberMs: 30 * 60 * 1000,
      clearTeamStateOnStopMode: 'never',
      clearOnStop: false,
      clearTeamStateOnStop: false,
      forceClearOnStop: false,
      pruneMembersOnStop: false,
    };
  }
}

module.exports = {
  ORCHESTRATION_PATTERNS,
  DEFAULT_PHASE_TEAMS,
  getMaxTeammates,
  getPhaseTeam,
  isTeamEnabled,
  getCleanupPolicy,
};
