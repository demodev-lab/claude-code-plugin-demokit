const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const stateWriter = require('../../lib/team/state-writer');

describe('team/state-writer worktree metadata', () => {
  function createProjectRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-team-state-'));
    fs.mkdirSync(path.join(root, '.demodev'), { recursive: true });
    return root;
  }

  it('stores worktreePath on member status update', () => {
    const root = createProjectRoot();
    try {
      stateWriter.updateMemberStatus(root, 'agent-a', 'active', 'task-1', { worktreePath: '/tmp/worktrees/a' });
      const state = stateWriter.loadTeamState(root);
      expect(state.members).toHaveLength(1);
      expect(state.members[0].id).toBe('agent-a');
      expect(state.members[0].worktreePath).toBe('/tmp/worktrees/a');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('propagates member worktreePath into completedTasks', () => {
    const root = createProjectRoot();
    try {
      stateWriter.updateMemberStatus(root, 'agent-a', 'active', 'task-1', { worktreePath: '/tmp/worktrees/a' });
      stateWriter.recordTaskCompletion(root, 'agent-a', 'task-1', 'completed');
      const state = stateWriter.loadTeamState(root);
      expect(state.completedTasks).toHaveLength(1);
      expect(state.completedTasks[0].worktreePath).toBe('/tmp/worktrees/a');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
