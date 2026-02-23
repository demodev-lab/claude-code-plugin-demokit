const { rescheduleFailedTasks, buildHelperSpawnHint, buildWavePlan, createWaveState } = require('../../lib/team/wave-executor');

jest.mock('../../lib/team/worktree-manager', () => ({
  createWaveWorktrees: jest.fn(),
  mergeAndCleanupWave: jest.fn(),
  verifyWorktree: jest.fn(),
}));

jest.mock('../../lib/team/wave-dispatcher', () => ({
  LAYER_AGENT_MAP: {
    entity: 'domain-expert',
    dto: 'report-generator',
    service: 'service-expert',
    controller: 'api-expert',
    repository: 'dba-expert',
    test: 'test-expert',
  },
  detectVerifyCommand: jest.fn(() => 'npm test'),
  buildWaveDispatchInstructions: jest.fn(() => ''),
  resolveAgentForLayer: jest.fn(),
}));

describe('rescheduleFailedTasks', () => {
  function makeState() {
    const groups = [
      [{ title: 'Entity', layer: 'entity' }, { title: 'DTO', layer: 'dto' }],
      [{ title: 'Service', layer: 'service' }],
    ];
    const plan = buildWavePlan(groups, 'feat');
    const state = createWaveState(plan, 'feat');
    state.currentWave = 1;
    state.status = 'in_progress';
    state.waves[0].status = 'completed';
    state.waves[0].tasks[0].status = 'failed';
    state.waves[0].tasks[1].status = 'completed';
    return state;
  }

  it('실패 task를 다음 wave에 이월', () => {
    const state = makeState();
    const result = rescheduleFailedTasks(state, 1);
    expect(result.rescheduled).toEqual(['entity']);
    expect(result.targetWaveIndex).toBe(2);
    // wave 2에 entity 추가 확인
    const wave2 = state.waves.find(w => w.waveIndex === 2);
    const retryTask = wave2.tasks.find(t => t.layer === 'entity');
    expect(retryTask).toBeDefined();
    expect(retryTask.retryOf).toBe(1);
  });

  it('다음 wave가 없으면 새로 생성', () => {
    const groups = [[{ title: 'Entity', layer: 'entity' }]];
    const plan = buildWavePlan(groups, 'feat');
    const state = createWaveState(plan, 'feat');
    state.waves[0].status = 'completed';
    state.waves[0].tasks[0].status = 'failed';

    const result = rescheduleFailedTasks(state, 1);
    expect(result.rescheduled).toEqual(['entity']);
    expect(state.waves).toHaveLength(2);
    expect(state.totalWaves).toBe(2);
  });

  it('이미 같은 layer가 대상 wave에 있으면 중복 방지', () => {
    const state = makeState();
    // wave 2에 이미 entity가 있는 경우
    state.waves[1].tasks.push({ layer: 'entity', status: 'pending' });
    const result = rescheduleFailedTasks(state, 1);
    expect(result.rescheduled).toEqual([]);
    expect(result.targetWaveIndex).toBeNull();
  });

  it('retryOf가 있는 task는 재스케줄 안함 (무한루프 방지)', () => {
    const state = makeState();
    state.waves[0].tasks[0].retryOf = 1; // 이미 retry된 task
    const result = rescheduleFailedTasks(state, 1);
    expect(result.rescheduled).toEqual([]);
  });

  it('실패 task 없으면 빈 결과', () => {
    const state = makeState();
    state.waves[0].tasks[0].status = 'completed';
    const result = rescheduleFailedTasks(state, 1);
    expect(result.rescheduled).toEqual([]);
    expect(result.targetWaveIndex).toBeNull();
  });

  it('null waveState에 안전 반환', () => {
    expect(rescheduleFailedTasks(null, 1)).toEqual({ rescheduled: [], targetWaveIndex: null });
  });

  it('존재하지 않는 waveIndex에 안전 반환', () => {
    const state = makeState();
    expect(rescheduleFailedTasks(state, 99)).toEqual({ rescheduled: [], targetWaveIndex: null });
  });
});

describe('buildHelperSpawnHint', () => {
  it('실패 task에 대한 agent 매핑 힌트 생성', () => {
    const state = {
      waves: [{
        waveIndex: 1,
        tasks: [
          { layer: 'entity', status: 'failed' },
          { layer: 'dto', status: 'completed' },
        ],
      }],
    };
    const hint = buildHelperSpawnHint(state, 1);
    expect(hint).toContain('entity → domain-expert');
    expect(hint).not.toContain('dto');
  });

  it('실패 task 없으면 null', () => {
    const state = {
      waves: [{
        waveIndex: 1,
        tasks: [{ layer: 'entity', status: 'completed' }],
      }],
    };
    expect(buildHelperSpawnHint(state, 1)).toBeNull();
  });

  it('null waveState에 null 반환', () => {
    expect(buildHelperSpawnHint(null, 1)).toBeNull();
  });

  it('존재하지 않는 waveIndex에 null 반환', () => {
    const state = { waves: [{ waveIndex: 1, tasks: [] }] };
    expect(buildHelperSpawnHint(state, 99)).toBeNull();
  });
});
