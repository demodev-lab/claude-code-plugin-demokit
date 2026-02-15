/**
 * Team 오케스트레이션 통합 테스트
 * 팀 구성 → 작업 분배 → 완료 흐름
 */
const { distributeWork, getNextAssignment, buildTaskQueueFromPhase, isMatchedTask } = require('../../lib/team/coordinator');

describe('Team Orchestration Integration', () => {
  const teamMembers = ['spring-architect', 'domain-expert', 'api-expert'];

  describe('팀 구성 → 작업 분배 → 완료 흐름', () => {
    it('leader 패턴으로 순차 작업 분배', () => {
      const tasks = [
        { description: 'entity 모델 설계', subject: 'Entity 설계' },
        { description: 'repository 구현', subject: 'Repository 구현' },
        { description: 'service 로직 구현', subject: 'Service 구현' },
      ];

      // 작업 분배
      const assignments = distributeWork(teamMembers, tasks, 'leader');
      expect(assignments).toHaveLength(3);
      expect(assignments[0].agent).toBe('spring-architect');
      expect(assignments[1].agent).toBe('domain-expert');
      expect(assignments[2].agent).toBe('api-expert');

      // 모두 순차
      assignments.forEach(a => expect(a.parallel).toBe(false));
    });

    it('pipeline 패턴으로 스테이지 기반 분배', () => {
      const tasks = [
        { description: 'entity 작업' },
        { description: 'service 작업' },
        { description: 'controller 작업' },
      ];

      const assignments = distributeWork(teamMembers, tasks, 'pipeline');

      // 의존성 순서: entity → service → controller
      expect(assignments).toHaveLength(3);
      expect(assignments[0].stage).toBe(1);
      expect(assignments[0].dependsOn).toBeNull();
      expect(assignments[1].stage).toBe(2);
      expect(assignments[1].dependsOn).toBeDefined();
      expect(assignments[2].stage).toBe(3);
    });

    it('swarm 패턴으로 병렬 가능한 작업 식별', () => {
      const tasks = [
        { description: 'entity 모델 작업' },
        { description: 'dto 정의 작업' },
        { description: 'service 구현 작업' },
      ];

      const assignments = distributeWork(teamMembers, tasks, 'swarm');
      expect(assignments).toHaveLength(3);

      // entity와 dto는 독립적이므로 병렬 가능
      // 의존성 정렬 후 첫 작업은 항상 parallel:true
      expect(assignments[0].parallel).toBe(true);
    });

    it('council 패턴으로 전체 분석', () => {
      const tasks = [{ description: '전체 코드 리뷰' }];
      const assignments = distributeWork(teamMembers, tasks, 'council');
      expect(assignments).toHaveLength(3);
      assignments.forEach(a => {
        expect(a.parallel).toBe(true);
        expect(a.task).toEqual(tasks);
      });
    });
  });

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
