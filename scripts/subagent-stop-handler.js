/**
 * SubagentStop Hook
 * 서브에이전트 종료 시 상태를 team-state.json에 반영
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
  const { teamConfig, stateWriter } = require(path.join(__dirname, '..', 'lib', 'team'));

  const projectRoot = platform.findProjectRoot(process.cwd());
  if (!projectRoot || !teamConfig.isTeamEnabled()) {
    console.log(JSON.stringify({}));
    return;
  }

  const shouldRun = hookRuntime.shouldRun({
    eventName: 'SubagentStop',
    scriptKey: 'subagentStopHandler',
    eventFallback: true,
    scriptFallback: true,
  });
  if (!shouldRun) {
    console.log(JSON.stringify({}));
    return;
  }

  const teammate = resolveAgentIdFromHook(hookData);
  if (!teammate) {
    process.stderr.write('[demokit] subagent-stop-handler: teammate identifier is missing; skip team state update.\n');
    console.log(JSON.stringify({}));
    return;
  }

  const isSuccess = hookData.exit_code === undefined || hookData.exit_code === 0
    || hookData.transcript_path != null;
  const finalStatus = isSuccess ? 'idle' : 'failed';

  const taskId = hookData.task_id
    || hookData.tool_input?.task_id
    || hookData.tool_input?.command
    || null;
  const worktreePath = resolveWorktreePathFromHook(hookData, process.cwd());

  if (taskId) {
    stateWriter.recordTaskCompletion(projectRoot, teammate, taskId, finalStatus === 'idle' ? 'completed' : 'failed', { worktreePath });
  } else {
    // 단일 withTeamLock으로 release + updateStatus 통합
    stateWriter.withTeamLock(projectRoot, () => {
      const state = stateWriter.loadTeamState(projectRoot);
      // release task assignments
      if (Array.isArray(state.taskQueue)) {
        for (const task of state.taskQueue) {
          if (task.assignee === teammate && task.status === 'in_progress') {
            task.assignee = null;
            task.status = 'pending';
          }
        }
      }
      // update member status
      const member = state.members?.find(m => m.id === teammate);
      if (member) {
        member.status = finalStatus;
        member.currentTask = null;
        if (worktreePath) member.worktreePath = worktreePath;
        member.lastActiveAt = new Date().toISOString();
      }
      stateWriter.saveTeamState(projectRoot, state);
    });
  }

  // Agent Trace
  try {
    if (hookRuntime.shouldRun({ scriptKey: 'agentTraceEnabled', scriptFallback: false })) {
      const trace = require(path.join(__dirname, '..', 'dist', 'lib', 'analytics', 'agent-trace'));
      const sessionId = trace.resolveSessionId(hookData);
      const lastStart = trace.findLastStart(projectRoot, sessionId, teammate);
      const durationMs = lastStart ? Date.now() - new Date(lastStart.timestamp).getTime() : null;
      trace.appendTrace(projectRoot, sessionId, {
        timestamp: new Date().toISOString(),
        event: 'stop',
        agentId: teammate,
        taskDescription: taskId,
        worktreePath,
        exitCode: hookData.exit_code ?? null,
        durationMs,
      });
    }
  } catch { /* trace 실패 시 무시 */ }

  const result = {
    systemMessage: `[demokit] 서브에이전트 종료: ${teammate} (${finalStatus})`,
  };
  console.log(JSON.stringify(result));
}

main().catch(err => {
  console.error(`[demokit] subagent-stop-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
