const {
  buildWavePlan,
  buildWaveExecutionMarkdown,
  createWaveState,
  completeWaveTask,
  failWaveTask,
  finalizeWave,
  rescheduleFailedTasks,
  buildHelperSpawnHint,
} = require('../../lib/team/wave-executor');

jest.mock('../../lib/team/worktree-manager', () => ({
  createWaveWorktrees: jest.fn(),
  mergeAndCleanupWave: jest.fn(() => ({ mergedCount: 1, conflictCount: 0, results: [] })),
  verifyWorktree: jest.fn(() => ({ passed: true, skipped: false, output: '' })),
}));

jest.mock('../../lib/team/wave-dispatcher', () => {
  const actual = jest.requireActual('../../lib/team/wave-dispatcher');
  return {
    ...actual,
    detectVerifyCommand: jest.fn(() => 'npm test'),
    buildWaveDispatchInstructions: actual.buildWaveDispatchInstructions,
  };
});

const worktreeManager = require('../../lib/team/worktree-manager');
const { detectVerifyCommand } = require('../../lib/team/wave-dispatcher');

describe('team/wave-executor', () => {
  const sampleGroups = [
    [
      { title: 'Entity 구현', layer: 'entity', owner: 'domain-expert' },
      { title: 'DTO 구현', layer: 'dto', owner: 'report-generator' },
      { title: 'Config 설정', layer: 'config', owner: 'spring-architect' },
    ],
    [
      { title: 'Repository 구현', layer: 'repository', owner: 'dba-expert' },
      { title: 'Service 구현', layer: 'service', owner: 'service-expert' },
    ],
    [
      { title: 'Controller 구현', layer: 'controller', owner: 'api-expert' },
    ],
    [
      { title: '테스트 작성', layer: 'test', owner: 'test-expert' },
    ],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildWavePlan', () => {
    it('parallelGroups → wavePlan 변환', () => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      expect(plan).toHaveLength(4);
      expect(plan[0].waveIndex).toBe(1);
      expect(plan[0].layers).toEqual(['entity', 'dto', 'config']);
      expect(plan[1].waveIndex).toBe(2);
      expect(plan[1].tasks).toHaveLength(2);
    });

    it('빈 입력 시 빈 배열', () => {
      expect(buildWavePlan([], 'slug')).toEqual([]);
      expect(buildWavePlan(null, 'slug')).toEqual([]);
    });

    it('layer 없는 task는 제외', () => {
      const groups = [
        [{ title: 'Entity', layer: 'entity' }, { title: 'No layer' }],
        [{ title: 'All missing' }],
      ];
      const plan = buildWavePlan(groups, 'slug');
      expect(plan).toHaveLength(1);
      expect(plan[0].tasks).toHaveLength(1);
      expect(plan[0].tasks[0].layer).toBe('entity');
    });

    it('non-array/null group 무시', () => {
      const groups = [
        [{ layer: 'entity', title: 'E' }],
        null,
        'invalid',
        [{ layer: 'service', title: 'S' }],
      ];
      const plan = buildWavePlan(groups, 'slug');
      expect(plan).toHaveLength(2);
      expect(plan[0].waveIndex).toBe(1);
      expect(plan[1].waveIndex).toBe(2);
    });

    it('filter 후 waveIndex 재할당 (gap 없음)', () => {
      const groups = [
        [{ layer: 'entity', title: 'E' }],
        [{ title: 'No layer' }],
        [{ layer: 'service', title: 'S' }],
      ];
      const plan = buildWavePlan(groups, 'slug');
      expect(plan).toHaveLength(2);
      expect(plan[0].waveIndex).toBe(1);
      expect(plan[1].waveIndex).toBe(2);
    });
  });

  describe('buildWaveExecutionMarkdown', () => {
    it('마크다운에 Wave 헤더 포함', () => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const md = buildWaveExecutionMarkdown(plan, 'test-feature');
      expect(md).toContain('Wave 기반 병렬 실행 계획');
      expect(md).toContain('Wave 1');
      expect(md).toContain('Wave 4');
      expect(md).toContain('test-feature');
    });

    it('빈 wavePlan일 때 빈 문자열', () => {
      expect(buildWaveExecutionMarkdown([], 'slug')).toBe('');
    });

    it('마지막 Wave에 최종 merge 표시', () => {
      const plan = buildWavePlan(sampleGroups, 'feat');
      const md = buildWaveExecutionMarkdown(plan, 'feat');
      expect(md).toContain('최종 merge');
    });

    it('waveState 없이 호출해도 기존 출력 유지 (하위 호환)', () => {
      const plan = buildWavePlan(sampleGroups, 'feat');
      const md = buildWaveExecutionMarkdown(plan, 'feat', undefined);
      expect(md).toContain('Wave 1');
      expect(md).not.toContain('(started)');
      expect(md).not.toContain('worktree:');
    });

    it('waveState 있으면 worktree 경로 + (started) 마커 포함', () => {
      const plan = buildWavePlan(sampleGroups, 'feat');
      const state = createWaveState(plan, 'feat');
      state.waves[0].status = 'in_progress';
      state.waves[0].tasks[0].worktreePath = '/tmp/wt/entity';
      state.waves[0].tasks[0].branchName = 'wave-1/feat/entity';
      state.waves[0].tasks[0].status = 'in_progress';

      const md = buildWaveExecutionMarkdown(plan, 'feat', state);
      expect(md).toContain('Wave 1: entity, dto, config (started)');
      expect(md).toContain('worktree: `/tmp/wt/entity`');
      expect(md).toContain('branch: `wave-1/feat/entity`');
      expect(md).not.toContain('Wave 2: repository, service (started)');
      expect(md).toContain('Wave Dispatch 지시');
      expect(md).toContain('domain-expert');
    });
  });

  describe('createWaveState', () => {
    it('wavePlan 기반 상태 객체 생성', () => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature');
      expect(state.featureSlug).toBe('test-feature');
      expect(state.totalWaves).toBe(4);
      expect(state.status).toBe('pending');
      expect(state.waves).toHaveLength(4);
      expect(state.waves[0].tasks[0].layer).toBe('entity');
      expect(state.waves[0].tasks[0].status).toBe('pending');
    });

    it('task에 startedAt/completedAt 필드 포함', () => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature');
      expect(state.waves[0].tasks[0].startedAt).toBeNull();
      expect(state.waves[0].tasks[0].completedAt).toBeNull();
    });

    it('complexityScore 옵션 전달', () => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature', { complexityScore: 75 });
      expect(state.complexityScore).toBe(75);
    });

    it('complexityScore 미전달 시 null', () => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature');
      expect(state.complexityScore).toBeNull();
    });

    it('complexityScore: 0 보존 (falsy 값 소실 방지)', () => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature', { complexityScore: 0 });
      expect(state.complexityScore).toBe(0);
    });
  });

  describe('completeWaveTask', () => {
    let state;

    beforeEach(() => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      state = createWaveState(plan, 'test-feature');
      state.currentWave = 1;
      state.status = 'in_progress';
      state.waves[0].status = 'in_progress';
      state.waves[0].tasks.forEach(t => { t.status = 'in_progress'; });
    });

    it('단일 task 완료 시 wave 미완료', () => {
      const result = completeWaveTask(state, 1, 'entity');
      expect(result.waveCompleted).toBe(false);
      expect(result.allWavesCompleted).toBe(false);
      expect(result.nextWaveIndex).toBeNull();
      expect(state.waves[0].tasks[0].status).toBe('completed');
      expect(state.waves[0].tasks[0].completedAt).toBeTruthy();
    });

    it('wave 내 모든 task 완료 시 waveCompleted=true', () => {
      completeWaveTask(state, 1, 'entity');
      completeWaveTask(state, 1, 'dto');
      const result = completeWaveTask(state, 1, 'config');
      expect(result.waveCompleted).toBe(true);
      expect(result.nextWaveIndex).toBe(2);
      expect(state.waves[0].status).toBe('completed');
    });

    it('이미 완료된 wave에 중복 호출 시 waveCompleted=false', () => {
      completeWaveTask(state, 1, 'entity');
      completeWaveTask(state, 1, 'dto');
      completeWaveTask(state, 1, 'config');
      const result = completeWaveTask(state, 1, 'entity');
      expect(result.waveCompleted).toBe(false);
      expect(result.nextWaveIndex).toBeNull();
    });

    it('전체 wave 완료 시 allWavesCompleted=true', () => {
      state.waves[0].status = 'completed';
      state.waves[0].tasks.forEach(t => { t.status = 'completed'; });
      state.waves[1].status = 'in_progress';
      state.waves[1].tasks.forEach(t => { t.status = 'completed'; });
      state.waves[1].status = 'completed';
      state.waves[2].status = 'in_progress';
      state.waves[2].tasks.forEach(t => { t.status = 'completed'; });
      state.waves[2].status = 'completed';
      state.currentWave = 4;
      state.waves[3].status = 'in_progress';
      state.waves[3].tasks.forEach(t => { t.status = 'in_progress'; });

      const result = completeWaveTask(state, 4, 'test');
      expect(result.waveCompleted).toBe(true);
      expect(result.allWavesCompleted).toBe(true);
      expect(state.status).toBe('completed');
    });

    it('잘못된 waveIndex에 대해 안전하게 반환', () => {
      const result = completeWaveTask(state, 99, 'entity');
      expect(result.waveCompleted).toBe(false);
    });

    it('null waveState에 대해 안전하게 반환', () => {
      const result = completeWaveTask(null, 1, 'entity');
      expect(result.waveCompleted).toBe(false);
    });

    it('존재하지 않는 layer 완료 시도 시 wave 미완료', () => {
      const result = completeWaveTask(state, 1, 'nonexistent');
      expect(result.waveCompleted).toBe(false);
      expect(state.waves[0].tasks.every(t => t.status === 'in_progress')).toBe(true);
    });

    it('failed + completed 혼합 시 completeWaveTask로 wave 완료', () => {
      failWaveTask(state, 1, 'entity');
      expect(state.waves[0].tasks[0].status).toBe('failed');
      completeWaveTask(state, 1, 'dto');
      const result = completeWaveTask(state, 1, 'config');
      expect(result.waveCompleted).toBe(true);
      expect(result.nextWaveIndex).toBe(2);
      expect(state.waves[0].status).toBe('completed');
    });

    it('이미 failed인 task에 completeWaveTask 호출 시 상태 유지 (덮어쓰기 방지)', () => {
      failWaveTask(state, 1, 'entity');
      completeWaveTask(state, 1, 'entity');
      expect(state.waves[0].tasks[0].status).toBe('failed');
    });
  });

  describe('failWaveTask', () => {
    let state;

    beforeEach(() => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      state = createWaveState(plan, 'test-feature');
      state.currentWave = 1;
      state.status = 'in_progress';
      state.waves[0].status = 'in_progress';
      state.waves[0].tasks.forEach(t => { t.status = 'in_progress'; });
    });

    it('task.status를 failed로 마킹 + completedAt 세팅', () => {
      failWaveTask(state, 1, 'entity');
      expect(state.waves[0].tasks[0].status).toBe('failed');
      expect(state.waves[0].tasks[0].completedAt).toBeTruthy();
    });

    it('failedLayers 반환', () => {
      const result = failWaveTask(state, 1, 'entity');
      expect(result.failedLayers).toEqual(['entity']);
    });

    it('completed + failed 혼합 시 wave 완료 전이', () => {
      completeWaveTask(state, 1, 'entity');
      completeWaveTask(state, 1, 'dto');
      const result = failWaveTask(state, 1, 'config');
      expect(result.waveCompleted).toBe(true);
      expect(result.nextWaveIndex).toBe(2);
      expect(state.waves[0].status).toBe('completed');
    });

    it('null waveState에 안전하게 반환', () => {
      const result = failWaveTask(null, 1, 'entity');
      expect(result.waveCompleted).toBe(false);
      expect(result.failedLayers).toEqual([]);
    });

    it('이미 completed wave에 중복 호출 시 waveCompleted=false', () => {
      state.waves[0].status = 'completed';
      state.waves[0].tasks.forEach(t => { t.status = 'completed'; });
      const result = failWaveTask(state, 1, 'entity');
      expect(result.waveCompleted).toBe(false);
    });

    it('존재하지 않는 waveIndex에 안전 반환', () => {
      const result = failWaveTask(state, 99, 'entity');
      expect(result.waveCompleted).toBe(false);
      expect(result.failedLayers).toEqual([]);
    });
  });

  describe('startWave', () => {
    it('blocked wave에 대한 방어: startWave guard 존재 확인', () => {
      const waveExecutor = require('../../lib/team/wave-executor');
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature');
      state.waves[0].status = 'blocked';
      const result = waveExecutor.startWave(state, 1, '/nonexistent');
      expect(result).toBeNull();
    });

    it('completed wave에 대해 null 반환', () => {
      const waveExecutor = require('../../lib/team/wave-executor');
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature');
      state.waves[0].status = 'completed';
      const result = waveExecutor.startWave(state, 1, '/nonexistent');
      expect(result).toBeNull();
    });

    it('createWaveWorktrees가 빈 배열 반환 시 blocked', () => {
      worktreeManager.createWaveWorktrees.mockReturnValue([]);
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature');
      const result = require('../../lib/team/wave-executor').startWave(state, 1, '/project');
      expect(result).toBeNull();
      expect(state.waves[0].status).toBe('blocked');
    });

    it('layer 없는 task만 있으면 blocked 반환', () => {
      const waveExecutor = require('../../lib/team/wave-executor');
      const state = {
        featureSlug: 'test',
        currentWave: 0,
        totalWaves: 1,
        status: 'pending',
        waves: [{
          waveIndex: 1,
          status: 'pending',
          tasks: [{ layer: null, status: 'pending' }, { layer: undefined, status: 'pending' }],
        }],
      };
      const result = waveExecutor.startWave(state, 1, '/nonexistent');
      expect(result).toBeNull();
      expect(state.waves[0].status).toBe('blocked');
    });
  });

  describe('rescheduleFailedTasks', () => {
    it('함수가 export되어 있음', () => {
      expect(typeof rescheduleFailedTasks).toBe('function');
    });

    it('이월된 task에 startedAt/completedAt 필드 포함', () => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature');
      state.waves[0].status = 'completed';
      state.waves[0].tasks[0].status = 'failed';
      state.waves[0].tasks[1].status = 'completed';
      state.waves[0].tasks[2].status = 'completed';
      const result = rescheduleFailedTasks(state, 1);
      expect(result.rescheduled).toEqual(['entity']);
      const retryTask = state.waves.find(w => w.waveIndex === 2).tasks.find(t => t.retryOf === 1);
      expect(retryTask).toBeDefined();
      expect(retryTask.startedAt).toBeNull();
      expect(retryTask.completedAt).toBeNull();
    });
  });

  describe('buildHelperSpawnHint export', () => {
    it('함수가 export되어 있음', () => {
      expect(typeof buildHelperSpawnHint).toBe('function');
    });
  });

  describe('finalizeWave', () => {
    it('wave가 completed가 아니면 null 반환', () => {
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature');
      state.waves[0].status = 'in_progress';
      state.waves[0].tasks.forEach(t => {
        t.worktreePath = '/tmp/wt';
        t.branchName = 'wave-1/test/entity';
      });
      const result = finalizeWave(state, 1, '/project', 'main');
      expect(result).toBeNull();
    });

    it('verify 통과 → merge 진행', () => {
      worktreeManager.verifyWorktree.mockReturnValue({ passed: true, skipped: false, output: '' });
      worktreeManager.mergeAndCleanupWave.mockReturnValue({ mergedCount: 2, conflictCount: 0, results: [] });

      const state = {
        waves: [{
          waveIndex: 1,
          status: 'completed',
          tasks: [
            { layer: 'entity', worktreePath: '/tmp/wt1', branchName: 'wave-1/entity', status: 'completed' },
            { layer: 'dto', worktreePath: '/tmp/wt2', branchName: 'wave-1/dto', status: 'completed' },
          ],
        }],
      };
      const result = finalizeWave(state, 1, '/project', 'main');
      expect(result.mergedCount).toBe(2);
      expect(result.verifyFailedCount).toBe(0);
      expect(result.verifyFailed).toEqual([]);
      expect(worktreeManager.mergeAndCleanupWave).toHaveBeenCalledWith('/project', expect.any(Array), 'main');
    });

    it('verify 실패 → merge 차단, worktree 보존', () => {
      worktreeManager.verifyWorktree
        .mockReturnValueOnce({ passed: true, skipped: false, output: '' })
        .mockReturnValueOnce({ passed: false, skipped: false, output: 'test failed' });
      worktreeManager.mergeAndCleanupWave.mockReturnValue({ mergedCount: 1, conflictCount: 0, results: [] });

      const state = {
        waves: [{
          waveIndex: 1,
          status: 'completed',
          tasks: [
            { layer: 'entity', worktreePath: '/tmp/wt1', branchName: 'wave-1/entity', status: 'completed' },
            { layer: 'dto', worktreePath: '/tmp/wt2', branchName: 'wave-1/dto', status: 'completed' },
          ],
        }],
      };
      const result = finalizeWave(state, 1, '/project', 'main');
      expect(result.mergedCount).toBe(1);
      expect(result.verifyFailedCount).toBe(1);
      expect(result.verifyFailed).toEqual(['dto']);
      // merge에는 entity만 전달
      expect(worktreeManager.mergeAndCleanupWave).toHaveBeenCalledWith(
        '/project',
        [expect.objectContaining({ layer: 'entity' })],
        'main',
      );
    });

    it('failed task는 merge 대상에서 제외', () => {
      worktreeManager.verifyWorktree.mockReturnValue({ passed: true, skipped: false, output: '' });
      worktreeManager.mergeAndCleanupWave.mockReturnValue({ mergedCount: 1, conflictCount: 0, results: [] });

      const state = {
        waves: [{
          waveIndex: 1,
          status: 'completed',
          tasks: [
            { layer: 'entity', worktreePath: '/tmp/wt1', branchName: 'wave-1/entity', status: 'completed' },
            { layer: 'dto', worktreePath: '/tmp/wt2', branchName: 'wave-1/dto', status: 'failed' },
          ],
        }],
      };
      const result = finalizeWave(state, 1, '/project', 'main');
      // dto는 failed이므로 worktrees에서 제외 → verify도 entity만
      expect(worktreeManager.verifyWorktree).toHaveBeenCalledTimes(1);
      expect(result.mergedCount).toBe(1);
    });

    it('모든 verify 실패 → merge 호출 안함', () => {
      worktreeManager.verifyWorktree.mockReturnValue({ passed: false, skipped: false, output: 'fail' });

      const state = {
        waves: [{
          waveIndex: 1,
          status: 'completed',
          tasks: [
            { layer: 'entity', worktreePath: '/tmp/wt1', branchName: 'wave-1/entity', status: 'completed' },
          ],
        }],
      };
      const result = finalizeWave(state, 1, '/project', 'main');
      expect(result.mergedCount).toBe(0);
      expect(result.verifyFailedCount).toBe(1);
      expect(worktreeManager.mergeAndCleanupWave).not.toHaveBeenCalled();
    });
  });
});
