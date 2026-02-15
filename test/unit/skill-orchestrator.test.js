const {
  parseAgentsField, getAgentForAction, getLinkedAgents, isMultiBindingSkill,
  orchestrateSkillPre, orchestrateSkillPost, getNextStepMessage,
  parseSimpleYaml, loadSkillMeta, resetCache,
} = require('../../lib/core/skill-loader');

// config/io mock
jest.mock('../../lib/core/config', () => ({
  getPluginRoot: () => '/mock/plugin',
  loadConfig: () => ({}),
}));

jest.mock('../../lib/core/io', () => ({
  readFile: jest.fn(),
}));

const ioMock = require('../../lib/core/io');

describe('Skill Orchestrator', () => {
  beforeEach(() => {
    resetCache();
    ioMock.readFile.mockReset();
  });

  describe('parseSimpleYaml - agents 섹션', () => {
    it('agents map 파싱', () => {
      const yaml = `name: pdca
agents:
  analyze: gap-detector
  iterate: pdca-iterator
  default: spring-architect`;
      const result = parseSimpleYaml(yaml);
      expect(result.name).toBe('pdca');
      expect(result.agents).toEqual({
        analyze: 'gap-detector',
        iterate: 'pdca-iterator',
        default: 'spring-architect',
      });
    });

    it('agents 없으면 일반 파싱', () => {
      const yaml = `name: help
next-skill: init`;
      const result = parseSimpleYaml(yaml);
      expect(result.name).toBe('help');
      expect(result['next-skill']).toBe('init');
      expect(result.agents).toBeUndefined();
    });

    it('배열과 agents 혼합', () => {
      const yaml = `name: test
imports:
  - ./templates/base.md
  - ./templates/extra.md
agents:
  review: code-reviewer`;
      const result = parseSimpleYaml(yaml);
      expect(result.imports).toEqual(['./templates/base.md', './templates/extra.md']);
      expect(result.agents).toEqual({ review: 'code-reviewer' });
    });

    it('agents 후 다른 key가 올 때 정상 종료', () => {
      const yaml = `agents:
  analyze: gap-detector
  iterate: pdca-iterator
name: pdca
next-skill: report`;
      const result = parseSimpleYaml(yaml);
      expect(result.agents).toEqual({ analyze: 'gap-detector', iterate: 'pdca-iterator' });
      expect(result.name).toBe('pdca');
      expect(result['next-skill']).toBe('report');
    });
  });

  describe('parseAgentsField', () => {
    it('multi-binding agents', () => {
      const result = parseAgentsField({
        agents: { analyze: 'gap-detector', iterate: 'iterator' },
      });
      expect(result._isMultiBinding).toBe(true);
      expect(result.analyze).toBe('gap-detector');
    });

    it('single binding agent', () => {
      const result = parseAgentsField({ agent: 'spring-architect' });
      expect(result._isMultiBinding).toBe(false);
      expect(result.default).toBe('spring-architect');
    });

    it('agent 미정의', () => {
      const result = parseAgentsField({});
      expect(result._isMultiBinding).toBe(false);
      expect(result.default).toBeNull();
    });

    it('agents가 Array면 multi-binding으로 처리하지 않음', () => {
      const result = parseAgentsField({ agents: ['agent1', 'agent2'] });
      expect(result._isMultiBinding).toBe(false);
      expect(result.default).toBeNull();
    });
  });

  describe('getAgentForAction', () => {
    it('multi-binding에서 action별 agent 반환', () => {
      ioMock.readFile.mockReturnValue(`name: pdca
agents:
  analyze: gap-detector
  default: spring-architect`);
      const agent = getAgentForAction('pdca', 'analyze');
      expect(agent).toBe('gap-detector');
    });

    it('action 없으면 default 반환', () => {
      ioMock.readFile.mockReturnValue(`name: pdca
agent: spring-architect`);
      resetCache();
      const agent = getAgentForAction('pdca', 'unknown');
      expect(agent).toBe('spring-architect');
    });
  });

  describe('getLinkedAgents', () => {
    it('모든 연결된 agent 반환 (중복 제거)', () => {
      ioMock.readFile.mockReturnValue(`name: pdca
agents:
  analyze: gap-detector
  iterate: gap-detector
  default: spring-architect`);
      const agents = getLinkedAgents('pdca');
      expect(agents).toContain('gap-detector');
      expect(agents).toContain('spring-architect');
      expect(agents).toHaveLength(2); // 중복 제거
    });
  });

  describe('isMultiBindingSkill', () => {
    it('agents 정의 시 true', () => {
      ioMock.readFile.mockReturnValue(`name: pdca
agents:
  analyze: gap-detector`);
      resetCache();
      expect(isMultiBindingSkill('pdca')).toBe(true);
    });

    it('agent 단일 정의 시 false', () => {
      ioMock.readFile.mockReturnValue(`name: help
agent: spring-architect`);
      resetCache();
      expect(isMultiBindingSkill('help')).toBe(false);
    });
  });

  describe('orchestrateSkillPre', () => {
    it('config + imports 반환', () => {
      ioMock.readFile.mockReturnValue(`name: crud
next-skill: test
pdca-phase: do
task-template: "{feature} CRUD 구현"
imports:
  - ./templates/crud.md`);
      resetCache();

      const result = orchestrateSkillPre('crud', { feature: '회원관리' });
      expect(result.config).toBeDefined();
      expect(result.config.name).toBe('crud');
      expect(result.imports).toEqual(['./templates/crud.md']);
      expect(result.taskInfo).not.toBeNull();
      expect(result.taskInfo.subject).toBe('회원관리 CRUD 구현');
      expect(result.taskInfo.pdcaPhase).toBe('do');
    });

    it('skill 없으면 error 반환', () => {
      ioMock.readFile.mockReturnValue(null);
      resetCache();
      const result = orchestrateSkillPre('nonexistent', {});
      // fallback으로 meta는 존재하지만 task-template이 없으므로 taskInfo는 null
      expect(result.config).toBeDefined();
      expect(result.taskInfo).toBeNull();
    });
  });

  describe('orchestrateSkillPost', () => {
    it('next skill suggestion 포함', () => {
      ioMock.readFile.mockReturnValue(`name: crud
next-skill: test
agent: domain-expert`);
      resetCache();

      const result = orchestrateSkillPost('crud', { success: true });
      expect(result.success).toBe(true);
      expect(result.suggestions.nextSkill).toBe('test');
      expect(result.suggestions.nextSkillHint).toContain('/test');
      expect(result.suggestions.suggestedAgent).toBe('domain-expert');
    });

    it('next skill 없으면 suggestion 비어있음', () => {
      // fallback metadata가 없는 skill 이름 사용
      ioMock.readFile.mockReturnValue(`name: custom-skill`);
      resetCache();

      const result = orchestrateSkillPost('custom-skill', { ok: true });
      expect(result.suggestions.nextSkill).toBeUndefined();
    });
  });

  describe('getNextStepMessage', () => {
    it('다음 단계 메시지 생성', () => {
      const msg = getNextStepMessage('test');
      expect(msg).toBe('다음 단계: /test');
    });
  });
});
