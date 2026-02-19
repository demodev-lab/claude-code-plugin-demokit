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

function loadConfigSafe() {
  try {
    return config.loadConfig() || {};
  } catch {
    return {};
  }
}

/**
 * 팀 레벨 오버라이드 조회
 * team.levelOverrides.<Level> 또는 team.levelOverrides.default
 */
function getTeamLevelOverridesFromConfig(cfg, level) {
  const overrides = cfg?.team?.levelOverrides;
  if (!overrides || typeof overrides !== 'object') return {};

  const byLevel = overrides[level];
  if (byLevel && typeof byLevel === 'object') return byLevel;

  const byDefault = overrides.default;
  if (byDefault && typeof byDefault === 'object') return byDefault;

  return {};
}

function getTeamLevelOverrides(level) {
  const cfg = loadConfigSafe();
  return getTeamLevelOverridesFromConfig(cfg, level);
}

function normalizePositiveInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function resolvePhaseLevelValue(sectionMap, phase, level) {
  if (!sectionMap || typeof sectionMap !== 'object') return null;

  const phaseMap = sectionMap[phase];
  if (phaseMap === undefined || phaseMap === null) return null;

  if (typeof phaseMap !== 'object') {
    return phaseMap;
  }

  if (Object.prototype.hasOwnProperty.call(phaseMap, level)) {
    return phaseMap[level];
  }

  if (Object.prototype.hasOwnProperty.call(phaseMap, 'default')) {
    return phaseMap.default;
  }

  return null;
}

function getPhasePerformanceValue(cfg, levelOverrides, section, phase, level) {
  const overrideSectionMap = levelOverrides?.performance?.[section];
  const fromLevelOverride = resolvePhaseLevelValue(overrideSectionMap, phase, level);
  if (fromLevelOverride !== null && fromLevelOverride !== undefined) {
    return fromLevelOverride;
  }

  const sectionMap = cfg?.team?.performance?.[section];
  return resolvePhaseLevelValue(sectionMap, phase, level);
}

function resolveDelegateMode(cfg, levelOverrides) {
  if (typeof levelOverrides?.delegateMode === 'boolean') {
    return levelOverrides.delegateMode;
  }

  if (typeof cfg?.team?.delegateMode === 'boolean') {
    return cfg.team.delegateMode;
  }

  return false;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolvePhaseTeamConfig(fallbackTeam, globalTeam, overrideTeam) {
  const safeFallback = isPlainObject(fallbackTeam) ? fallbackTeam : { lead: null, members: [], pattern: 'leader' };
  const safeGlobal = isPlainObject(globalTeam) ? globalTeam : {};
  const safeOverride = isPlainObject(overrideTeam) ? overrideTeam : {};

  const lead = Object.prototype.hasOwnProperty.call(safeOverride, 'lead')
    ? safeOverride.lead
    : (Object.prototype.hasOwnProperty.call(safeGlobal, 'lead')
      ? safeGlobal.lead
      : safeFallback.lead);

  const members = Array.isArray(safeOverride.members)
    ? safeOverride.members
    : (Array.isArray(safeGlobal.members)
      ? safeGlobal.members
      : (Array.isArray(safeFallback.members) ? safeFallback.members : []));

  const pattern = (typeof safeOverride.pattern === 'string' && safeOverride.pattern.trim())
    ? safeOverride.pattern.trim()
    : ((typeof safeGlobal.pattern === 'string' && safeGlobal.pattern.trim())
      ? safeGlobal.pattern.trim()
      : (safeFallback.pattern || 'leader'));

  return {
    lead: lead ?? null,
    members,
    pattern,
  };
}

/**
 * 레벨별 최대 팀원 수
 */
function getMaxTeammates(level) {
  const cfg = loadConfigSafe();
  const levelOverrides = getTeamLevelOverridesFromConfig(cfg, level);

  const overrideMax = normalizePositiveInteger(levelOverrides.maxTeammates);
  if (overrideMax) return overrideMax;

  const maxMap = cfg.team?.maxTeammates || {};
  const fromLevel = normalizePositiveInteger(maxMap[level]);
  if (fromLevel) return fromLevel;

  const fromDefault = normalizePositiveInteger(maxMap.default);
  if (fromDefault) return fromDefault;

  return level === 'MSA' ? 5 : 3;
}

/**
 * Phase별 팀 구성 반환
 */
function getPhaseTeam(phase, level) {
  const fallbackTeam = DEFAULT_PHASE_TEAMS[phase];
  if (!fallbackTeam) return null;

  const cfg = loadConfigSafe();
  const levelOverrides = getTeamLevelOverridesFromConfig(cfg, level);

  const configTeams = cfg.team?.phaseTeams || {};
  const overrideTeams = levelOverrides.phaseTeams || {};
  const team = resolvePhaseTeamConfig(fallbackTeam, configTeams[phase], overrideTeams[phase]);

  const maxTeammates = getMaxTeammates(level);
  const performanceMemberCap = normalizePositiveInteger(
    getPhasePerformanceValue(cfg, levelOverrides, 'phaseMemberCap', phase, level)
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
      return {
        lead: team.lead || null,
        members: [],
        pattern: 'single',
        maxParallel: 1,
        delegateMode: false,
        delegateAgent: null,
      };
    }
    if (strategyPattern) {
      pattern = strategyPattern;
    }
  } catch { /* strategy 로드 실패 시 config 패턴 유지 */ }

  const patternOverride = getPhasePerformanceValue(cfg, levelOverrides, 'phasePatternOverride', phase, level);
  if (typeof patternOverride === 'string' && patternOverride.trim()) {
    pattern = patternOverride.trim();
  }

  let lead = team.lead || null;
  let members = (team.members || []).slice(0, effectiveMemberCap);

  const delegateMode = resolveDelegateMode(cfg, levelOverrides);
  if (delegateMode) {
    const delegateAgent = lead || members[0] || null;
    const delegateMembers = delegateAgent ? [delegateAgent] : [];

    return {
      lead: delegateAgent,
      members: delegateMembers,
      pattern: 'leader',
      maxParallel: 1,
      delegateMode: true,
      delegateAgent,
    };
  }

  const defaultMaxParallel = pattern === 'swarm' ? members.length : 1;
  const performanceMaxParallel = normalizePositiveInteger(
    getPhasePerformanceValue(cfg, levelOverrides, 'phaseMaxParallel', phase, level)
  );
  const maxParallel = performanceMaxParallel
    ? Math.max(1, Math.min(defaultMaxParallel, performanceMaxParallel, Math.max(1, members.length)))
    : defaultMaxParallel;

  return {
    lead,
    members,
    pattern,
    maxParallel,
    delegateMode: false,
    delegateAgent: null,
  };
}

function isDelegateMode(level) {
  const cfg = loadConfigSafe();
  const levelOverrides = getTeamLevelOverridesFromConfig(cfg, level);
  return resolveDelegateMode(cfg, levelOverrides);
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
  getTeamLevelOverrides,
  getPhaseTeam,
  isDelegateMode,
  isTeamEnabled,
  getCleanupPolicy,
};
