/**
 * Team 오케스트레이션 통합 테스트
 * 작업 큐 관리 및 매칭 흐름
 */
const { getNextAssignment, isMatchedTask } = require('../../lib/team/coordinator');

describe('Team Orchestration Integration', () => {
  describe('작업 큐 관리', () => {
    it('다음 작업 할당 + 완료 처리', () => {
      const teamState = {
        members: [
          { id: 'agent-a', status: 'idle', currentTask: null },
          { id: 'agent-b', status: 'idle', currentTask: null },
        ],
        taskQueue: [
          { id: 'task-1', description: 'Entity 구현', subject: 'Entity' },
          { id: 'task-2', description: 'Service 구현', subject: 'Service' },
          { id: 'task-3', description: 'Controller 구현', subject: 'Controller' },
        ],
      };

      // 첫 번째 할당
      const first = getNextAssignment(teamState, null);
      expect(first.nextAgent).toBe('agent-a');

      // task-1 완료 후 다음 할당
      const second = getNextAssignment(teamState, 'task-1');
      expect(second).not.toBeNull();
      expect(second.nextTaskId).not.toBe('task-1');
    });

    it('모든 작업 완료 후 null', () => {
      const teamState = {
        members: [{ id: 'a', status: 'idle' }],
        taskQueue: [{ id: 'task-1', description: 'only task' }],
      };

      const result = getNextAssignment(teamState, 'task-1');
      expect(result).toBeNull();
    });
  });

  describe('작업 매칭', () => {
    it('다양한 형식의 task ID 매칭', () => {
      const task = {
        id: 'user-api:plan:spring-architect',
        subject: '[PLAN] spring-architect',
        description: 'user-api의 요구사항 정리: spring-architect',
        metadata: { role: 'spring-architect' },
      };

      // 정확한 id
      expect(isMatchedTask(task, 'user-api:plan:spring-architect')).toBe(true);
      // role 기반
      expect(isMatchedTask(task, 'spring-architect')).toBe(true);
      // 부분 매칭
      expect(isMatchedTask(task, 'plan:spring-architect')).toBe(true);
    });
  });
});
