/**
 * Agent identifier extraction helpers for hook payloads
 */
function normalizeAgentId(agentId) {
  if (agentId === undefined || agentId === null) return '';
  const normalized = String(agentId).trim();
  return normalized;
}

function resolveAgentIdFromHook(hookData) {
  if (!hookData || typeof hookData !== 'object') return '';
  return normalizeAgentId(
    hookData.agent_name
    || hookData.agent_id
    || hookData.teammate_id
    || hookData.subagent_id
    || hookData.tool_input?.name
    || hookData.tool_input?.agent_id
    || hookData.tool_input?.teammate_id
    || hookData.tool_input?.subagent_id
    || null
  );
}

function normalizePathValue(value) {
  if (value === undefined || value === null) return '';
  const normalized = String(value).trim();
  return normalized;
}

function resolveWorktreePathFromHook(hookData, fallbackPath = '') {
  const fallback = normalizePathValue(fallbackPath);
  if (!hookData || typeof hookData !== 'object') return fallback;

  const resolved = normalizePathValue(
    hookData.worktreePath
    || hookData.worktree_path
    || hookData.worktree?.path
    || hookData.workingDirectory
    || hookData.working_directory
    || hookData.cwd
    || hookData.workdir
    || hookData.projectRoot
    || hookData.project_root
    || hookData.tool_input?.worktreePath
    || hookData.tool_input?.worktree_path
    || hookData.tool_input?.workingDirectory
    || hookData.tool_input?.working_directory
    || hookData.tool_input?.cwd
    || hookData.tool_input?.workdir
    || hookData.tool_input?.projectRoot
    || hookData.tool_input?.project_root
    || ''
  );

  return resolved || fallback;
}

module.exports = {
  normalizeAgentId,
  resolveAgentIdFromHook,
  resolveWorktreePathFromHook,
};
