const { distributeWork, distributePipeline, canParallelize, resolveTaskDependencies, isMatchedTask, getNextAssignment } = require('../../lib/team/coordinator');

describe('Team Coordinator', () => {
  describe('distributeWork', () => {
    const members = ['agent-a', 'agent-b', 'agent-c'];
    const tasks = [
      { description: 'entity 작업', subject: 'entity' },
      { description: 'service 작업', subject: 'service' },
      { description: 'controller 작업', subject: 'controller' },
    ];

    it('빈 입력 시 빈 배열', () => {
      expect(distributeWork([], tasks, 'leader')).toEqual([]);
      expect(distributeWork(members, [], 'leader')).toEqual([]);
      expect(distributeWork(null, tasks, 'leader')).toEqual([]);
    });

    describe('leader 패턴', () => {
      it('순차 할당, parallel=false', () => {
        const result = distributeWork(members, tasks, 'leader');
        expect(result).toHaveLength(3);
        result.forEach(r => expect(r.parallel).toBe(false));
      });

      it('기본 패턴으로 사용', () => {
        const result = distributeWork(members, tasks);
        expect(result).toHaveLength(3);
      });
    });

    describe('council 패턴', () => {
      it('각 멤버에 전체 작업 할당', () => {
        const result = distributeWork(members, tasks, 'council');
        expect(result).toHaveLength(3);
        result.forEach(r => {
          expect(r.parallel).toBe(true);
          expect(r.task).toEqual(tasks);
        });
      });
    });

    describe('swarm 패턴', () => {
      it('의존성 순서 정렬 + 병렬 여부 판단', () => {
        const result = distributeWork(members, tasks, 'swarm');
        expect(result).toHaveLength(3);
        expect(result[0]).toHaveProperty('parallel');
        expect(result[0]).toHaveProperty('isolation');
        expect(result[0]).toHaveProperty('layer');
        result.forEach(r => {
          if (r.parallel) {
            expect(r.isolation).toBe('worktree');
          } else {
            expect(r.isolation).toBeNull();
          }
        });
      });
    });

    describe('pipeline 패턴', () => {
      it('순차적 스테이지, stage/dependsOn 존재', () => {
        const result = distributeWork(members, tasks, 'pipeline');
        expect(result).toHaveLength(3);
        expect(result[0].stage).toBe(1);
        expect(result[0].dependsOn).toBeNull();
        expect(result[0].parallel).toBe(false);

        expect(result[1].stage).toBe(2);
        expect(result[1].dependsOn).toBeDefined();
        expect(result[1].parallel).toBe(false);
      });

      it('멤버보다 작업이 많으면 round-robin', () => {
        const manyTasks = [
          { description: 'task1' },
          { description: 'task2' },
          { description: 'task3' },
          { description: 'task4' },
          { description: 'task5' },
        ];
        const result = distributeWork(['a', 'b'], manyTasks, 'pipeline');
        expect(result).toHaveLength(5);
        expect(result[0].agent).toBe('a');
        expect(result[1].agent).toBe('b');
        expect(result[2].agent).toBe('a');
      });
    });
  });

  describe('distributePipeline', () => {
    it('빈 tasks → 빈 배열', () => {
      expect(distributePipeline(['a'], [])).toEqual([]);
      expect(distributePipeline(['a'], null)).toEqual([]);
    });
  });

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
