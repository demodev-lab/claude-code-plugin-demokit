/**
 * Team Hooks
 * phase 완료 시 다음 teammate 작업 배정, idle 처리, 팀 재구성 판단
 */

const NEXT_PHASE_MAP = {
  plan: 'design',
  design: 'do',
  do: 'analyze',
  analyze: 'iterate',
  iterate: 'analyze',
  report: null,
};

/**
 * 완료된 phase 이후 다음 teammate 작업 배정
 * @param {string} completedPhase
 * @param {string} feature
 * @param {string} level - 'Starter'|'SingleModule'|'MultiModule'|'Monolith'|'MSA'
 * @returns {{ nextPhase, team, tasks, notice, needsRecompose }}
 */
function assignNextTeammateWork(completedPhase, feature, level, context = {}) {
  let nextPhase = NEXT_PHASE_MAP[completedPhase] || null;

  // analyze/iterate 탈출 조건: matchRate >= 90 && criticalIssues === 0 → report
  if (completedPhase === 'analyze' || completedPhase === 'iterate') {
    const matchRate = context.matchRate ?? null;
    const criticalIssues = context.criticalIssues ?? null;
    if (matchRate !== null && matchRate >= 90 && (criticalIssues === null || criticalIssues === 0)) {
      nextPhase = 'report';
    }
  }

  if (!nextPhase) {
    return { nextPhase: null, team: { members: [], pattern: 'single' }, tasks: [], notice: null, needsRecompose: false };
  }

  // lazy require로 순환참조 방지
  const teamConfig = require('./team-config');
  const communication = require('./communication');
  const taskQueue = require('./task-queue');

  const phaseTeam = teamConfig.getPhaseTeam(nextPhase, level)
    || { lead: null, members: [], pattern: 'single' };

  // phase members를 teammate 형태로 변환
  const teammates = (phaseTeam.members || []).map((member) => ({
    name: member,
    role: member,
    task: `${nextPhase} phase 작업 수행`,
    agentType: member,
  }));

  const tasks = taskQueue.createTeamTasks(nextPhase, feature, teammates);

  const notice = communication.createPhaseTransitionNotice(
    feature, completedPhase, nextPhase
  );

  const needsRecompose = shouldRecomposeTeam(completedPhase, nextPhase, level);

  return {
    nextPhase,
    team: { members: phaseTeam.members || [], lead: phaseTeam.lead || null, pattern: phaseTeam.pattern || 'single' },
    tasks,
    notice,
    needsRecompose,
  };
}

/**
 * phase 전환 시 팀 재구성 필요 여부 판단
 * @param {string} fromPhase
 * @param {string} toPhase
 * @param {string} level
 * @returns {boolean}
 */
function shouldRecomposeTeam(fromPhase, toPhase, level) {
  const teamConfig = require('./team-config');

  const fromPattern = teamConfig.getPhaseTeam(fromPhase, level)?.pattern || 'single';
  const toPattern = teamConfig.getPhaseTeam(toPhase, level)?.pattern || 'single';

  return fromPattern !== toPattern;
}

module.exports = {
  NEXT_PHASE_MAP,
  assignNextTeammateWork,
  shouldRecomposeTeam,
};
