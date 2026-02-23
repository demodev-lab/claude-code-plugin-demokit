const {
  buildWavePlan,
  buildWaveExecutionMarkdown,
  createWaveState,
  completeWaveTask,
  finalizeWave,
} = require('../../lib/team/wave-executor');

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
      // 그룹 2는 모든 task가 layer 없으므로 wave 자체가 제거됨
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
      // wave 1을 in_progress로 설정하고 worktree 경로 주입
      state.waves[0].status = 'in_progress';
      state.waves[0].tasks[0].worktreePath = '/tmp/wt/entity';
      state.waves[0].tasks[0].branchName = 'wave-1/feat/entity';
      state.waves[0].tasks[0].status = 'in_progress';

      const md = buildWaveExecutionMarkdown(plan, 'feat', state);
      expect(md).toContain('Wave 1: entity, dto, config (started)');
      expect(md).toContain('worktree: `/tmp/wt/entity`');
      expect(md).toContain('branch: `wave-1/feat/entity`');
      // wave 2는 pending이므로 (started) 없음
      expect(md).not.toContain('Wave 2: repository, service (started)');
      // dispatch 지시가 포함되어야 함
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
      // wave 1은 이제 completed
      const result = completeWaveTask(state, 1, 'entity');
      expect(result.waveCompleted).toBe(false);
      expect(result.nextWaveIndex).toBeNull();
    });

    it('전체 wave 완료 시 allWavesCompleted=true', () => {
      // Wave 1 완료
      state.waves[0].status = 'completed';
      state.waves[0].tasks.forEach(t => { t.status = 'completed'; });
      // Wave 2 완료
      state.waves[1].status = 'in_progress';
      state.waves[1].tasks.forEach(t => { t.status = 'completed'; });
      state.waves[1].status = 'completed';
      // Wave 3 완료
      state.waves[2].status = 'in_progress';
      state.waves[2].tasks.forEach(t => { t.status = 'completed'; });
      state.waves[2].status = 'completed';
      // Wave 4
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
      // 기존 task들은 변경되지 않음
      expect(state.waves[0].tasks.every(t => t.status === 'in_progress')).toBe(true);
    });
  });

  describe('startWave', () => {
    // startWave는 worktreeManager를 호출하므로 직접 테스트 대신
    // blocked 상태 거부를 간접 검증
    it('blocked wave에 대한 방어: startWave guard 존재 확인', () => {
      // wave-executor 모듈에서 startWave의 guard 확인
      const waveExecutor = require('../../lib/team/wave-executor');
      const plan = buildWavePlan(sampleGroups, 'test-feature');
      const state = createWaveState(plan, 'test-feature');
      state.waves[0].status = 'blocked';
      // blocked wave에 startWave 호출 시 null 반환 (worktree 생성 시도 안함)
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
  });
});
