const {
  MIN_RUNS_FOR_POLICY,
  LOW_SUCCESS_THRESHOLD,
  SLOW_LAYER_RATIO,
  loadPolicy,
  rebuildPolicy,
  getPolicySuggestions,
  computeLayerPolicy,
  computeAgentPolicy,
  computeWaveGroupingSuggestion,
} = require('../../lib/team/policy-learner');

jest.mock('../../lib/core', () => ({
  io: {
    fileExists: jest.fn(() => false),
    readJson: jest.fn(() => null),
    writeJson: jest.fn(),
    ensureDir: jest.fn(),
    withFileLock: jest.fn((filePath, fn) => fn()),
  },
}));

jest.mock('../../lib/team/wave-metrics', () => ({
  loadMetrics: jest.fn(() => ({ version: '1.0', runs: [] })),
}));

const { io } = require('../../lib/core');
const { loadMetrics } = require('../../lib/team/wave-metrics');

describe('team/policy-learner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('computeLayerPolicy', () => {
    it('성공률 계산', () => {
      const tasks = [
        { layer: 'entity', status: 'completed', durationMs: 1000 },
        { layer: 'entity', status: 'completed', durationMs: 2000 },
        { layer: 'entity', status: 'failed', durationMs: 500, failureClass: 'agent_error' },
      ];
      const policy = computeLayerPolicy(tasks);
      expect(policy.successRate).toBeCloseTo(2 / 3);
      expect(policy.avgDurationMs).toBeCloseTo(1166.67, 0);
      expect(policy.failurePattern).toBe('agent_error');
      expect(policy.suggestion).toContain('entity');
    });

    it('100% 성공 시 suggestion null', () => {
      const tasks = [
        { layer: 'dto', status: 'completed', durationMs: 500 },
        { layer: 'dto', status: 'completed', durationMs: 600 },
      ];
      const policy = computeLayerPolicy(tasks);
      expect(policy.successRate).toBe(1);
      expect(policy.suggestion).toBeNull();
    });

    it('빈 배열 → null', () => {
      expect(computeLayerPolicy([])).toBeNull();
    });
  });

  describe('computeAgentPolicy', () => {
    it('성공률 70% 미만 시 suggestion', () => {
      const tasks = [
        { agent: 'domain-expert', status: 'completed' },
        { agent: 'domain-expert', status: 'failed' },
        { agent: 'domain-expert', status: 'failed' },
      ];
      const policy = computeAgentPolicy(tasks);
      expect(policy.successRate).toBeCloseTo(1 / 3);
      expect(policy.suggestion).toContain('domain-expert');
    });

    it('성공률 충분 → suggestion null', () => {
      const tasks = [
        { agent: 'test-expert', status: 'completed' },
        { agent: 'test-expert', status: 'completed' },
      ];
      const policy = computeAgentPolicy(tasks);
      expect(policy.successRate).toBe(1);
      expect(policy.suggestion).toBeNull();
    });
  });

  describe('computeWaveGroupingSuggestion', () => {
    it('느린 layer 감지', () => {
      const layerPolicies = {
        entity: { avgDurationMs: 1000 },
        service: { avgDurationMs: 1000 },
        controller: { avgDurationMs: 5000 },
      };
      const suggestion = computeWaveGroupingSuggestion(layerPolicies);
      expect(suggestion).toContain('controller');
      expect(suggestion).toContain('별도 wave 분리');
    });

    it('균등 속도 → null', () => {
      const layerPolicies = {
        entity: { avgDurationMs: 1000 },
        service: { avgDurationMs: 1100 },
      };
      expect(computeWaveGroupingSuggestion(layerPolicies)).toBeNull();
    });

    it('null 입력 → null', () => {
      expect(computeWaveGroupingSuggestion(null)).toBeNull();
    });

    it('단일 entry → null', () => {
      expect(computeWaveGroupingSuggestion({ entity: { avgDurationMs: 1000 } })).toBeNull();
    });
  });

  describe('rebuildPolicy', () => {
    it('MIN_RUNS 미달 → policy 저장 안함', () => {
      loadMetrics.mockReturnValue({ version: '1.0', runs: [{ waves: [] }] });
      rebuildPolicy('/project');
      expect(io.writeJson).not.toHaveBeenCalled();
    });

    it('MIN_RUNS 충족 → policy 저장', () => {
      const runs = Array.from({ length: MIN_RUNS_FOR_POLICY }, () => ({
        waves: [{
          tasks: [
            { layer: 'entity', agent: 'domain-expert', status: 'completed', durationMs: 1000 },
          ],
        }],
      }));
      loadMetrics.mockReturnValue({ version: '1.0', runs });
      rebuildPolicy('/project');
      expect(io.writeJson).toHaveBeenCalledTimes(1);
      const savedData = io.writeJson.mock.calls[0][1];
      expect(savedData.layerPolicies.entity).toBeDefined();
      expect(savedData.agentPolicies['domain-expert']).toBeDefined();
    });
  });

  describe('getPolicySuggestions', () => {
    it('파일 없음 → 빈 배열', () => {
      io.fileExists.mockReturnValue(false);
      const suggestions = getPolicySuggestions('/project');
      expect(suggestions).toEqual([]);
    });

    it('suggestion 있는 policy → 배열 반환', () => {
      io.fileExists.mockReturnValue(true);
      io.readJson.mockReturnValue({
        version: '1.0',
        layerPolicies: {
          entity: { suggestion: 'entity layer 성공률 50%' },
          dto: { suggestion: null },
        },
        agentPolicies: {
          'domain-expert': { suggestion: 'domain-expert agent 성공률 30%' },
        },
        waveGroupingSuggestion: 'controller layer 느림',
      });
      const suggestions = getPolicySuggestions('/project');
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].type).toBe('layer');
      expect(suggestions[1].type).toBe('agent');
      expect(suggestions[2].type).toBe('wave_grouping');
    });
  });
});
