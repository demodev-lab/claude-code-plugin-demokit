/**
 * Orchestrator
 * 팀 오케스트레이션 엔진
 */
const teamConfig = require('./team-config');

/**
 * 팀 사용 여부 판단
 */
function shouldUseTeam(taskSize, pdcaActive) {
  if (!teamConfig.isTeamEnabled()) return false;
  // PDCA 활성이거나 feature 규모 이상일 때 팀 모드
  if (pdcaActive) return true;
  if (taskSize === 'feature' || taskSize === 'majorFeature') return true;
  return false;
}

/**
 * 팀 구성 빌드
 */
function buildTeamComposition(phase, level) {
  const team = teamConfig.getPhaseTeam(phase, level);
  if (!team) return null;

  const maxParallel = team.pattern === 'swarm' ? team.members.length : 1;

  return {
    lead: team.lead,
    members: team.members,
    pattern: team.pattern,
    maxParallel,
  };
}

/**
 * 작업 위임 객체 생성
 */
function delegateTask(agentId, taskDesc, context) {
  return {
    agent: agentId,
    task: taskDesc,
    context: context || {},
    timestamp: new Date().toISOString(),
  };
}

/**
 * Phase에 맞는 패턴 선택
 */
function selectPattern(phase) {
  const team = teamConfig.getPhaseTeam(phase, 'Monolith');
  return team?.pattern || 'leader';
}

module.exports = {
  shouldUseTeam,
  buildTeamComposition,
  delegateTask,
  selectPattern,
};
