const {
  TEAM_STRATEGIES, getTeammateRoles, getRecommendedTeammateCount,
  getPhaseExecutionPattern, getCtoAgent,
} = require('../../lib/team/strategy');

describe('Team Strategy', () => {
  describe('TEAM_STRATEGIES', () => {
    it('Starter, Monolith, MSA 3개 전략 정의', () => {
      expect(Object.keys(TEAM_STRATEGIES)).toEqual(['Starter', 'Monolith', 'MSA']);
    });
  });

  describe('getRecommendedTeammateCount', () => {
    it('Starter → 0명', () => {
      expect(getRecommendedTeammateCount('Starter')).toBe(0);
    });

    it('Monolith → 3명', () => {
      expect(getRecommendedTeammateCount('Monolith')).toBe(3);
    });

    it('MSA → 5명', () => {
      expect(getRecommendedTeammateCount('MSA')).toBe(5);
    });

    it('존재하지 않는 레벨 → 0', () => {
      expect(getRecommendedTeammateCount('Unknown')).toBe(0);
    });
  });

  describe('getTeammateRoles', () => {
    it('Starter → 빈 배열', () => {
      expect(getTeammateRoles('Starter')).toEqual([]);
    });

    it('Monolith → 3개 role', () => {
      const roles = getTeammateRoles('Monolith');
      expect(roles).toHaveLength(3);
      expect(roles.map(r => r.name)).toEqual([
        'architect-role', 'implementation-role', 'quality-role',
      ]);
    });

    it('MSA → 4개 role (watchdog 추가)', () => {
      const roles = getTeammateRoles('MSA');
      expect(roles).toHaveLength(4);
      expect(roles.map(r => r.name)).toContain('watchdog-role');
    });

    it('MSA roles에 agents, phases 포함', () => {
      const roles = getTeammateRoles('MSA');
      for (const role of roles) {
        expect(role.agents).toBeDefined();
        expect(role.agents.length).toBeGreaterThan(0);
        expect(role.phases).toBeDefined();
        expect(role.phases.length).toBeGreaterThan(0);
      }
    });

    it('존재하지 않는 레벨 → 빈 배열', () => {
      expect(getTeammateRoles('Unknown')).toEqual([]);
    });
  });

  describe('getPhaseExecutionPattern', () => {
    it('Starter 모든 phase → single', () => {
      expect(getPhaseExecutionPattern('Starter', 'plan')).toBe('single');
      expect(getPhaseExecutionPattern('Starter', 'do')).toBe('single');
    });

    it('Monolith do → swarm', () => {
      expect(getPhaseExecutionPattern('Monolith', 'do')).toBe('swarm');
    });

    it('Monolith analyze → council', () => {
      expect(getPhaseExecutionPattern('Monolith', 'analyze')).toBe('council');
    });

    it('MSA plan → council', () => {
      expect(getPhaseExecutionPattern('MSA', 'plan')).toBe('council');
    });

    it('MSA iterate → swarm', () => {
      expect(getPhaseExecutionPattern('MSA', 'iterate')).toBe('swarm');
    });

    it('존재하지 않는 레벨 → single', () => {
      expect(getPhaseExecutionPattern('Unknown', 'plan')).toBe('single');
    });
  });

  describe('getCtoAgent', () => {
    it('Starter → null', () => {
      expect(getCtoAgent('Starter')).toBeNull();
    });

    it('Monolith → cto-lead', () => {
      expect(getCtoAgent('Monolith')).toBe('cto-lead');
    });

    it('MSA → cto-lead', () => {
      expect(getCtoAgent('MSA')).toBe('cto-lead');
    });
  });
});
