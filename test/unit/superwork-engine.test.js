const { parseSuperworkPrompt, buildSuperworkBlueprint } = require('../../lib/superwork');

describe('superwork engine', () => {
  it('parses /superwork argument', () => {
    const parsed = parseSuperworkPrompt('/superwork 회원가입 API 구현');
    expect(parsed.hasRequest).toBe(true);
    expect(parsed.requestText).toBe('회원가입 API 구현');
    expect(parsed.featureSlug).toBe('회원가입-api-구현');
  });

  it('ignores normal text that is not /superwork command', () => {
    const parsed = parseSuperworkPrompt('회원가입 API 구현');
    expect(parsed.hasRequest).toBe(false);
    expect(parsed.requestText).toBe('');
    expect(parsed.featureSlug).toBe('');
    expect(parsed.isSuperworkCommand).toBe(false);
  });

  it('removes surrounding quotes', () => {
    const parsed = parseSuperworkPrompt('/superwork "결제 취소 예외 처리 보강"');
    expect(parsed.requestText).toBe('결제 취소 예외 처리 보강');
    expect(parsed.featureSlug).toBe('결제-취소-예외-처리-보강');
  });

  it('generates phase blueprint and pdca flow', () => {
    const result = buildSuperworkBlueprint('/superwork 회원관리 API 구현');
    expect(result.hasRequest).toBe(true);
    expect(result.message).toContain('요청 분해 템플릿');
    expect(result.message).toContain('### Do (do)');
    expect(result.message).toContain('병렬 그룹');
    expect(result.message).toContain('/pdca plan 회원관리-api-구현');
    expect(result.message).toContain('/pdca iterate 회원관리-api-구현');
    expect(result.message).toContain('## 3) /pdca do 실행 체크리스트 템플릿');
    expect(result.message).toContain('/pdca do 회원관리-api-구현');
    expect(result.message).toContain('권장 실행 패턴');
  });

  it('prompts for input when missing request', () => {
    const result = buildSuperworkBlueprint('/superwork');
    expect(result.hasRequest).toBe(false);
    expect(result.message).toContain('형식으로 요청');
  });

  it('ignores non-command text input', () => {
    const result = buildSuperworkBlueprint('회원가입 API 구현');
    expect(result.hasRequest).toBe(false);
    expect(result.message).toContain('형식으로 요청');
  });

  it('complexity 필드가 존재하고 mode가 반환됨', () => {
    const result = buildSuperworkBlueprint('/superwork 회원관리 API 구현');
    expect(result.complexity).toBeDefined();
    expect(['single', 'team']).toContain(result.complexity.mode);
    expect(typeof result.complexity.score).toBe('number');
  });

  it('실행 모드가 message에 포함됨', () => {
    const result = buildSuperworkBlueprint('/superwork 회원관리 API 구현');
    expect(result.message).toMatch(/실행 모드: (Single Agent|Team \(Wave 병렬\))/);
  });

  it('기존 message 구조 regression 확인', () => {
    const result = buildSuperworkBlueprint('/superwork 회원관리 API 구현');
    expect(result.message).toContain('요청 분해 템플릿');
    expect(result.message).toContain('### Do (do)');
    expect(result.message).toContain('/pdca plan');
  });

  it('single mode 시 Wave 실행 계획 미포함', () => {
    // 짧은 요청 → quickFix → low score → single mode
    const result = buildSuperworkBlueprint('/superwork 버그 수정');
    expect(result.complexity.mode).toBe('single');
    expect(result.message).not.toContain('Wave 기반 병렬 실행 계획');
  });

  it('shows team-disabled note when team configuration is false', () => {
    jest.resetModules();
    jest.doMock('../../lib/team/team-config', () => ({
      isTeamEnabled: () => false,
    }));
    jest.doMock('../../lib/team/orchestrator', () => ({
      buildTeamContextForPhase: () => ({
        lead: 'spring-architect',
        members: ['domain-expert', 'service-expert', 'api-expert'],
        pattern: 'swarm',
        maxParallel: 3,
        delegateMode: false,
        delegateAgent: null,
        taskQueue: [],
      }),
    }));
    const mocked = require('../../lib/superwork');

    const result = mocked.buildSuperworkBlueprint('/superwork 회원관리 API 구현');
    expect(result.hasRequest).toBe(true);

    const doPhase = result.phases.find((phase) => phase.id === 'do');
    expect(doPhase.team.enabled).toBe(false);
    expect(result.message).toContain('team.enabled=false');
  });
});
