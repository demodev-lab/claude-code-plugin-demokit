const path = require('path');
const fs = require('fs');
const os = require('os');

describe('PDCA Template', () => {
  let template;

  beforeEach(() => {
    jest.resetModules();
    template = require('../../lib/pdca/template');
  });

  describe('getDefaultVariables', () => {
    it('기본 변수 생성', () => {
      const vars = template.getDefaultVariables('auth', 'plan');
      expect(vars.feature).toBe('auth');
      expect(vars.featureName).toBe('auth');
      expect(vars.phase).toBe('plan');
      expect(vars.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(vars.status).toBe('in-progress');
    });

    it('options 반영', () => {
      const vars = template.getDefaultVariables('auth', 'plan', { project: 'myapp', version: '1.0' });
      expect(vars.project).toBe('myapp');
      expect(vars.version).toBe('1.0');
    });
  });

  describe('loadTemplate', () => {
    it('plan 템플릿 로드', () => {
      const content = template.loadTemplate('plan');
      expect(content).not.toBeNull();
      expect(content).toContain('{{featureName}}');
    });

    it('design 템플릿 로드', () => {
      const content = template.loadTemplate('design');
      expect(content).not.toBeNull();
    });

    it('존재하지 않는 phase → null', () => {
      const content = template.loadTemplate('nonexistent-phase-xyz');
      expect(content).toBeNull();
    });

    it('level fallback (level-specific 없으면 기본 템플릿)', () => {
      const content = template.loadTemplate('plan', 'Monolith');
      // plan-monolith.template.md가 없으므로 plan.template.md fallback
      expect(content).not.toBeNull();
      expect(content).toContain('{{featureName}}');
    });
  });

  describe('fillTemplate', () => {
    it('변수 치환', () => {
      const result = template.fillTemplate('Hello {{feature}}!', { feature: 'auth' });
      expect(result).toBe('Hello auth!');
    });

    it('여러 변수 치환', () => {
      const result = template.fillTemplate('{{feature}} - {{phase}} - {{date}}', {
        feature: 'auth',
        phase: 'plan',
        date: '2024-01-01',
      });
      expect(result).toBe('auth - plan - 2024-01-01');
    });

    it('없는 변수는 원본 유지', () => {
      const result = template.fillTemplate('{{feature}} {{unknown}}', { feature: 'auth' });
      expect(result).toBe('auth {{unknown}}');
    });

    it('빈 입력 → 빈 문자열', () => {
      expect(template.fillTemplate(null, {})).toBe('');
      expect(template.fillTemplate('', {})).toBe('');
    });
  });

  describe('getPhaseTemplate', () => {
    it('plan phase 템플릿 로드+치환', () => {
      const result = template.getPhaseTemplate('plan', 'auth');
      expect(result).not.toBeNull();
      expect(result.content).toContain('auth');
      expect(result.templatePath).toContain('plan.template.md');
      expect(result.variables.feature).toBe('auth');
    });

    it('존재하지 않는 phase → null', () => {
      const result = template.getPhaseTemplate('nonexistent-xyz', 'auth');
      expect(result).toBeNull();
    });

    it('analyze phase (파일명 불일치) 시 templatePath 정상 반환', () => {
      // analyze phase → analysis.template.md (PHASE_INFO fallback)
      const result = template.getPhaseTemplate('analyze', 'auth');
      expect(result).not.toBeNull();
      expect(result.templatePath).not.toBeNull();
      expect(result.templatePath).toContain('analysis.template.md');
    });
  });

  describe('listAvailableTemplates', () => {
    it('템플릿 목록 반환', () => {
      const list = template.listAvailableTemplates();
      expect(list.length).toBeGreaterThanOrEqual(6);
      const phases = list.map(t => t.phase);
      expect(phases).toContain('plan');
      expect(phases).toContain('design');
      expect(phases).toContain('do');
      expect(phases).toContain('analyze');
    });

    it('각 항목에 phase, path 포함', () => {
      const list = template.listAvailableTemplates();
      for (const item of list) {
        expect(item.phase).toBeDefined();
        expect(item.path).toContain('.template.md');
      }
    });

    it('iteration-report는 iterate phase로 매핑', () => {
      const list = template.listAvailableTemplates();
      const iterateItem = list.find(t => t.path.includes('iteration-report'));
      expect(iterateItem).toBeDefined();
      expect(iterateItem.phase).toBe('iterate');
    });
  });
});
