/**
 * Coordinator
 * 작업 분배/조율 (Spring Boot 레이어 의존성 기반)
 */

// Spring Boot 레이어 의존성 그래프
const LAYER_DEPENDENCIES = {
  entity: [],
  dto: [],
  config: [],
  exception: [],
  repository: ['entity'],
  service: ['entity', 'repository', 'dto'],
  controller: ['service', 'dto', 'exception'],
  test: ['entity', 'repository', 'service', 'controller', 'dto'],
};

/**
 * 작업 분배
 */
function distributeWork(members, tasks, pattern) {
  if (!members || !tasks || tasks.length === 0) return [];

  switch (pattern) {
    case 'swarm': return distributeSwarm(members, tasks);
    case 'council': return distributeCouncil(members, tasks);
    case 'leader':
    default: return distributeLeader(members, tasks);
  }
}

/**
 * leader: 첫 번째 멤버(또는 리더)가 순차적으로 처리
 */
function distributeLeader(members, tasks) {
  return tasks.map((task, idx) => ({
    agent: members[idx % members.length],
    task,
    order: idx,
    parallel: false,
  }));
}

/**
 * council: 각 멤버에게 전체 작업을 독립 할당 (병렬 분석)
 */
function distributeCouncil(members, tasks) {
  return members.map(member => ({
    agent: member,
    task: tasks, // 전체 작업을 모두 분석
    order: 0,
    parallel: true,
  }));
}

/**
 * swarm: 의존성 순서대로 병렬/순차 실행
 */
function distributeSwarm(members, tasks) {
  const sorted = resolveTaskDependencies(tasks);
  const memberIdx = {};
  members.forEach((m, i) => { memberIdx[m] = i; });

  return sorted.map((task, idx) => ({
    agent: members[idx % members.length],
    task,
    order: idx,
    parallel: canParallelizeAtPosition(sorted, idx),
  }));
}

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
  if (typeof task === 'string') {
    const lower = task.toLowerCase();
    for (const layer of Object.keys(LAYER_DEPENDENCIES)) {
      if (lower.includes(layer)) return layer;
    }
  }
  return null;
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
      if (idxA === -1) return -1;
      if (idxB === -1) return 1;
      return idxA - idxB;
    })
    .map(item => item.task);
}

/**
 * 정렬된 작업 리스트에서 해당 위치 작업이 이전 작업과 병렬 가능한지
 */
function canParallelizeAtPosition(sortedTasks, idx) {
  if (idx === 0) return true;
  return canParallelize(sortedTasks[idx - 1], sortedTasks[idx]);
}

/**
 * 다음 할당할 작업 결정
 */
function getNextAssignment(teamState, completedTaskId) {
  if (!teamState || !teamState.taskQueue || teamState.taskQueue.length === 0) return null;

  // 완료된 작업을 큐에서 제거
  const remaining = teamState.taskQueue.filter(t =>
    (typeof t === 'string' ? t : t.id) !== completedTaskId
  );

  if (remaining.length === 0) return null;

  const nextTask = remaining[0];
  const members = teamState.members || [];
  // idle 상태인 멤버 찾기 (active는 이미 작업 중이므로 제외)
  const idleMember = members.find(m => m.status === 'idle');

  if (!idleMember) return null;

  return {
    nextAgent: idleMember.id,
    nextTask: typeof nextTask === 'string' ? nextTask : nextTask.description,
  };
}

module.exports = {
  LAYER_DEPENDENCIES,
  distributeWork,
  canParallelize,
  resolveTaskDependencies,
  getNextAssignment,
};
