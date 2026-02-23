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

  let state = stateWriter.loadTeamState(projectRoot);
  if (!state.enabled) {
    console.log(JSON.stringify({}));
    return;
  }

  const cleanupPolicy = teamConfig.getCleanupPolicy ? teamConfig.getCleanupPolicy() : {};
  if (cleanupPolicy?.staleMemberMs) {
    stateWriter.cleanupStaleMembers(projectRoot, cleanupPolicy.staleMemberMs);
    state = stateWriter.loadTeamState(projectRoot);
  }

  stateWriter.updateMemberStatus(projectRoot, teammate, 'idle', null, { worktreePath });
  orchestrator.syncTeamQueueFromPdca(projectRoot, stateWriter);
  const latest = stateWriter.loadTeamState(projectRoot);
  const next = coordinator.getNextAssignment(latest, null, teammate);

  const messages = [`[demokit] Subagent idle: ${teammate}`];
  if (next && next.nextAgent === teammate) {
    const assignmentRef = next.nextTaskId || next.nextTask;
    const assigned = stateWriter.assignTaskToMember(projectRoot, assignmentRef, teammate, 'team-idle');
    if (assigned?.assigned || assigned?.alreadyAssigned) {
      stateWriter.updateMemberStatus(projectRoot, teammate, 'active', assignmentRef, { worktreePath });
      messages.push(`할당: ${next.nextTask}`);
      if (next.nextTaskId) messages.push(`작업 ID: ${next.nextTaskId}`);
    } else {
      messages.push('현재 작업은 다른 멤버에 의해 선점되었거나 사라졌습니다.');
      const queueState = stateWriter.loadTeamState(projectRoot);
      if (queueState.taskQueue.length > 0) {
        messages.push(`대기 작업: ${queueState.taskQueue[0]?.description || queueState.taskQueue[0]?.subject || '(미할당)'}`);
      } else {
        messages.push('현재 대기 작업이 없습니다.');
      }
    }
  } else if (latest.taskQueue.length > 0) {
    const nextDesc = typeof latest.taskQueue[0] === 'string'
      ? latest.taskQueue[0]
      : (latest.taskQueue[0]?.description || latest.taskQueue[0]?.subject || latest.taskQueue[0]?.task || latest.taskQueue[0]?.id);
    messages.push(`현재 대기 작업: ${nextDesc || '미할당'}`);
    if (next) messages.push(`다음 할당 대상: ${next.nextAgent}`);
  } else {
    messages.push('현재 대기 작업이 없습니다.');
  }

  console.log(JSON.stringify({ systemMessage: messages.join('\n') }));
}

main().catch(err => {
  console.error(`[demokit] team-idle-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
