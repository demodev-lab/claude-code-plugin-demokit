/**
 * CTO Decision Logic
 * PDCA phase 관리, 문서 평가, 팀 구성 추천
 */
const { debug: log } = require('../core');

// 순환참조 방지 lazy require
let _pdcaStatus = null;
let _pdcaPhase = null;
let _teamConfig = null;

function getStatusModule() {
  if (!_pdcaStatus) {
    try { _pdcaStatus = require('../pdca/status'); } catch { _pdcaStatus = {}; }
  }
  return _pdcaStatus;
}

function getPhaseModule() {
  if (!_pdcaPhase) {
    try { _pdcaPhase = require('../pdca/phase'); } catch { _pdcaPhase = {}; }
  }
  return _pdcaPhase;
}

function getTeamConfigModule() {
  if (!_teamConfig) {
    try { _teamConfig = require('./team-config'); } catch { _teamConfig = {}; }
  }
  return _teamConfig;
}

/**
 * PDCA phase 전환 결정
 * @param {string} projectRoot
 * @param {string} feature
 * @returns {{ currentPhase, nextPhase, readyToAdvance, blockers: string[] }}
 */
function decidePdcaPhase(projectRoot, feature) {
  const status = getStatusModule();
  const phase = getPhaseModule();
  const blockers = [];

  const statusData = status.loadStatus ? status.loadStatus(projectRoot, feature) : null;
  const currentPhase = statusData?.currentPhase || null;

  if (!currentPhase) {
    return { currentPhase: null, nextPhase: 'plan', readyToAdvance: true, blockers: [] };
  }

  const nextPhase = phase.getNextPhase ? phase.getNextPhase(currentPhase) : null;

  // deliverables 완료 여부 확인
  if (phase.checkPhaseDeliverables) {
    const result = phase.checkPhaseDeliverables(projectRoot, feature, currentPhase);
    if (!result.complete) {
      for (const m of result.missing) {
        blockers.push(`Missing deliverable: ${m}`);
      }
    }
  }

  // analyze phase: matchRate 검증
  if (currentPhase === 'analyze') {
    const matchRate = statusData?.phases?.analyze?.matchRate;
    if (matchRate == null) {
      blockers.push('Match rate not available');
    } else {
      // matchRate는 숫자 또는 { totalRate } 객체일 수 있음
      const rate = typeof matchRate === 'number' ? matchRate : matchRate?.totalRate;
      if (rate == null || rate < 90) {
        blockers.push(`Match rate ${rate ?? 'unknown'}% is below 90% threshold`);
      }
    }

    const criticalIssues = statusData?.phases?.analyze?.criticalIssues;
    if (typeof criticalIssues === 'number' && criticalIssues > 0) {
      blockers.push(`${criticalIssues} critical issues remain`);
    }
  }

  log.debug('cto-logic', `phase decision: ${currentPhase} → ${nextPhase}`, { blockers });

  return { currentPhase, nextPhase, readyToAdvance: blockers.length === 0, blockers };
}

// Spring Boot 특화 문서 섹션
const REQUIRED_SECTIONS = {
  plan: ['Overview', 'API Endpoints', 'Domain Model', 'Business Rules'],
  design: ['Entity', 'Repository', 'Service', 'Controller', 'DTO', 'Error Handling'],
};

/**
 * 문서 품질 평가
 * @param {string} projectRoot
 * @param {string} feature
 * @param {string} docType - 'plan' | 'design'
 * @returns {{ exists, path, hasRequiredSections, score, issues: string[] }}
 */
function evaluateDocument(projectRoot, feature, docType) {
  const phase = getPhaseModule();
  const issues = [];

  // phase deliverables로 문서 검색
  let docPath = null;
  let exists = false;
  let content = '';

  if (phase.checkPhaseDeliverables) {
    const result = phase.checkPhaseDeliverables(projectRoot, feature, docType);
    if (result.items && result.items.length > 0) {
      const item = result.items[0];
      if (item.found && item.files && item.files.length > 0) {
        docPath = item.files[0];
        try {
          content = require('fs').readFileSync(docPath, 'utf8');
          exists = true;
        } catch { exists = false; }
      }
    }
  }

  if (!exists) {
    return {
      exists: false, path: null, hasRequiredSections: false, score: 0,
      issues: [`${docType} document not found for feature: ${feature}`],
    };
  }

  const requiredSections = REQUIRED_SECTIONS[docType] || [];
  let foundSections = 0;

  for (const section of requiredSections) {
    if (content.toLowerCase().includes(section.toLowerCase())) {
      foundSections++;
    } else {
      issues.push(`Missing section: ${section}`);
    }
  }

  const score = requiredSections.length > 0
    ? Math.round((foundSections / requiredSections.length) * 100)
    : 100;

  return { exists, path: docPath, hasRequiredSections: issues.length === 0, score, issues };
}

/**
 * Check 결과 기반 다음 방향 결정
 * @param {number} matchRate - 0~100
 * @param {number} criticalIssues
 * @param {number} qualityScore - 0~100
 * @returns {{ decision: 'report'|'iterate'|'redesign', reason, nextAction }}
 */
function evaluateCheckResults(matchRate, criticalIssues, qualityScore) {
  let decision, reason, nextAction;
  const safeCritical = (typeof criticalIssues === 'number' && Number.isFinite(criticalIssues)) ? criticalIssues : 0;

  if (matchRate >= 90 && safeCritical === 0) {
    decision = 'report';
    reason = `Match rate ${matchRate}% meets threshold, no critical issues`;
    nextAction = '/pdca report';
  } else if (matchRate >= 70) {
    decision = 'iterate';
    reason = safeCritical > 0
      ? `${safeCritical} critical issues need resolution`
      : `Match rate ${matchRate}% below 90% threshold`;
    nextAction = '/pdca iterate';
  } else {
    decision = 'redesign';
    reason = `Match rate ${matchRate}% is critically low, redesign recommended`;
    nextAction = '/pdca design';
  }

  log.debug('cto-logic', `check evaluation: ${decision}`, { matchRate, criticalIssues, qualityScore });

  return { decision, reason, nextAction };
}

/**
 * 팀 구성 추천
 * @param {string} projectRoot
 * @param {string} feature
 * @param {string} phase
 * @returns {{ level, pattern, teammates: [], reasoning }}
 */
function recommendTeamComposition(projectRoot, feature, phase) {
  const teamConfig = getTeamConfigModule();

  if (!teamConfig.getPhaseTeam) {
    return { level: null, pattern: 'leader', teammates: [], reasoning: 'team-config not available' };
  }

  // level 판별: MSA/Monolith/Simple 등 (설정 기반)
  let level = 'Monolith';
  try {
    const { config } = require('../core');
    const cfg = config.loadConfig();
    level = cfg.team?.level || 'Monolith';
  } catch { /* default */ }

  const team = teamConfig.getPhaseTeam(phase, level);
  if (!team) {
    return { level, pattern: 'leader', teammates: [], reasoning: `No team defined for ${phase} phase` };
  }

  const teammates = team.members || [];
  const reasoning = teammates.length > 0
    ? `${level} level, ${phase} phase uses ${team.pattern} pattern with ${teammates.length} members`
    : `No team members defined for ${phase} phase at ${level} level`;

  return { level, pattern: team.pattern, teammates, reasoning };
}

module.exports = {
  decidePdcaPhase,
  evaluateDocument,
  evaluateCheckResults,
  recommendTeamComposition,
  REQUIRED_SECTIONS,
};
