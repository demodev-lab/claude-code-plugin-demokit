/**
 * TeammateIdle Hook
 * 서브에이전트가 idle 상태로 들어갈 때 다음 작업 제안
 */
const path = require('path');
const { resolveAgentIdFromHook, resolveWorktreePathFromHook } = require(path.join(__dirname, '..', 'lib', 'team', 'agent-id'));

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData = {};
  try {
    if (input && input.trim()) hookData = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({}));
    return;
  }

  const { platform, hookRuntime } = require(path.join(__dirname, '..', 'lib', 'core'));
  const { teamConfig, stateWriter, coordinator, orchestrator } = require(path.join(__dirname, '..', 'lib', 'team'));

  const projectRoot = platform.findProjectRoot(process.cwd());
  if (!projectRoot || !teamConfig.isTeamEnabled()) {
    console.log(JSON.stringify({}));
    return;
  }

  const shouldRun = hookRuntime.shouldRun({
    eventName: 'TeammateIdle',
    scriptKey: 'teamIdleHandler',
    eventFallback: true,
    scriptFallback: true,
  });
  if (!shouldRun) {
    console.log(JSON.stringify({}));
    return;
  }

  const teammate = resolveAgentIdFromHook(hookData);
  const worktreePath = resolveWorktreePathFromHook(hookData, process.cwd());
  if (!teammate) {
    process.stderr.write('[demokit] team-idle-handler: teammate identifier is missing; skip team assignment suggestion.\n');
    console.log(JSON.stringify({}));
    return;
  }

  // 단일 withTeamLock으로 cleanup + idle 마킹 + sync + assign을 일괄 처리
  const cleanupPolicy = teamConfig.getCleanupPolicy ? teamConfig.getCleanupPolicy() : {};
  const messages = [`[demokit] Subagent idle: ${teammate}`];

  const result = stateWriter.withTeamLock(projectRoot, () => {
    const state = stateWriter.loadTeamState(projectRoot);
    if (!state.enabled) return { enabled: false };

    // 1. stale member cleanup (inline)
    if (cleanupPolicy?.staleMemberMs && Array.isArray(state.members)) {
      const now = Date.now();
      state.members = state.members.filter(m => {
        if (!m.lastActiveAt) return true;
        return now - new Date(m.lastActiveAt).getTime() < cleanupPolicy.staleMemberMs;
      });
    }

    // 2. 멤버 idle 상태로 마킹
    let member = state.members.find(m => m.id === teammate);
    if (!member) {
      member = { id: teammate, status: 'idle', currentTask: null, worktreePath, lastActiveAt: new Date().toISOString() };
      state.members.push(member);
    } else {
      member.status = 'idle';
      member.currentTask = null;
      if (worktreePath) member.worktreePath = worktreePath;
      member.lastActiveAt = new Date().toISOString();
    }

    // 3. PDCA → taskQueue 동기화 (inline, 락 없는 orchestrator 호출)
    try {
      orchestrator.syncTeamQueueFromPdca(projectRoot, stateWriter);
    } catch { /* ignore */ }

    // 4. 다음 작업 할당 판단
    const freshState = stateWriter.loadTeamState(projectRoot);
    const next = coordinator.getNextAssignment(freshState, null, teammate);

    if (next && next.nextAgent === teammate) {
      const assignmentRef = next.nextTaskId || next.nextTask;
      // inline assign
      const task = Array.isArray(freshState.taskQueue)
        ? freshState.taskQueue.find(t => (t.id || t.description || t.subject) === assignmentRef)
        : null;
      if (task && (!task.assignee || task.assignee === teammate)) {
        task.assignee = teammate;
        task.status = 'in_progress';
        task.assignedBy = 'team-idle';
        // 멤버 active로 전환
        const m = freshState.members.find(x => x.id === teammate);
        if (m) { m.status = 'active'; m.currentTask = assignmentRef; m.lastActiveAt = new Date().toISOString(); }
        stateWriter.saveTeamState(projectRoot, freshState);
        return { enabled: true, assigned: true, next, freshState };
      }
      stateWriter.saveTeamState(projectRoot, freshState);
      return { enabled: true, assigned: false, freshState };
    }

    stateWriter.saveTeamState(projectRoot, freshState);
    return { enabled: true, assigned: false, next, freshState };
  });

  if (!result || !result.enabled) {
    console.log(JSON.stringify({}));
    return;
  }

  if (result.assigned && result.next) {
    messages.push(`할당: ${result.next.nextTask}`);
    if (result.next.nextTaskId) messages.push(`작업 ID: ${result.next.nextTaskId}`);
  } else if (result.freshState?.taskQueue?.length > 0) {
    const t = result.freshState.taskQueue[0];
    const nextDesc = typeof t === 'string' ? t : (t?.description || t?.subject || t?.task || t?.id);
    messages.push(`현재 대기 작업: ${nextDesc || '미할당'}`);
    if (result.next) messages.push(`다음 할당 대상: ${result.next.nextAgent}`);
  } else {
    messages.push('현재 대기 작업이 없습니다.');
  }

  console.log(JSON.stringify({ systemMessage: messages.join('\n') }));
}

main().catch(err => {
  console.error(`[demokit] team-idle-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
