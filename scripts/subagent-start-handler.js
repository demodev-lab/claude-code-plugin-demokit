/**
 * SubagentStart Hook
 * 새 서브에이전트가 시작될 때 상태를 team-state.json에 기록
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
  const { teamConfig, stateWriter, orchestrator } = require(path.join(__dirname, '..', 'lib', 'team'));

  const projectRoot = platform.findProjectRoot(process.cwd());
  if (!projectRoot || !teamConfig.isTeamEnabled()) {
    console.log(JSON.stringify({}));
    return;
  }

  const shouldRun = hookRuntime.shouldRun({
    eventName: 'SubagentStart',
    scriptKey: 'subagentStartHandler',
    eventFallback: true,
    scriptFallback: true,
  });
  if (!shouldRun) {
    console.log(JSON.stringify({}));
    return;
  }

  const teammate = resolveAgentIdFromHook(hookData);
  if (!teammate) {
    process.stderr.write('[demokit] subagent-start-handler: teammate identifier is missing; skip team state update.\n');
    console.log(JSON.stringify({}));
    return;
  }

  const currentTask = hookData.tool_input?.prompt
    || hookData.tool_input?.task_description
    || hookData.prompt
    || null;
  const worktreePath = resolveWorktreePathFromHook(hookData, process.cwd());
  const cleanupPolicy = teamConfig.getCleanupPolicy ? teamConfig.getCleanupPolicy() : {};

  const currentState = stateWriter.loadTeamState(projectRoot);
  if (!currentState.enabled) {
    stateWriter.saveTeamState(projectRoot, { ...currentState, enabled: true });
  }
  if (cleanupPolicy.staleMemberMs) {
    stateWriter.cleanupStaleMembers(projectRoot, cleanupPolicy.staleMemberMs);
  }

  stateWriter.updateMemberStatus(projectRoot, teammate, 'active', currentTask, { worktreePath });

  // Agent Trace
  try {
    if (hookRuntime.shouldRun({ scriptKey: 'agentTraceEnabled', scriptFallback: false })) {
      const trace = require(path.join(__dirname, '..', 'dist', 'lib', 'analytics', 'agent-trace'));
      const sessionId = trace.resolveSessionId(hookData);
      trace.appendTrace(projectRoot, sessionId, {
        timestamp: new Date().toISOString(),
        event: 'start',
        agentId: teammate,
        taskDescription: currentTask,
        worktreePath,
        exitCode: null,
        durationMs: null,
      });
    }
  } catch { /* trace 실패 시 무시 */ }

  orchestrator.syncTeamQueueFromPdca(projectRoot, stateWriter);

  const result = {
    systemMessage: `[demokit] 서브에이전트 시작 감지: ${teammate}`,
  };
  console.log(JSON.stringify(result));
}

main().catch(err => {
  console.error(`[demokit] subagent-start-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
