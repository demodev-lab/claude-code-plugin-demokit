/**
 * SubagentStop Hook
 * 서브에이전트 종료 시 상태를 team-state.json에 반영
 */
const path = require('path');
const { resolveAgentIdFromHook } = require(path.join(__dirname, '..', 'lib', 'team', 'agent-id'));

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

  const { platform } = require(path.join(__dirname, '..', 'lib', 'core'));
  const { teamConfig, stateWriter } = require(path.join(__dirname, '..', 'lib', 'team'));

  const projectRoot = platform.findProjectRoot(process.cwd());
  if (!projectRoot || !teamConfig.isTeamEnabled()) {
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

  if (taskId) {
    stateWriter.recordTaskCompletion(projectRoot, teammate, taskId, finalStatus === 'idle' ? 'completed' : 'failed');
  } else {
    stateWriter.releaseTaskAssignmentsForMember(projectRoot, teammate);
    stateWriter.updateMemberStatus(projectRoot, teammate, finalStatus, null);
  }

  const result = {
    systemMessage: `[demokit] 서브에이전트 종료: ${teammate} (${finalStatus})`,
  };
  console.log(JSON.stringify(result));
}

main().catch(err => {
  console.error(`[demokit] subagent-stop-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
