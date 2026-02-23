const { resolveAgentIdFromHook, resolveWorktreePathFromHook } = require('../../lib/team/agent-id');

describe('team/agent-id', () => {
  it('resolveAgentIdFromHook extracts teammate id', () => {
    expect(resolveAgentIdFromHook({ teammate_id: 'dev-1' })).toBe('dev-1');
  });

  it('resolveWorktreePathFromHook prefers explicit payload path', () => {
    const hookData = { worktreePath: '/tmp/worktrees/agent-a' };
    expect(resolveWorktreePathFromHook(hookData, '/tmp/fallback')).toBe('/tmp/worktrees/agent-a');
  });

  it('resolveWorktreePathFromHook supports tool_input fields', () => {
    const hookData = { tool_input: { working_directory: '/tmp/worktrees/agent-b' } };
    expect(resolveWorktreePathFromHook(hookData, '/tmp/fallback')).toBe('/tmp/worktrees/agent-b');
  });

  it('resolveWorktreePathFromHook uses fallback when payload has no path', () => {
    expect(resolveWorktreePathFromHook({}, '/tmp/fallback')).toBe('/tmp/fallback');
  });
});
