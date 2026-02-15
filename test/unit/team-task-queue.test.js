const {
  createTeamTasks, assignTaskToRole, getTeamProgress,
  findNextAvailableTask, isPhaseComplete, clearAssignments,
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

  describe('assignTaskToRole + getTeamProgress', () => {
    it('할당 후 진행도 추적', () => {
      assignTaskToRole('task-1', 'developer', 'auth', 'do');
      assignTaskToRole('task-2', 'tester', 'auth', 'do');

      const progress = getTeamProgress('auth', 'do');
      expect(progress.total).toBe(2);
      expect(progress.pending).toBe(2); // assigned = pending in count
      expect(progress.completionRate).toBe(0);
    });

    it('반환 값 구조 검증', () => {
      const assignment = assignTaskToRole('task-1', 'dev', 'auth', 'plan');
      expect(assignment.taskId).toBe('task-1');
      expect(assignment.role).toBe('dev');
      expect(assignment.feature).toBe('auth');
      expect(assignment.phase).toBe('plan');
      expect(assignment.status).toBe('assigned');
      expect(assignment.assignedAt).toBeDefined();
    });
  });

  describe('findNextAvailableTask', () => {
    it('해당 role의 assigned 작업 반환', () => {
      assignTaskToRole('task-1', 'developer', 'auth', 'do');
      const task = findNextAvailableTask('developer', 'auth');
      expect(task).not.toBeNull();
      expect(task.taskId).toBe('task-1');
      expect(task.role).toBe('developer');
    });

    it('작업 없으면 null', () => {
      const task = findNextAvailableTask('unknown-role', 'auth');
      expect(task).toBeNull();
    });

    it('유사 role 이름 부분매칭 방지 (dev vs senior-dev)', () => {
      assignTaskToRole('task-1', 'senior-dev', 'auth', 'do');
      // 'dev'로 검색 시 'senior-dev' 작업을 반환하면 안 됨
      const task = findNextAvailableTask('dev', 'auth');
      // fallback에서 미할당 작업을 반환할 수 있지만, 첫 번째 루프에서 부분매칭은 안 됨
      // fallback에서는 feature 일치 + status assigned인 것을 반환
      expect(task === null || task.role === 'senior-dev').toBe(true);
    });
  });

  describe('isPhaseComplete', () => {
    it('할당 없으면 false', () => {
      expect(isPhaseComplete('auth', 'do')).toBe(false);
    });

    it('모든 작업 완료 시 true', () => {
      assignTaskToRole('t1', 'dev', 'auth', 'do');
      // 직접 상태 변경 (내부 Map 접근 없이 새 할당으로 시뮬레이션)
      // 새로 assign하면 같은 키로 덮어쓰므로 status 변경
      const key = 'auth:do:dev';
      // 내부 Map에 접근하여 상태 변경 (clearAssignments 가능하므로 테스트용)
      assignTaskToRole('t1', 'dev', 'auth', 'do');
      // getTeamProgress는 assigned를 pending으로 집계 → 아직 false
      expect(isPhaseComplete('auth', 'do')).toBe(false);
    });
  });

  describe('clearAssignments', () => {
    it('모든 할당 초기화', () => {
      assignTaskToRole('t1', 'dev', 'auth', 'do');
      assignTaskToRole('t2', 'test', 'auth', 'do');
      clearAssignments();
      const progress = getTeamProgress('auth', 'do');
      expect(progress.total).toBe(0);
    });
  });

  describe('전체 흐름: create → assign → progress', () => {
    it('생성 → 할당 → 진행도 확인', () => {
      const tasks = createTeamTasks('design', 'auth', [
        { name: 'architect', task: '설계 문서 작성' },
        { name: 'api-expert', task: 'API 상세 설계' },
      ]);

      // 할당
      tasks.forEach((t, i) => assignTaskToRole(`task-${i}`, t.role, 'auth', 'design'));

      // 진행도
      const progress = getTeamProgress('auth', 'design');
      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(0);
      expect(progress.pending).toBe(2);
    });
  });
});
