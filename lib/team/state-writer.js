/**
 * State Writer
 * .demodev/team-state.json 관리
 */
const path = require('path');
const { io } = require('../core');

const STATE_FILE = 'team-state.json';

/**
 * 상태 파일 경로
 */
function getStatePath(projectRoot) {
  return path.join(projectRoot, '.demodev', STATE_FILE);
}

/**
 * 기본 상태
 */
function defaultState() {
  return {
    enabled: false,
    currentPhase: null,
    pattern: null,
    feature: null,
    members: [],
    taskQueue: [],
    completedTasks: [],
    history: [],
  };
}

/**
 * 팀 상태 로드
 */
function loadTeamState(projectRoot) {
  const statePath = getStatePath(projectRoot);
  const data = io.readJson(statePath);
  if (!data) return defaultState();
  return { ...defaultState(), ...data };
}

/**
 * 팀 상태 저장
 */
function saveTeamState(projectRoot, state) {
  const statePath = getStatePath(projectRoot);
  io.writeFile(statePath, JSON.stringify(state, null, 2));
}

/**
 * 멤버 상태 업데이트
 */
function updateMemberStatus(projectRoot, agentId, status, currentTask) {
  const state = loadTeamState(projectRoot);
  const member = state.members.find(m => m.id === agentId);

  if (member) {
    member.status = status;
    member.currentTask = currentTask || null;
  } else {
    state.members.push({
      id: agentId,
      status,
      currentTask: currentTask || null,
    });
  }

  saveTeamState(projectRoot, state);
  return state;
}

/**
 * 작업 완료 기록
 */
function recordTaskCompletion(projectRoot, agentId, taskId, result) {
  const state = loadTeamState(projectRoot);

  state.completedTasks.push({
    agentId,
    taskId,
    result: result || 'completed',
    completedAt: new Date().toISOString(),
  });

  // 해당 멤버 상태 idle로
  const member = state.members.find(m => m.id === agentId);
  if (member) {
    member.status = 'idle';
    member.currentTask = null;
  }

  // 작업 큐에서 제거
  state.taskQueue = state.taskQueue.filter(t =>
    (typeof t === 'string' ? t : t.id) !== taskId
  );

  saveTeamState(projectRoot, state);
  return state;
}

/**
 * 활성 멤버 목록
 */
function getActiveMembers(projectRoot) {
  const state = loadTeamState(projectRoot);
  return state.members.filter(m => m.status === 'active');
}

/**
 * 팀 상태 초기화
 */
function clearTeamState(projectRoot) {
  saveTeamState(projectRoot, defaultState());
}

module.exports = {
  loadTeamState,
  saveTeamState,
  updateMemberStatus,
  recordTaskCompletion,
  getActiveMembers,
  clearTeamState,
};
