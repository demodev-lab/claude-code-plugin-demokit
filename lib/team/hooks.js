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
 * @param {string} level - 'Starter'|'Monolith'|'MSA'
 * @returns {{ nextPhase, team, tasks, notice, needsRecompose }}
 */
function assignNextTeammateWork(completedPhase, feature, level) {
  const nextPhase = NEXT_PHASE_MAP[completedPhase] || null;

  if (!nextPhase) {
    return { nextPhase: null, team: { members: [], pattern: 'single' }, tasks: [], notice: null, needsRecompose: false };
  }

  // lazy require로 순환참조 방지
  const strategy = require('./strategy');
  const communication = require('./communication');
  const taskQueue = require('./task-queue');

  const pattern = strategy.getPhaseExecutionPattern(level, nextPhase);
  const roles = strategy.getTeammateRoles(level);
  const phaseRoles = roles.filter(r => r.phases.includes(nextPhase));

  // phase roles를 teammate 형태로 변환
  const teammates = phaseRoles.map(r => ({
    name: r.name,
    role: r.name,
    task: `${nextPhase} phase 작업 수행`,
    agentType: r.agents[0] || null,
  }));

  const tasks = taskQueue.createTeamTasks(nextPhase, feature, teammates);

  const notice = communication.createPhaseTransitionNotice(
    feature, completedPhase, nextPhase
  );

  const needsRecompose = shouldRecomposeTeam(completedPhase, nextPhase, level);

  return {
    nextPhase,
    team: { members: phaseRoles, pattern },
    tasks,
    notice,
    needsRecompose,
  };
}

/**
 * idle teammate에 다음 작업 할당
 * @param {string} teammateId
 * @param {Object} pdcaStatus - { feature, currentPhase }
 * @returns {{ teammateId, feature, currentPhase, nextTask, suggestion }|null}
 */
function handleTeammateIdle(teammateId, pdcaStatus) {
  if (!pdcaStatus || !pdcaStatus.feature) return null;

  const taskQueue = require('./task-queue');

  const nextTask = taskQueue.findNextAvailableTask(teammateId, pdcaStatus.feature);

  if (!nextTask) return null;

  return {
    teammateId,
    feature: pdcaStatus.feature,
    currentPhase: pdcaStatus.currentPhase,
    nextTask,
    suggestion: `${teammateId}에게 ${nextTask.phase} phase 작업을 할당하세요.`,
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
  const strategy = require('./strategy');

  const fromPattern = strategy.getPhaseExecutionPattern(level, fromPhase);
  const toPattern = strategy.getPhaseExecutionPattern(level, toPhase);

  return fromPattern !== toPattern;
}

module.exports = {
  NEXT_PHASE_MAP,
  assignNextTeammateWork,
  handleTeammateIdle,
  shouldRecomposeTeam,
};
