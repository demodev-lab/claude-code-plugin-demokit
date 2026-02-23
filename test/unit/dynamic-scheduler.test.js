const { resolveAlternateAgent, reassignFailedTask, buildSpawnHelperPayload } = require('../../lib/team/dynamic-scheduler');

describe('dynamic-scheduler', () => {
  describe('resolveAlternateAgent', () => {
    it('policy에 대체 agent 있으면 해당 agent 반환', () => {
      const policy = { agentPolicies: { 'alt-agent': { successRate: 0.8 } } };
      expect(resolveAlternateAgent('service', 'service-expert', policy)).toBe('alt-agent');
    });

    it('policy 비어있고 static default ≠ current → static default', () => {
      const policy = { agentPolicies: {} };
      expect(resolveAlternateAgent('service', 'other-agent', policy)).toBe('service-expert');
    });

    it('policy 비어있고 static default = current → null', () => {
      const policy = { agentPolicies: {} };
      expect(resolveAlternateAgent('service', 'service-expert', policy)).toBeNull();
    });

    it('successRate ≤ 0.5인 후보만 있으면 skip → static fallback', () => {
      const policy = { agentPolicies: { 'weak-agent': { successRate: 0.3 } } };
      // current와 static이 같으면 null
      expect(resolveAlternateAgent('service', 'service-expert', policy)).toBeNull();
    });

    it('null layer → null', () => {
      expect(resolveAlternateAgent(null, 'agent', {})).toBeNull();
    });

    it('여러 후보 중 successRate 가장 높은 agent 반환', () => {
      const policy = {
        agentPolicies: {
          'a': { successRate: 0.6 },
          'b': { successRate: 0.9 },
          'c': { successRate: 0.7 },
        },
      };
      expect(resolveAlternateAgent('service', 'service-expert', policy)).toBe('b');
    });
  });

  describe('reassignFailedTask', () => {
    it('대체 agent 결정 시 reassigned: true', () => {
      const policy = { agentPolicies: { 'alt-agent': { successRate: 0.8 } } };
      const result = reassignFailedTask({ layer: 'service', agentId: 'service-expert', failureClass: 'verify_fail' }, policy);
      expect(result.reassigned).toBe(true);
      expect(result.reassignedAgent).toBe('alt-agent');
      expect(result.reason).toContain('verify_fail');
    });

    it('대체 없으면 reassigned: false, 기존 agent 유지', () => {
      const policy = { agentPolicies: {} };
      const result = reassignFailedTask({ layer: 'service', agentId: 'service-expert', failureClass: 'agent_error' }, policy);
      expect(result.reassigned).toBe(false);
      expect(result.reassignedAgent).toBe('service-expert');
    });

    it('null failedTaskInfo → null', () => {
      expect(reassignFailedTask(null, {})).toBeNull();
    });
  });

  describe('buildSpawnHelperPayload', () => {
    it('정상 context → structured payload', () => {
      const ctx = { layer: 'service', errorDetails: 'err', worktreePath: '/tmp/wt', branchName: 'b', waveIndex: 1, failureClass: 'verify_fail' };
      const result = buildSpawnHelperPayload(ctx, { featureSlug: 'feat-x' });
      expect(result.targetLayer).toBe('service');
      expect(result.ownFiles).toEqual(expect.arrayContaining(['src/**/service/**']));
      expect(result.suggestedApproach).toContain('테스트 실패');
      expect(result.spawnAgent).toBe('service-expert');
      expect(result.featureSlug).toBe('feat-x');
    });

    it('verify_fail → 테스트 실패 포함', () => {
      const ctx = { layer: 'controller', failureClass: 'verify_fail' };
      const result = buildSpawnHelperPayload(ctx, {});
      expect(result.suggestedApproach).toContain('테스트 실패');
    });

    it('merge_conflict → conflict 포함', () => {
      const ctx = { layer: 'entity', failureClass: 'merge_conflict' };
      const result = buildSpawnHelperPayload(ctx, {});
      expect(result.suggestedApproach).toContain('conflict');
    });

    it('null layer → null', () => {
      expect(buildSpawnHelperPayload({ layer: null }, {})).toBeNull();
    });

    it('waveState.featureSlug 추출', () => {
      const ctx = { layer: 'dto', failureClass: 'agent_error' };
      const result = buildSpawnHelperPayload(ctx, { featureSlug: 'my-feature' });
      expect(result.featureSlug).toBe('my-feature');
    });

    it('waveIndex 0 → 0 반환 (falsy 값이지만 유효)', () => {
      const ctx = { layer: 'entity', waveIndex: 0, failureClass: 'agent_error' };
      const result = buildSpawnHelperPayload(ctx, {});
      expect(result.waveIndex).toBe(0);
    });

    it('null context → null', () => {
      expect(buildSpawnHelperPayload(null, {})).toBeNull();
    });
  });
});
