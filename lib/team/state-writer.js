/**
 * State Writer
 * .demodev/team-state.json 관리
 */
const fs = require('fs');
const path = require('path');
const { io } = require('../core');
const { isMatchedTask } = require('./coordinator');

const STATE_FILE = 'team-state.json';
const MAX_HISTORY_EVENTS = 100;
const DEFAULT_STALE_MEMBER_MS = 30 * 60 * 1000; // 30분
const TASK_ID_EMPTY = 'task';

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
    version: '1.1',
    enabled: false,
    currentPhase: null,
    pattern: null,
    feature: null,
    members: [],
    taskQueue: [],
    completedTasks: [],
    history: [],
    updatedAt: null,
  };
}

/**
 * 시간 문자열 반환
 */
function nowString() {
  return new Date().toISOString();
}

function normalizeMemberRef(memberId) {
  return memberId === undefined || memberId === null ? '' : String(memberId).trim().toLowerCase();
}

/**
 * taskQueue 항목 정규화
 */
function normalizeTaskEntry(task, index) {
  if (!task) return null;
  if (typeof task === 'string') {
    const desc = task.trim();
    return {
      id: `str-${String(index + 1).padStart(3, '0')}-${desc ? desc : TASK_ID_EMPTY}`,
      subject: desc || '(title-less task)',
      description: desc || '(description-less task)',
    };
  }

  const desc = (task.description || task.task || task.subject || task.name || '').toString().trim();
  const subject = (task.subject || desc || task.description || TASK_ID_EMPTY).toString().trim();
  return {
    id: task.id || task.taskId || `obj-${String(index + 1).padStart(3, '0')}-${subject || TASK_ID_EMPTY}`,
    subject: subject || TASK_ID_EMPTY,
    description: desc || subject || TASK_ID_EMPTY,
    ...(task.layer ? { layer: task.layer } : {}),
    ...(task.metadata ? { metadata: task.metadata } : {}),
    ...(task.role ? { role: task.role } : {}),
    ...(task.assignee ? { assignee: task.assignee } : {}),
    ...(task.status ? { status: task.status } : {}),
    ...(task.assignedAt ? { assignedAt: task.assignedAt } : {}),
    ...(task.assignedBy ? { assignedBy: task.assignedBy } : {}),
  };
}

function normalizeTaskQueue(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((task, idx) => normalizeTaskEntry(task, idx))
    .filter(Boolean);
}

function findTaskIndex(state, taskRef) {
  if (!state || !Array.isArray(state.taskQueue)) return -1;
  const taskRefString = normalizeMemberRef(taskRef);
  if (!taskRefString) return -1;
  for (let idx = 0; idx < state.taskQueue.length; idx++) {
    if (isMatchedTask(state.taskQueue[idx], taskRef)) {
      return idx;
    }
  }
  return -1;
}

function assignTaskToMemberInState(state, taskRef, memberId, assignedBy) {
  const memberRef = normalizeMemberRef(memberId);
  const idx = findTaskIndex(state, taskRef);
  if (idx < 0) {
    return { state, assigned: false, reason: 'not_found' };
  }

  const task = state.taskQueue[idx];
  const existingAssignee = normalizeMemberRef(task.assignee);
  if (existingAssignee && existingAssignee !== memberRef) {
    return { state, assigned: false, reason: 'already_assigned' };
  }

  const nextTask = { ...task };
  nextTask.assignee = memberRef || nextTask.assignee;
  if (!memberRef) {
    delete nextTask.assignee;
    delete nextTask.status;
    delete nextTask.assignedAt;
    delete nextTask.assignedBy;
  } else {
    nextTask.status = nextTask.status || 'assigned';
    nextTask.assignedAt = nowString();
    nextTask.assignedBy = assignedBy || 'team-idle';
  }

  state.taskQueue[idx] = nextTask;
  return {
    state,
    assigned: !!memberRef,
    alreadyAssigned: existingAssignee === memberRef,
    task: nextTask,
  };
}

function releaseTaskAssignmentsForMemberInState(state, memberId) {
  const target = normalizeMemberRef(memberId);
  if (!target || !Array.isArray(state.taskQueue) || state.taskQueue.length === 0) {
    return { state, updated: false };
  }

  let updated = false;
  state.taskQueue = state.taskQueue.map((task) => {
    if (!task || normalizeMemberRef(task.assignee) !== target) return task;
    updated = true;
    return {
      ...task,
      assignee: undefined,
      status: undefined,
      assignedAt: undefined,
      assignedBy: undefined,
    };
  });

  if (!updated) return { state, updated: false };
  return { state, updated: true };
}

/**
 * member 정규화
 */
function normalizeMember(member) {
  if (!member || typeof member !== 'object') return null;
  const id = member.id || member.memberId || null;
  if (!id) return null;
  return {
    id,
    status: member.status || 'idle',
    currentTask: member.currentTask || null,
    startedAt: member.startedAt || null,
    lastSeenAt: member.lastSeenAt || member.updatedAt || null,
    joinedAt: member.joinedAt || null,
  };
}

/**
 * 상태 정규화
 */
function normalizeState(state) {
  const normalized = { ...defaultState(), ...(state || {}) };
  normalized.members = Array.isArray(normalized.members)
    ? normalized.members.map((member) => normalizeMember(member)).filter(Boolean)
    : [];
  normalized.taskQueue = normalizeTaskQueue(normalized.taskQueue);
  normalized.completedTasks = Array.isArray(normalized.completedTasks) ? normalized.completedTasks : [];
  normalized.history = Array.isArray(normalized.history) ? normalized.history : [];
  return normalized;
}

/**
 * 마지막 활동 시각
 */
function lastSeenAt(member, fallback) {
  if (!member || typeof member !== 'object') return fallback;
  const value = member.lastSeenAt || member.updatedAt || member.joinedAt || member.startedAt;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * 히스토리 이벤트 추가
 */
function appendHistory(state, event, data) {
  if (!event) return;
  state.history.push({
    event,
    at: new Date().toISOString(),
    ...(data || {}),
  });
  if (state.history.length > MAX_HISTORY_EVENTS) {
    state.history = state.history.slice(-MAX_HISTORY_EVENTS);
  }
}

/**
 * 원자적 쓰기
 */
function writeAtomically(filePath, content) {
  io.ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.tmp`;
  io.writeFile(tmpPath, content);
  try {
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch { /* ignore */ }
    throw err;
  }
}

/**
 * 팀 상태 로드
 */
function loadTeamState(projectRoot) {
  const statePath = getStatePath(projectRoot);
  const data = io.readJson(statePath);
  return normalizeState(data);
}

/**
 * 팀 상태 저장
 */
function saveTeamState(projectRoot, state) {
  const statePath = getStatePath(projectRoot);
  const merged = normalizeState(state);
  merged.updatedAt = new Date().toISOString();
  writeAtomically(statePath, JSON.stringify(merged, null, 2));
}

/**
 * 멤버 상태 업데이트
 */
function updateMemberStatus(projectRoot, agentId, status, currentTask) {
  return io.withFileLock(getStatePath(projectRoot), () => {
    const state = loadTeamState(projectRoot);
    const member = state.members.find(m => m.id === agentId);
    const now = nowString();

    if (member) {
      member.status = status;
      member.currentTask = currentTask || null;
      member.lastSeenAt = now;
      member.updatedAt = now;
      if (!member.joinedAt) member.joinedAt = now;
    } else {
      state.members.push({
        id: agentId,
        status,
        currentTask: currentTask || null,
        joinedAt: now,
        lastSeenAt: now,
        updatedAt: now,
      });
    }

    appendHistory(state, 'member_status_updated', {
      memberId: agentId,
      status,
    });
    saveTeamState(projectRoot, state);
    return state;
  });
}

function assignTaskToMember(projectRoot, taskRef, memberId, assignedBy = 'team-idle') {
  return io.withFileLock(getStatePath(projectRoot), () => {
    const state = loadTeamState(projectRoot);
    const result = assignTaskToMemberInState(state, taskRef, memberId, assignedBy);
    if (!result.assigned && !result.alreadyAssigned) {
      return result;
    }

    if (result.assigned) {
      appendHistory(state, 'task_assigned', {
        taskId: taskRef,
        memberId: memberId,
        task: result.task,
      });
    } else if (result.alreadyAssigned) {
      appendHistory(state, 'task_assign_reused', {
        taskId: taskRef,
        memberId: memberId,
      });
    }

    saveTeamState(projectRoot, state);
    return result;
  });
}

function releaseTaskAssignmentsForMember(projectRoot, memberId) {
  return io.withFileLock(getStatePath(projectRoot), () => {
    const state = loadTeamState(projectRoot);
    const target = normalizeMemberRef(memberId);
    if (!target) return { state, updated: false };

    let updated = false;
    state.taskQueue = state.taskQueue.map((task) => {
      if (!task || normalizeMemberRef(task.assignee) !== target) return task;
      updated = true;
      return {
        ...task,
        assignee: undefined,
        status: undefined,
        assignedAt: undefined,
        assignedBy: undefined,
      };
    });
    if (!updated) return { state, updated: false };

    appendHistory(state, 'task_unassigned', {
      memberId: target,
    });
    saveTeamState(projectRoot, state);
    return { state, updated };
  });
}

/**
 * 작업 완료 기록
 */
function recordTaskCompletion(projectRoot, agentId, taskId, result) {
  return io.withFileLock(getStatePath(projectRoot), () => {
    const state = loadTeamState(projectRoot);
    const hasTaskId = taskId !== undefined && taskId !== null;
    const now = nowString();

    state.completedTasks.push({
      agentId,
      taskId: hasTaskId ? taskId : '(untracked)',
      result: result || 'completed',
      completedAt: now,
    });

    // 해당 멤버 상태 idle로
    const member = state.members.find(m => m.id === agentId);
    if (member) {
      member.status = 'idle';
      member.currentTask = null;
      member.lastSeenAt = now;
      member.updatedAt = now;
    }

    // 작업 큐에서 제거
    if (hasTaskId) {
      state.taskQueue = state.taskQueue.filter(t => !isMatchedTask(t, taskId));
    }
    releaseTaskAssignmentsForMemberInState(state, agentId);

    appendHistory(state, 'task_completed', {
      memberId: agentId,
      taskId,
      result: result || 'completed',
    });
    saveTeamState(projectRoot, state);
    return state;
  });
}

/**
 * 팀 설정 변경 시 taskQueue 동기화
 */
function syncTaskQueue(projectRoot, options = {}) {
  return io.withFileLock(getStatePath(projectRoot), () => {
    const state = loadTeamState(projectRoot);
    const targetFeature = options.feature || state.feature;
    const targetPhase = options.phase || state.currentPhase;
    const targetPattern = options.pattern || state.pattern;
    const refresh = options.forceRefresh === true;
    const hasFreshContext = Boolean(targetFeature && targetPhase);
    const contextChanged = state.currentPhase !== targetPhase || state.feature !== targetFeature || state.pattern !== targetPattern;
    const shouldResetQueue = refresh || contextChanged || !Array.isArray(state.taskQueue) || state.taskQueue.length === 0;

    if (hasFreshContext && shouldResetQueue) {
      state.taskQueue = normalizeTaskQueue(options.taskQueue || []);
      state.currentPhase = targetPhase;
      state.feature = targetFeature;
      state.pattern = targetPattern || state.pattern;
      appendHistory(state, 'task_queue_initialized', {
        feature: targetFeature,
        phase: targetPhase,
        pattern: state.pattern,
        taskCount: state.taskQueue.length,
        forced: refresh || contextChanged,
      });
    } else if (state.currentPhase !== targetPhase) {
      state.currentPhase = targetPhase;
    } else if (state.feature !== targetFeature) {
      state.feature = targetFeature;
    } else if (targetPattern && state.pattern !== targetPattern) {
      state.pattern = targetPattern;
    }

    // queue 미정의 시에도 항목이 있으면 복구
    if ((!Array.isArray(state.taskQueue) || state.taskQueue.length === 0) && hasFreshContext && Array.isArray(options.taskQueue) && options.taskQueue.length > 0) {
      state.taskQueue = normalizeTaskQueue(options.taskQueue);
      appendHistory(state, 'task_queue_initialized', {
        feature: targetFeature,
        phase: targetPhase,
        pattern: state.pattern,
        taskCount: state.taskQueue.length,
        forced: false,
      });
    }

    saveTeamState(projectRoot, state);
    return state;
  });
}

/**
 * 오랫동안 활동 없는 멤버 정리
 */
function cleanupStaleMembers(projectRoot, staleMemberMs = DEFAULT_STALE_MEMBER_MS) {
  return io.withFileLock(getStatePath(projectRoot), () => {
    let state = loadTeamState(projectRoot);
    const limit = Number(staleMemberMs);
    if (!Number.isFinite(limit) || limit <= 0) {
      return { state, removedMemberIds: [] };
    }

    const now = Date.now();
    const removedMembers = [];
    const remainMembers = [];
    for (const member of state.members) {
      const seen = lastSeenAt(member, now);
      const stale = member.status !== 'active' && seen <= now - limit;
      if (stale) {
        removedMembers.push(member.id);
        continue;
      }
      remainMembers.push(member);
    }

    if (removedMembers.length === 0) {
      return { state, removedMemberIds: [] };
    }

    for (const memberId of removedMembers) {
      const updatedState = releaseTaskAssignmentsForMemberInState(state, memberId);
      state = updatedState.state;
    }

    state.members = remainMembers;
    appendHistory(state, 'members_pruned', {
      removedMembers,
      removedCount: removedMembers.length,
      taskReassigned: true,
    });
    saveTeamState(projectRoot, state);
    return { state, removedMemberIds: removedMembers };
  });
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
  io.withFileLock(getStatePath(projectRoot), () => {
    saveTeamState(projectRoot, defaultState());
  });
}

module.exports = {
  loadTeamState,
  saveTeamState,
  updateMemberStatus,
  recordTaskCompletion,
  syncTaskQueue,
  cleanupStaleMembers,
  assignTaskToMember,
  releaseTaskAssignmentsForMember,
  normalizeTaskEntry,
  getActiveMembers,
  clearTeamState,
  appendHistory,
};
