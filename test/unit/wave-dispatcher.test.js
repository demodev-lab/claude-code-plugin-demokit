const fs = require('fs');
const path = require('path');
const {
  resolveAgentForLayer,
  buildWaveDispatchInstructions,
  detectVerifyCommand,
  LAYER_AGENT_MAP,
  LAYER_FILE_PATTERNS,
} = require('../../lib/team/wave-dispatcher');

jest.mock('fs');

describe('team/wave-dispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe('detectVerifyCommand', () => {
    it('build.gradle 존재 → ./gradlew test', () => {
      fs.existsSync.mockImplementation((p) => p.endsWith('build.gradle'));
      expect(detectVerifyCommand('/project')).toBe('./gradlew test');
    });

    it('build.gradle.kts 존재 → ./gradlew test', () => {
      fs.existsSync.mockImplementation((p) => p.endsWith('build.gradle.kts'));
      expect(detectVerifyCommand('/project')).toBe('./gradlew test');
    });

    it('pom.xml 존재 → mvn test', () => {
      fs.existsSync.mockImplementation((p) => p.endsWith('pom.xml'));
      expect(detectVerifyCommand('/project')).toBe('mvn test');
    });

    it('package.json 존재 → npm test', () => {
      fs.existsSync.mockImplementation((p) => p.endsWith('package.json'));
      expect(detectVerifyCommand('/project')).toBe('npm test');
    });

    it('아무 빌드 파일 없음 → null', () => {
      fs.existsSync.mockReturnValue(false);
      expect(detectVerifyCommand('/project')).toBeNull();
    });

    it('projectRoot null → null', () => {
      expect(detectVerifyCommand(null)).toBeNull();
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
      fs.existsSync.mockReturnValue(false);
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

    it('OWN FILES 포함 확인', () => {
      fs.existsSync.mockReturnValue(false);
      const state = makeWaveState();
      const md = buildWaveDispatchInstructions(state, 1);
      expect(md).toContain('OWN FILES');
      expect(md).toContain('src/**/entity/**');
      expect(md).toContain('src/**/dto/**');
    });

    it('DO NOT TOUCH 포함 확인 — 다른 task의 OWN FILES', () => {
      fs.existsSync.mockReturnValue(false);
      const state = makeWaveState();
      const md = buildWaveDispatchInstructions(state, 1);
      expect(md).toContain('DO NOT TOUCH');
      // entity task의 DO NOT TOUCH에 dto 패턴이 있어야 함
      const entitySection = md.split('### dto')[0];
      expect(entitySection).toContain('src/**/dto/**');
    });

    it('VERIFY 지시 포함 확인 — projectRoot에 package.json 있을 때', () => {
      fs.existsSync.mockImplementation((p) => p.endsWith('package.json'));
      const state = makeWaveState();
      const md = buildWaveDispatchInstructions(state, 1, { projectRoot: '/project' });
      expect(md).toContain('npm test');
      expect(md).toContain('최대 3회');
      expect(md).toContain('STOP');
    });

    it('VERIFY 지시 생략 — 빌드 도구 없을 때', () => {
      fs.existsSync.mockReturnValue(false);
      const state = makeWaveState();
      const md = buildWaveDispatchInstructions(state, 1, { projectRoot: '/project' });
      expect(md).not.toContain('최대 3회');
    });

    it('리포트 양식 포함 확인', () => {
      fs.existsSync.mockReturnValue(false);
      const state = makeWaveState();
      const md = buildWaveDispatchInstructions(state, 1);
      expect(md).toContain('Files modified');
      expect(md).toContain('How verified');
      expect(md).toContain('Known issues');
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
      fs.existsSync.mockReturnValue(false);
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
      fs.existsSync.mockReturnValue(false);
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

    it('options 없이 호출해도 동작 (하위 호환)', () => {
      fs.existsSync.mockReturnValue(false);
      const state = makeWaveState();
      const md = buildWaveDispatchInstructions(state, 1);
      expect(md).toContain('Wave Dispatch');
    });

    describe('이전 wave 교차 검증 컨텍스트', () => {
      it('waveIndex > 1 + prevWave.crossValidation 있으면 컨텍스트 포함', () => {
        fs.existsSync.mockReturnValue(false);
        const state = makeWaveState();
        state.waves[0].waveIndex = 1;
        state.waves[0].status = 'completed';
        state.waves[0].crossValidation = {
          required: true,
          pairs: [{ sourceLayer: 'entity', validatorAgent: 'service-expert' }],
        };
        state.waves[1].waveIndex = 2;
        state.waves[1].status = 'in_progress';
        state.waves[1].tasks = [
          { layer: 'service', status: 'in_progress', worktreePath: '/tmp/wt/service', branchName: 'wave-2/test-feat/service' },
        ];
        const md = buildWaveDispatchInstructions(state, 2);
        expect(md).toContain('이전 Wave 교차 검증 결과');
        expect(md).toContain('entity');
        expect(md).toContain('service-expert');
      });

      it('prevWave.crossValidation 없으면 컨텍스트 미포함', () => {
        fs.existsSync.mockReturnValue(false);
        const state = makeWaveState();
        state.waves[0].status = 'completed';
        state.waves[1].waveIndex = 2;
        state.waves[1].status = 'in_progress';
        state.waves[1].tasks = [
          { layer: 'service', status: 'in_progress', worktreePath: '/tmp/wt/service', branchName: 'wave-2/test-feat/service' },
        ];
        const md = buildWaveDispatchInstructions(state, 2);
        expect(md).not.toContain('이전 Wave 교차 검증 결과');
      });

      it('waveIndex === 1이면 컨텍스트 미포함', () => {
        fs.existsSync.mockReturnValue(false);
        const state = makeWaveState();
        const md = buildWaveDispatchInstructions(state, 1);
        expect(md).not.toContain('이전 Wave 교차 검증 결과');
      });
    });

    describe('pod integration', () => {
      it('options.level 전달 시 pod protocol 포함', () => {
        fs.existsSync.mockReturnValue(false);
        const state = makeWaveState();
        const md = buildWaveDispatchInstructions(state, 1, { level: 'MultiModule' });
        expect(md).toContain('Work Pod Protocol');
        expect(md).toContain('pod');
        expect(md).toContain('Navigator');
      });

      it('options.level = Starter → pod 미포함', () => {
        fs.existsSync.mockReturnValue(false);
        const state = makeWaveState();
        const md = buildWaveDispatchInstructions(state, 1, { level: 'Starter' });
        expect(md).not.toContain('Work Pod Protocol');
        expect(md).not.toContain('pod');
      });

      it('options.level 없으면 pod 미포함 (하위 호환)', () => {
        fs.existsSync.mockReturnValue(false);
        const state = makeWaveState();
        const md = buildWaveDispatchInstructions(state, 1, {});
        expect(md).not.toContain('Work Pod Protocol');
      });

      it('pod 활성 시 중복 VERIFY 지시 생략', () => {
        fs.existsSync.mockImplementation((p) => p.endsWith('package.json'));
        const state = makeWaveState();
        const md = buildWaveDispatchInstructions(state, 1, { projectRoot: '/project', level: 'MultiModule' });
        // pod protocol에는 verify가 포함되지만, 별도 VERIFY 블록은 생략
        expect(md).toContain('Work Pod Protocol');
        // 기존 VERIFY 블록의 고유 텍스트 ("각 subagent는 구현 후 반드시")가 없어야 함
        expect(md).not.toContain('각 subagent는 구현 후 반드시');
      });

      it('unknown level → pod 미적용 + VERIFY 지시 유지', () => {
        fs.existsSync.mockImplementation((p) => p.endsWith('package.json'));
        const state = makeWaveState();
        const md = buildWaveDispatchInstructions(state, 1, { projectRoot: '/project', level: 'UnknownLevel' });
        expect(md).not.toContain('Work Pod Protocol');
        // unknown level이면 pod가 resolve 안 되므로 기존 VERIFY 블록 유지
        expect(md).toContain('각 subagent는 구현 후 반드시');
      });
    });
  });
});
