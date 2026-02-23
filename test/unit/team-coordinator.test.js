const { canParallelize, resolveTaskDependencies, isMatchedTask, getNextAssignment } = require('../../lib/team/coordinator');

describe('Team Coordinator', () => {
  describe('canParallelize', () => {
    it('독립 레이어 → true', () => {
      expect(canParallelize({ description: 'entity' }, { description: 'dto' })).toBe(true);
    });

    it('의존 레이어 → false', () => {
      expect(canParallelize({ description: 'repository' }, { description: 'entity' })).toBe(false);
    });

    it('레이어 없는 작업 → true', () => {
      expect(canParallelize({ description: 'unknown' }, { description: 'other' })).toBe(true);
    });
  });

  describe('isMatchedTask', () => {
    it('id 매칭', () => {
      expect(isMatchedTask({ id: 'task-1' }, 'task-1')).toBe(true);
    });

    it('subject 매칭', () => {
      expect(isMatchedTask({ subject: 'entity 작업' }, 'entity 작업')).toBe(true);
    });

    it('부분 매칭', () => {
      expect(isMatchedTask({ id: 'user-api:plan:architect' }, 'architect')).toBe(true);
    });

    it('null/undefined → false', () => {
      expect(isMatchedTask(null, 'test')).toBe(false);
      expect(isMatchedTask({ id: 'test' }, null)).toBe(false);
    });
  });

  describe('getNextAssignment', () => {
    it('다음 작업 반환', () => {
      const teamState = {
        members: [
          { id: 'agent-a', status: 'idle', currentTask: null },
        ],
        taskQueue: [
          { id: 'task-1', description: '첫 번째 작업' },
          { id: 'task-2', description: '두 번째 작업' },
        ],
      };
      const next = getNextAssignment(teamState, null);
      expect(next).not.toBeNull();
      expect(next.nextAgent).toBe('agent-a');
    });

    it('빈 queue → null', () => {
      const teamState = { members: [{ id: 'a', status: 'idle' }], taskQueue: [] };
      expect(getNextAssignment(teamState, null)).toBeNull();
    });

    it('idle 멤버 없으면 → null', () => {
      const teamState = {
        members: [{ id: 'a', status: 'active', currentTask: 'busy' }],
        taskQueue: [{ id: 'task-1', description: 'test' }],
      };
      expect(getNextAssignment(teamState, null)).toBeNull();
    });
  });
});
