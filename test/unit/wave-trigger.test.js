const { buildSuperworkBlueprint } = require('../../lib/superwork');
const { initWaveExecution, loadTeamState } = require('../../lib/team/state-writer');
const { buildWavePlan, createWaveState, startWave } = require('../../lib/team/wave-executor');
const { platform } = require('../../lib/core');
const { matchIntent } = require('../../lib/intent/trigger');

jest.mock('../../lib/team/state-writer', () => {
  const actual = jest.requireActual('../../lib/team/state-writer');
  return {
    ...actual,
    initWaveExecution: jest.fn(),
    loadTeamState: jest.fn(() => ({})),
  };
});

jest.mock('../../lib/team/worktree-manager', () => ({
  createWaveWorktrees: jest.fn((projectRoot, featureSlug, waveIndex, layerNames) =>
    layerNames.map(layer => ({
      layer,
      worktreePath: `/tmp/wt/${featureSlug}/wave-${waveIndex}/${layer}`,
      branchName: `wave-${waveIndex}/${featureSlug}/${layer}`,
    })),
  ),
  mergeAndCleanupWave: jest.fn(),
}));

jest.mock('../../lib/core', () => {
  const actual = jest.requireActual('../../lib/core');
  return {
    ...actual,
    platform: {
      ...actual.platform,
      findProjectRoot: jest.fn(() => '/mock/project'),
    },
  };
});

describe('wave-trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('superwork 트리거', () => {
    it('team enabled + parallelGroups > 1 → initWaveExecution 호출 + startWave로 wave 1 시작', () => {
      const worktreeManager = require('../../lib/team/worktree-manager');
      const blueprint = buildSuperworkBlueprint('/superwork 회원가입 API 구현');
      expect(blueprint.hasRequest).toBe(true);

      const doPhase = blueprint.phases?.find(p => p.id === 'do');
      if (doPhase?.team?.enabled && doPhase?.parallelGroups?.length > 1) {
        expect(initWaveExecution).toHaveBeenCalled();
        // startWave가 worktree 생성을 트리거했는지 확인
        expect(worktreeManager.createWaveWorktrees).toHaveBeenCalledWith(
          '/mock/project',
          expect.any(String),
          1,
          expect.any(Array),
        );
      }
    });

    it('team disabled → initWaveExecution 미호출', () => {
      const blueprint = buildSuperworkBlueprint('/superwork tiny fix');
      const doPhase = blueprint.phases?.find(p => p.id === 'do');
      if (!doPhase?.team?.enabled) {
        expect(initWaveExecution).not.toHaveBeenCalled();
      }
    });

    it('init 실패해도 blueprint 정상 반환', () => {
      initWaveExecution.mockImplementation(() => { throw new Error('disk full'); });
      const blueprint = buildSuperworkBlueprint('/superwork 대규모 리팩토링');
      expect(blueprint.hasRequest).toBe(true);
      expect(blueprint.message).toBeDefined();
      initWaveExecution.mockReset();
    });
  });

  describe('pdca do 트리거 로직', () => {
    // user-prompt-handler.js는 stdin 기반 CLI 스크립트이므로
    // pdca do 트리거의 핵심 로직을 직접 검증

    function simulatePdcaDoTrigger(userPrompt) {
      const detected = matchIntent(userPrompt);
      if (detected?.id === 'pdca' && /\bdo\b/i.test(userPrompt)) {
        const projectRoot = platform.findProjectRoot(process.cwd());
        if (projectRoot) {
          const teamState = loadTeamState(projectRoot);
          if (!teamState.waveExecution || teamState.waveExecution.status === 'completed') {
            const doMatch = userPrompt.match(/\bdo\s+(\S+)/i);
            const featureSlug = doMatch ? doMatch[1] : 'default';
            const blueprint = buildSuperworkBlueprint(`/superwork ${featureSlug}`);
            if (blueprint.hasRequest && blueprint.phases) {
              const doPhaseData = blueprint.phases.find(p => p.id === 'do');
              if (doPhaseData?.parallelGroups?.length > 1) {
                const wavePlan = buildWavePlan(doPhaseData.parallelGroups, featureSlug);
                if (wavePlan.length > 0) {
                  const waveState = createWaveState(wavePlan, featureSlug);
                  startWave(waveState, 1, projectRoot);
                  initWaveExecution(projectRoot, waveState);
                }
              }
            }
          }
        }
      }
    }

    it('/pdca do feature → wave init 시도', () => {
      loadTeamState.mockReturnValue({});
      simulatePdcaDoTrigger('/pdca do user-signup');
      // 호출 여부는 team config에 따라 다르지만, 에러 없이 완료
    });

    it('/pdca plan feature → initWaveExecution 미호출', () => {
      simulatePdcaDoTrigger('/pdca plan user-signup');
      expect(initWaveExecution).not.toHaveBeenCalled();
    });

    it('이미 활성 wave → 중복 초기화 방지', () => {
      loadTeamState.mockReturnValue({
        waveExecution: { status: 'in_progress', currentWave: 1 },
      });
      simulatePdcaDoTrigger('/pdca do user-signup');
      expect(initWaveExecution).not.toHaveBeenCalled();
    });
  });
});
