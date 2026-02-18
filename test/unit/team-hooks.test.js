const {
  NEXT_PHASE_MAP, assignNextTeammateWork, handleTeammateIdle, shouldRecomposeTeam,
} = require('../../lib/team/hooks');

describe('Team Hooks', () => {
  describe('NEXT_PHASE_MAP', () => {
    it('phase 전환 매핑 정의', () => {
      expect(NEXT_PHASE_MAP.plan).toBe('design');
      expect(NEXT_PHASE_MAP.design).toBe('do');
      expect(NEXT_PHASE_MAP.do).toBe('analyze');
      expect(NEXT_PHASE_MAP.analyze).toBe('iterate');
      expect(NEXT_PHASE_MAP.iterate).toBe('analyze');
      expect(NEXT_PHASE_MAP.report).toBeNull();
    });
  });

  describe('assignNextTeammateWork', () => {
    it('plan → design 전환', () => {
      const result = assignNextTeammateWork('plan', 'auth', 'Monolith');
      expect(result.nextPhase).toBe('design');
      expect(result.team).toBeDefined();
      expect(result.team.pattern).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(result.notice).toBeDefined();
    });

    it('report → null (마지막 phase)', () => {
      const result = assignNextTeammateWork('report', 'auth', 'Monolith');
      expect(result.nextPhase).toBeNull();
      expect(result.tasks).toEqual([]);
      expect(result.notice).toBeNull();
    });

    it('do → analyze 전환 (Monolith)', () => {
      const result = assignNextTeammateWork('do', 'auth', 'Monolith');
      expect(result.nextPhase).toBe('analyze');
      expect(result.team.pattern).toBe('council');
    });

    it('Starter 레벨에서 plan → design', () => {
      const result = assignNextTeammateWork('plan', 'auth', 'Starter');
      expect(result.nextPhase).toBe('design');
      expect(result.team.members).toEqual([]);
      expect(result.team.pattern).toBe('single');
    });

    it('MSA 레벨에서 do → analyze', () => {
      const result = assignNextTeammateWork('do', 'auth', 'MSA');
      expect(result.nextPhase).toBe('analyze');
      expect(result.team.pattern).toBe('watchdog');
      expect(result.team.members.length).toBeGreaterThan(0);
    });

    it('notice에 phase transition 정보 포함', () => {
      const result = assignNextTeammateWork('plan', 'auth', 'Monolith');
      expect(result.notice).not.toBeNull();
      expect(result.notice.type).toBe('phase_transition');
    });
  });

  describe('handleTeammateIdle', () => {
    it('pdcaStatus 없으면 null 반환', () => {
      expect(handleTeammateIdle('dev-1', null)).toBeNull();
      expect(handleTeammateIdle('dev-1', {})).toBeNull();
    });

    it('feature 있으면 작업 탐색 시도', () => {
      // task-queue에 할당된 작업이 없으므로 null
      const result = handleTeammateIdle('dev-1', {
        feature: 'auth',
        currentPhase: 'do',
      });
      expect(result).toBeNull();
    });
  });

  describe('shouldRecomposeTeam', () => {
    it('같은 패턴 → false', () => {
      // Monolith: plan=leader, design=leader
      expect(shouldRecomposeTeam('plan', 'design', 'Monolith')).toBe(false);
    });

    it('다른 패턴 → true', () => {
      // Monolith: design=leader, do=swarm
      expect(shouldRecomposeTeam('design', 'do', 'Monolith')).toBe(true);
    });

    it('do=swarm → analyze=council → true', () => {
      expect(shouldRecomposeTeam('do', 'analyze', 'Monolith')).toBe(true);
    });

    it('Starter 모든 전환 → false (모두 single)', () => {
      expect(shouldRecomposeTeam('plan', 'design', 'Starter')).toBe(false);
      expect(shouldRecomposeTeam('do', 'analyze', 'Starter')).toBe(false);
    });
  });
});
