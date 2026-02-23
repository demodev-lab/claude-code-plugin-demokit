const path = require('path');
const {
  FAILURE_CLASSES,
  MAX_RUNS,
  loadMetrics,
  classifyFailure,
  buildRunMetrics,
  appendRunMetrics,
  getLayerStats,
  getAgentStats,
} = require('../../lib/team/wave-metrics');

jest.mock('../../lib/core', () => ({
  io: {
    fileExists: jest.fn(() => false),
    readJson: jest.fn(() => null),
    writeJson: jest.fn(),
    ensureDir: jest.fn(),
    withFileLock: jest.fn((filePath, fn) => fn()),
  },
}));

const { io } = require('../../lib/core');

describe('team/wave-metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyFailure', () => {
    it('verifyFailed에 layer 포함 → VERIFY_FAIL', () => {
      const task = { layer: 'entity', status: 'failed' };
      const mergeResult = { verifyFailed: ['entity'], conflictCount: 0, results: [] };
      expect(classifyFailure(task, mergeResult)).toBe(FAILURE_CLASSES.VERIFY_FAIL);
    });

    it('conflict layer 포함 → MERGE_CONFLICT', () => {
      const task = { layer: 'service', status: 'failed' };
      const mergeResult = { verifyFailed: [], conflictCount: 1, results: [{ layer: 'service', conflict: true }] };
      expect(classifyFailure(task, mergeResult)).toBe(FAILURE_CLASSES.MERGE_CONFLICT);
    });

    it('기본 → AGENT_ERROR', () => {
      const task = { layer: 'dto', status: 'failed' };
      expect(classifyFailure(task, null)).toBe(FAILURE_CLASSES.AGENT_ERROR);
    });
  });

  describe('buildRunMetrics', () => {
    it('summary 계산 정확', () => {
      const waveState = {
        featureSlug: 'test-feat',
        waves: [{
          waveIndex: 1,
          tasks: [
            { layer: 'entity', agentId: 'a1', status: 'completed', startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:01:00Z' },
            { layer: 'dto', agentId: 'a2', status: 'failed', startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:30Z' },
          ],
        }],
      };
      const result = buildRunMetrics(waveState, { completedAt: '2026-01-01T00:02:00Z' });
      expect(result.featureSlug).toBe('test-feat');
      expect(result.summary.totalTasks).toBe(2);
      expect(result.summary.completedTasks).toBe(1);
      expect(result.summary.failedTasks).toBe(1);
      expect(result.summary.successRate).toBe(0.5);
      expect(result.waves[0].durationMs).toBe(60000);
      expect(result.waves[0].tasks[0].durationMs).toBe(60000);
    });

    it('빈 state 방어', () => {
      const result = buildRunMetrics({ featureSlug: 'empty', waves: [] });
      expect(result.summary.totalTasks).toBe(0);
      expect(result.summary.successRate).toBe(0);
      expect(result.waves).toEqual([]);
    });

    it('mergeResult 전달 시 classifyFailure 활용', () => {
      const waveState = {
        featureSlug: 'test',
        waves: [{
          waveIndex: 1,
          tasks: [
            { layer: 'entity', status: 'failed', startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:01:00Z' },
          ],
        }],
      };
      const mergeResult = { verifyFailed: ['entity'], conflictCount: 0, results: [] };
      const result = buildRunMetrics(waveState, { mergeResult });
      expect(result.waves[0].tasks[0].failureClass).toBe('verify_fail');
    });

    it('음수 durationMs 무시', () => {
      const waveState = {
        featureSlug: 'test',
        waves: [{
          waveIndex: 1,
          tasks: [
            { layer: 'entity', status: 'completed', startedAt: '2026-01-01T00:01:00Z', completedAt: '2026-01-01T00:00:00Z' },
          ],
        }],
      };
      const result = buildRunMetrics(waveState);
      expect(result.waves[0].tasks[0].durationMs).toBeNull();
    });

    it('잘못된 timestamp → waveDurationMs null', () => {
      const waveState = {
        featureSlug: 'test',
        waves: [{
          waveIndex: 1,
          tasks: [
            { layer: 'entity', status: 'completed', startedAt: 'invalid', completedAt: 'also-invalid' },
          ],
        }],
      };
      const result = buildRunMetrics(waveState);
      expect(result.waves[0].durationMs).toBeNull();
      expect(result.waves[0].tasks[0].durationMs).toBeNull();
    });

    it('retryOf 카운트', () => {
      const waveState = {
        featureSlug: 'retry-test',
        waves: [{
          waveIndex: 2,
          tasks: [
            { layer: 'entity', status: 'completed', retryOf: 1 },
          ],
        }],
      };
      const result = buildRunMetrics(waveState);
      expect(result.summary.rescheduledTasks).toBe(1);
    });
  });

  describe('appendRunMetrics', () => {
    it('MAX_RUNS 초과 시 oldest 제거', () => {
      const existingRuns = Array.from({ length: MAX_RUNS }, (_, i) => ({ runId: `run-${i}` }));
      io.fileExists.mockReturnValue(true);
      io.readJson.mockReturnValue({ version: '1.0', runs: existingRuns });

      let savedData;
      io.writeJson.mockImplementation((_, data) => { savedData = data; });

      appendRunMetrics('/project', { runId: 'new-run' });

      expect(savedData.runs).toHaveLength(MAX_RUNS);
      expect(savedData.runs[savedData.runs.length - 1].runId).toBe('new-run');
      expect(savedData.runs[0].runId).toBe('run-1'); // run-0 제거됨
    });
  });

  describe('getLayerStats', () => {
    it('layer별 성공률/평균 duration', () => {
      io.fileExists.mockReturnValue(true);
      io.readJson.mockReturnValue({
        version: '1.0',
        runs: [{
          waves: [{
            tasks: [
              { layer: 'entity', status: 'completed', durationMs: 1000 },
              { layer: 'entity', status: 'completed', durationMs: 2000 },
              { layer: 'entity', status: 'failed', durationMs: 500 },
            ],
          }],
        }],
      });

      const stats = getLayerStats('/project', 'entity');
      expect(stats.count).toBe(3);
      expect(stats.successRate).toBeCloseTo(2 / 3);
      expect(stats.avgDurationMs).toBeCloseTo(1166.67, 0);
    });

    it('데이터 없으면 기본값', () => {
      io.fileExists.mockReturnValue(false);
      const stats = getLayerStats('/project', 'nonexistent');
      expect(stats.count).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('getAgentStats', () => {
    it('agent별 성공률', () => {
      io.fileExists.mockReturnValue(true);
      io.readJson.mockReturnValue({
        version: '1.0',
        runs: [{
          waves: [{
            tasks: [
              { agent: 'domain-expert', status: 'completed', durationMs: 1000 },
              { agent: 'domain-expert', status: 'failed', durationMs: 500 },
            ],
          }],
        }],
      });

      const stats = getAgentStats('/project', 'domain-expert');
      expect(stats.count).toBe(2);
      expect(stats.successRate).toBe(0.5);
    });
  });

  describe('loadMetrics', () => {
    it('파일 없으면 기본값', () => {
      io.fileExists.mockReturnValue(false);
      const metrics = loadMetrics('/project');
      expect(metrics).toEqual({ version: '1.0', runs: [] });
    });

    it('파일 존재하면 읽기', () => {
      io.fileExists.mockReturnValue(true);
      io.readJson.mockReturnValue({ version: '1.0', runs: [{ runId: 'r1' }] });
      const metrics = loadMetrics('/project');
      expect(metrics.runs).toHaveLength(1);
    });
  });
});
