/**
 * Team Task Queue
 * In-memory Map 기반 PDCA phase별 팀 작업 할당 추적
 */
const { debug: log } = require('../core');

// key: `${feature}:${phase}:${role}`
const _taskAssignments = new Map();

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
 * 작업을 역할에 할당
 * @param {string} taskId
 * @param {string} role
 * @param {string} feature
 * @param {string} phase
 * @returns {{ taskId, role, feature, phase, assignedAt, status }}
 */
function assignTaskToRole(taskId, role, feature, phase) {
  const assignment = {
    taskId,
    role,
    feature,
    phase,
    assignedAt: new Date().toISOString(),
    status: 'assigned',
  };

  const key = `${feature}:${phase}:${role}`;
  _taskAssignments.set(key, assignment);

  log.debug('task-queue', `task assigned: ${taskId} → ${role}`);
  return assignment;
}

/**
 * 팀 진행도 조회
 * @param {string} feature
 * @param {string} phase
 * @returns {{ total, completed, inProgress, pending, completionRate }}
 */
function getTeamProgress(feature, phase) {
  let total = 0, completed = 0, inProgress = 0, pending = 0;

  for (const [key, assignment] of _taskAssignments.entries()) {
    if (key.startsWith(`${feature}:${phase}:`)) {
      total++;
      if (assignment.status === 'completed') completed++;
      else if (assignment.status === 'in_progress') inProgress++;
      else pending++;
    }
  }

  return {
    total, completed, inProgress, pending,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * 유휴 teammate를 위한 다음 가용 작업 탐색
 * @param {string} role
 * @param {string} feature
 * @returns {Object|null}
 */
function findNextAvailableTask(role, feature) {
  // 해당 role에 할당된 미완료 작업 검색
  for (const [key, assignment] of _taskAssignments.entries()) {
    if (key.endsWith(`:${role}`) && assignment.feature === feature && assignment.status === 'assigned') {
      return {
        taskId: assignment.taskId,
        subject: `Continue ${assignment.phase} work for ${feature}`,
        role: assignment.role,
        phase: assignment.phase,
        feature: assignment.feature,
      };
    }
  }

  // 미할당 작업 fallback
  for (const [, assignment] of _taskAssignments.entries()) {
    if (assignment.feature === feature && assignment.status === 'assigned' && !assignment.claimedBy) {
      return {
        taskId: assignment.taskId,
        subject: `Available ${assignment.phase} task for ${feature}`,
        role: assignment.role,
        phase: assignment.phase,
        feature: assignment.feature,
      };
    }
  }

  return null;
}

/**
 * phase 완료 여부 확인
 * @param {string} feature
 * @param {string} phase
 * @returns {boolean}
 */
function isPhaseComplete(feature, phase) {
  const progress = getTeamProgress(feature, phase);
  return progress.total > 0 && progress.completed === progress.total;
}

/**
 * 할당 초기화 (테스트/리셋용)
 */
function clearAssignments() {
  _taskAssignments.clear();
}

module.exports = {
  createTeamTasks,
  assignTaskToRole,
  getTeamProgress,
  findNextAvailableTask,
  isPhaseComplete,
  clearAssignments,
};
