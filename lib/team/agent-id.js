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

module.exports = {
  normalizeAgentId,
  resolveAgentIdFromHook,
};
