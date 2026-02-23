/**
 * Coordinator
 * 작업 분배/조율 (Spring Boot 레이어 의존성 기반)
 */

const { LAYER_DEPENDENCIES, LAYER_FILE_PATTERNS } = require('./layer-constants');

const ROLE_LAYER_HINTS = {
  'spring-architect': 'config',
  'domain-expert': 'entity',
  'api-expert': 'controller',
  'service-expert': 'service',
  'test-expert': 'test',
  'gap-detector': 'test',
  'pdca-iterator': 'test',
  'report-generator': 'dto',
  'code-reviewer': 'controller',
  'security-expert': 'exception',
  'infra-expert': 'config',
  'dba-expert': 'entity',
  'devops-engineer': 'config',
  'qa-monitor': 'test',
};

const PHASE_TASK_PATTERNS = {
  plan: '요구사항 정리',
  design: '설계 산출물 작성',
  do: '기능 구현 실행',
  analyze: 'Gap 분석',
  iterate: '반복 수정',
  report: '보고서 정리',
};

const TASK_ID_EMPTY_VALUE = 'task';

/**
 * 두 작업이 병렬 실행 가능한지 (레이어 의존성 기반)
 */
function canParallelize(task1, task2) {
  const layer1 = extractLayer(task1);
  const layer2 = extractLayer(task2);

  if (!layer1 || !layer2) return true;

  const deps1 = LAYER_DEPENDENCIES[layer1] || [];
  const deps2 = LAYER_DEPENDENCIES[layer2] || [];

  // 서로 의존하지 않으면 병렬 가능
  return !deps1.includes(layer2) && !deps2.includes(layer1);
}

/**
 * 작업에서 레이어 추출
 */
function extractLayer(task) {
  if (!task) return null;
  const lower =
    typeof task === 'string'
      ? task
      : (task.description || task.subject || task.task || task.summary || '').toString();

  const normalized = lower.toLowerCase();
  for (const layer of Object.keys(LAYER_DEPENDENCIES)) {
    if (normalized.includes(layer)) return layer;
  }

  const role = (typeof task === 'string'
    ? ''
    : ((task.role || task?.metadata?.role || '').toString().toLowerCase()));
  return ROLE_LAYER_HINTS[role] || null;
}

function slugifyTaskId(value) {
  return (value || TASK_ID_EMPTY_VALUE)
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-+)|(-+$)/g, '')
    || TASK_ID_EMPTY_VALUE;
}

/**
 * 작업 대상별 기본 태스크 생성
 */
function buildTaskCatalog(feature, phase, members) {
  if (!feature || !phase || !Array.isArray(members) || members.length === 0) return [];

  return members.map((member, idx) => {
    const normalizedMember = String(member || `member-${idx + 1}`).trim() || `member-${idx + 1}`;
    const layer = ROLE_LAYER_HINTS[normalizedMember] || null;
    const phaseDesc = PHASE_TASK_PATTERNS[phase] || `${phase} 작업`;
    const subject = `[${phase.toUpperCase()}] ${normalizedMember}`;
    const description = `${feature}의 ${phaseDesc}: ${normalizedMember}${layer ? ` (${layer})` : ''}`;

    return {
      id: `${slugifyTaskId(feature)}:${slugifyTaskId(phase)}:${slugifyTaskId(normalizedMember)}`,
      subject,
      description,
      layer,
      metadata: {
        feature,
        phase,
        role: normalizedMember,
      },
    };
  });
}

/**
 * taskQueue 형식 정규화
 */
function normalizeTaskQueueTask(task, index) {
  if (!task) return null;
  if (typeof task === 'string') {
    return {
      id: `string-${index + 1}-${slugifyTaskId(task)}`,
      subject: task,
      description: task,
    };
  }

  const normalized = task;
  const description = typeof normalized.description === 'string' && normalized.description.trim()
    ? normalized.description
    : typeof normalized.task === 'string' && normalized.task.trim()
      ? normalized.task
      : normalized.subject || TASK_ID_EMPTY_VALUE;
  const subject = typeof normalized.subject === 'string' && normalized.subject.trim()
    ? normalized.subject
    : description;
  return {
    id: normalized.id || `obj-${index + 1}-${slugifyTaskId(normalized.subject || description)}`,
    subject,
    description,
    ...(normalized.layer ? { layer: normalized.layer } : {}),
    ...(normalized.metadata ? { metadata: normalized.metadata } : {}),
    ...(Array.isArray(normalized.ownFiles) && normalized.ownFiles.length > 0 ? { ownFiles: normalized.ownFiles } : {}),
  };
}

/**
 * phase + 멤버 기반 queue 생성 (id/description 단일 포맷)
 */
function createTaskQueueFromPhase(feature, phase, members) {
  if (!feature || !phase || !Array.isArray(members) || members.length === 0) return [];
  const catalog = buildTaskCatalog(feature, phase, members);
  const withLayers = resolveTaskDependencies(catalog);
  return withLayers
    .map((task, idx) => normalizeTaskQueueTask(task, idx))
    .filter(Boolean);
}

function buildTaskQueueFromPhase(feature, phase, members) {
  return createTaskQueueFromPhase(feature, phase, members);
}

function isMatchedTask(task, completedTaskId) {
  if (!task || completedTaskId === undefined || completedTaskId === null) return false;
  const candidate = completedTaskId?.toString().trim();
  if (!candidate) return false;

  const normalizedCandidate = candidate.toString().toLowerCase().trim();
  const compactCandidate = normalizedCandidate
    .replace(/\s+/g, '')
    .replace(/[-_().,:]/g, '');

  const ids = new Set([
    task?.id,
    task?.taskId,
    task?.task,
    task?.subject,
    task?.description,
    task?.metadata?.role,
    task?.role,
  ].map(v => (v ? v.toString().trim() : '').toLowerCase()));

  if (ids.has(normalizedCandidate)) return true;

  const compactMatch = new Set();
  for (const id of ids) {
    if (!id) continue;
    compactMatch.add(id.replace(/\s+/g, '').replace(/[-_().,:]/g, ''));
  }

  if (compactMatch.has(compactCandidate)) return true;

  const MIN_PARTIAL_LEN = 8;
  const PLACEHOLDER_IDS = new Set(['task', '(새 작업 추적 불가)']);

  for (const id of ids) {
    if (!id || PLACEHOLDER_IDS.has(id)) continue;
    // 부분 매칭: 양쪽 모두 MIN_PARTIAL_LEN 이상일 때만
    if (id.length >= MIN_PARTIAL_LEN && normalizedCandidate.length >= MIN_PARTIAL_LEN) {
      if (id.includes(normalizedCandidate) || normalizedCandidate.includes(id)) {
        return true;
      }
    }
    // compact 매칭도 동일 기준 적용
    const compact = id.replace(/\s+/g, '').replace(/[-_().,:]/g, '');
    if (!compact || compact.length < MIN_PARTIAL_LEN) continue;
    if (compactCandidate.length < MIN_PARTIAL_LEN) continue;
    if (compact.includes(compactCandidate) || compactCandidate.includes(compact)) {
      return true;
    }
  }

  return false;
}

function normalizeMemberRef(memberId) {
  if (memberId === null || memberId === undefined) return '';
  return String(memberId).trim().toLowerCase();
}

function isTaskReservedByOther(task, preferredAgentRef) {
  const assignee = normalizeMemberRef(task?.assignee);
  if (!assignee) return false;
  if (!preferredAgentRef) return false;
  return assignee !== preferredAgentRef;
}

/**
 * 토폴로지 정렬 (의존성 기반)
 */
function resolveTaskDependencies(tasks) {
  if (!tasks || tasks.length === 0) return [];

  // 레이어 추출
  const withLayers = tasks.map(task => ({
    task,
    layer: extractLayer(task),
  }));

  // 레이어가 있는 작업을 의존성 순서로 정렬
  const layerOrder = ['entity', 'dto', 'config', 'exception', 'repository', 'service', 'controller', 'test'];

  return withLayers
    .sort((a, b) => {
      const idxA = a.layer ? layerOrder.indexOf(a.layer) : -1;
      const idxB = b.layer ? layerOrder.indexOf(b.layer) : -1;
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    })
    .map(item => {
      const patterns = item.layer ? LAYER_FILE_PATTERNS[item.layer] : null;
      if (patterns) {
        return { ...item.task, ownFiles: [...patterns] };
      }
      return item.task;
    });
}

/**
 * 다음 할당할 작업 결정
 */
function getNextAssignment(teamState, completedTaskId, preferredAgentId) {
  if (!teamState || !teamState.taskQueue || teamState.taskQueue.length === 0) return null;

  // 완료된 작업을 큐에서 제거
  const normalizedCompletedTaskId = completedTaskId === null || completedTaskId === undefined
    ? ''
    : completedTaskId.toString().trim();

  const activeTaskIds = new Set((teamState.members || [])
    .filter(m => m.status === 'active' && m.currentTask)
    .map(m => m.currentTask)
    .filter(Boolean)
    .map(v => v.toString().trim().toLowerCase()));
  const members = teamState.members || [];
  const preferredAgent = preferredAgentId
    ? members.find(m => m.id === preferredAgentId && m.status === 'idle')
    : null;
  const preferredAgentRef = normalizeMemberRef(preferredAgent ? preferredAgent.id : '');

  const remaining = teamState.taskQueue.filter((t) => {
    const isCompleted = normalizedCompletedTaskId
      ? isMatchedTask(t, normalizedCompletedTaskId)
      : false;
    if (isCompleted) return false;

    // 이미 다른 멤버에 예약된 작업은 제외
    if (isTaskReservedByOther(t, preferredAgentRef)) return false;

    const assignedToActive = Array.from(activeTaskIds)
      .some(activeTaskId => isMatchedTask(t, activeTaskId));
    return !assignedToActive;
  });

  if (remaining.length === 0) return null;

  const nextTask = remaining[0];
  const roleMatchedTasks = preferredAgent ? remaining.filter((task) => {
    const taskRole = (task?.metadata?.role || task?.role || '').toString().toLowerCase();
    return taskRole && taskRole === preferredAgent.id?.toString().toLowerCase();
  }) : [];

  const nextTaskForPreferred = roleMatchedTasks.length > 0 ? roleMatchedTasks[0] : null;
  const selectedTask = preferredAgent && nextTaskForPreferred ? nextTaskForPreferred : nextTask;
  const idleMember = preferredAgent || members.find(m => m.status === 'idle');

  if (!idleMember) return null;

  return {
    nextAgent: idleMember.id,
    nextTaskId: selectedTask?.id || selectedTask?.taskId || selectedTask?.description || null,
    nextTask: typeof selectedTask === 'string'
      ? selectedTask
      : (selectedTask?.description || selectedTask?.task || selectedTask?.subject || '(새 작업 추적 불가)'),
  };
}

module.exports = {
  LAYER_DEPENDENCIES,
  canParallelize,
  resolveTaskDependencies,
  isMatchedTask,
  buildTaskQueueFromPhase,
  extractLayer,
  getNextAssignment,
};
