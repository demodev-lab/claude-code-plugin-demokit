/**
 * Team Task Queue
 * In-memory Map 기반 PDCA phase별 팀 작업 할당 추적
 */
const { debug: log } = require('../core');

/**
 * PDCA phase 기반 팀 작업 생성
 * @param {string} phase
 * @param {string} feature
 * @param {Array<Object>} teammates - [{ name|role, task?, agentType? }]
 * @returns {Array<Object>} [{ role, subject, description, metadata, dependencies }]
 */
function createTeamTasks(phase, feature, teammates) {
  if (!teammates || teammates.length === 0) return [];
  if (!phase || !feature) return [];

  const tasks = [];

  for (const teammate of teammates) {
    const role = teammate.name || teammate.role || 'unknown';
    const subject = `[${phase.charAt(0).toUpperCase() + phase.slice(1)}] ${feature} - ${role}: ${teammate.task || phase}`;
    const description = teammate.task
      ? `${teammate.task}\n\nFeature: ${feature}\nPhase: ${phase}\nAgent: ${teammate.agentType || 'auto'}`
      : `Execute ${phase} phase work for ${feature} as ${role}`;

    tasks.push({
      role,
      subject,
      description,
      metadata: { feature, phase, role, agentType: teammate.agentType || null, teamTask: true },
      dependencies: [],
    });

    log.debug('task-queue', `team task created: ${role}/${phase}/${feature}`);
  }

  return tasks;
}

/**
 * 할당 초기화 (테스트/리셋용)
 */
function clearAssignments() {
  // noop — _taskAssignments Map 제거됨
}

module.exports = {
  createTeamTasks,
  clearAssignments,
};
