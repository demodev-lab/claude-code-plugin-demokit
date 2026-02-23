const {
  resolveAgentForLayer,
  buildWaveDispatchInstructions,
  LAYER_AGENT_MAP,
} = require('../../lib/team/wave-dispatcher');

describe('team/wave-dispatcher', () => {
  describe('resolveAgentForLayer', () => {
    it('entity → domain-expert', () => {
      expect(resolveAgentForLayer('entity')).toBe('domain-expert');
    });

    it('repository → dba-expert', () => {
      expect(resolveAgentForLayer('repository')).toBe('dba-expert');
    });

    it('test → test-expert', () => {
      expect(resolveAgentForLayer('test')).toBe('test-expert');
    });

    it('null → null', () => {
      expect(resolveAgentForLayer(null)).toBeNull();
    });

    it('undefined → null', () => {
      expect(resolveAgentForLayer(undefined)).toBeNull();
    });

    it('unknown layer → null', () => {
      expect(resolveAgentForLayer('unknown')).toBeNull();
    });

    it('대소문자 무시', () => {
      expect(resolveAgentForLayer('Entity')).toBe('domain-expert');
      expect(resolveAgentForLayer('SERVICE')).toBe('service-expert');
    });
  });

  describe('buildWaveDispatchInstructions', () => {
    function makeWaveState(overrides = {}) {
      return {
        featureSlug: 'test-feat',
        currentWave: 1,
        totalWaves: 2,
        status: 'in_progress',
        waves: [
          {
            waveIndex: 1,
            status: 'in_progress',
            tasks: [
              { layer: 'entity', status: 'in_progress', worktreePath: '/tmp/wt/entity', branchName: 'wave-1/test-feat/entity' },
              { layer: 'dto', status: 'in_progress', worktreePath: '/tmp/wt/dto', branchName: 'wave-1/test-feat/dto' },
            ],
          },
          {
            waveIndex: 2,
            status: 'pending',
            tasks: [
              { layer: 'service', status: 'pending', worktreePath: null, branchName: 'wave-2/test-feat/service' },
            ],
          },
        ],
        ...overrides,
      };
    }

    it('in_progress tasks → 마크다운에 병렬, worktreePath, branchName, agent 포함', () => {
      const state = makeWaveState();
      const md = buildWaveDispatchInstructions(state, 1);
      expect(md).toContain('병렬');
      expect(md).toContain('/tmp/wt/entity');
      expect(md).toContain('wave-1/test-feat/entity');
      expect(md).toContain('domain-expert');
      expect(md).toContain('/tmp/wt/dto');
      expect(md).toContain('report-generator');
      expect(md).toContain('Wave Dispatch');
    });

    it('null waveState → 빈 문자열', () => {
      expect(buildWaveDispatchInstructions(null, 1)).toBe('');
    });

    it('잘못된 waveIndex → 빈 문자열', () => {
      const state = makeWaveState();
      expect(buildWaveDispatchInstructions(state, 99)).toBe('');
    });

    it('pending tasks only → 빈 문자열', () => {
      const state = makeWaveState();
      state.waves[0].status = 'in_progress';
      state.waves[0].tasks.forEach(t => { t.status = 'pending'; });
      expect(buildWaveDispatchInstructions(state, 1)).toBe('');
    });

    it('pending wave → 빈 문자열', () => {
      const state = makeWaveState();
      expect(buildWaveDispatchInstructions(state, 2)).toBe('');
    });

    it('waves 배열 없으면 빈 문자열', () => {
      expect(buildWaveDispatchInstructions({ status: 'in_progress' }, 1)).toBe('');
    });

    it('wave.tasks가 undefined면 빈 문자열 (손상된 상태 방어)', () => {
      const state = {
        waves: [{ waveIndex: 1, status: 'in_progress', tasks: undefined }],
      };
      expect(buildWaveDispatchInstructions(state, 1)).toBe('');
    });

    it('layer 없는 in_progress task는 무시', () => {
      const state = {
        waves: [{
          waveIndex: 1,
          status: 'in_progress',
          tasks: [
            { layer: null, status: 'in_progress' },
            { layer: 'entity', status: 'in_progress', worktreePath: '/tmp/wt/e' },
          ],
        }],
      };
      const md = buildWaveDispatchInstructions(state, 1);
      expect(md).toContain('entity');
      expect(md).toContain('1개 task');
      expect(md).not.toContain('null');
    });

    it('unknown layer → agent fallback으로 layer 이름 사용', () => {
      const state = {
        waves: [{
          waveIndex: 1,
          status: 'in_progress',
          tasks: [{ layer: 'custom-layer', status: 'in_progress', worktreePath: '/tmp/wt/custom' }],
        }],
      };
      const md = buildWaveDispatchInstructions(state, 1);
      expect(md).toContain('custom-layer');
    });
  });
});
