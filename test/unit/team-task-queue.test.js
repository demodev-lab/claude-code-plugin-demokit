const {
  createTeamTasks, clearAssignments,
} = require('../../lib/team/task-queue');

jest.mock('../../lib/core', () => ({
  debug: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('Team Task Queue', () => {
  beforeEach(() => clearAssignments());

  describe('createTeamTasks', () => {
    it('teammates별 작업 생성', () => {
      const tasks = createTeamTasks('do', 'auth', [
        { name: 'domain-expert', task: 'Entity 구현' },
        { name: 'service-expert', task: 'Service 구현' },
      ]);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].role).toBe('domain-expert');
      expect(tasks[0].subject).toContain('[Do]');
      expect(tasks[0].metadata.teamTask).toBe(true);
    });

    it('빈 teammates → 빈 배열', () => {
      expect(createTeamTasks('plan', 'auth', [])).toEqual([]);
      expect(createTeamTasks('plan', 'auth', null)).toEqual([]);
    });

    it('task 미지정 시 기본 description', () => {
      const tasks = createTeamTasks('plan', 'auth', [{ name: 'architect' }]);
      expect(tasks[0].description).toContain('Execute plan phase work');
    });

    it('name/role 모두 없어도 crash 없이 unknown 할당', () => {
      const tasks = createTeamTasks('do', 'auth', [{ task: 'some work' }]);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].role).toBe('unknown');
    });

    it('phase/feature가 null이면 빈 배열 반환 (crash 방지)', () => {
      expect(createTeamTasks(null, 'auth', [{ name: 'dev' }])).toEqual([]);
      expect(createTeamTasks('do', null, [{ name: 'dev' }])).toEqual([]);
      expect(createTeamTasks(undefined, 'auth', [{ name: 'dev' }])).toEqual([]);
    });
  });

  describe('clearAssignments', () => {
    it('noop 호출 시 crash 없음', () => {
      expect(() => clearAssignments()).not.toThrow();
    });
  });
});
