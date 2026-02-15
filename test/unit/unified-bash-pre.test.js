const path = require('path');

describe('Unified Bash Pre Handler', () => {
  let unifiedBashPre;

  beforeEach(() => {
    jest.resetModules();
    unifiedBashPre = require('../../scripts/unified-bash-pre');
  });

  describe('AGENT_BASH_GUARDS', () => {
    it('qa-monitor guard 등록', () => {
      const guard = unifiedBashPre.AGENT_BASH_GUARDS['qa-monitor'];
      expect(guard).toBeDefined();
      expect(guard.patterns.length).toBeGreaterThan(0);
    });

    it('code-analyzer guard 등록', () => {
      const guard = unifiedBashPre.AGENT_BASH_GUARDS['code-analyzer'];
      expect(guard).toBeDefined();
      expect(guard.block).toContain('Write');
    });
  });

  describe('SKILL_BASH_GUARDS', () => {
    it('deploy guard 등록', () => {
      const guard = unifiedBashPre.SKILL_BASH_GUARDS['deploy'];
      expect(guard).toBeDefined();
      expect(guard.patterns.length).toBeGreaterThan(0);
    });

    it('kubectl delete 패턴', () => {
      const guard = unifiedBashPre.SKILL_BASH_GUARDS['deploy'];
      const kubectlPattern = guard.patterns.find(p => p.pattern.test('kubectl delete pod my-pod'));
      expect(kubectlPattern).toBeDefined();
    });

    it('terraform destroy 패턴', () => {
      const guard = unifiedBashPre.SKILL_BASH_GUARDS['deploy'];
      const terraformPattern = guard.patterns.find(p => p.pattern.test('terraform destroy'));
      expect(terraformPattern).toBeDefined();
    });
  });

  describe('qa-monitor patterns', () => {
    it('rm -rf 차단', () => {
      const guard = unifiedBashPre.AGENT_BASH_GUARDS['qa-monitor'];
      const rmPattern = guard.patterns.find(p => p.pattern.test('rm -rf /'));
      expect(rmPattern).toBeDefined();
      expect(rmPattern.message).toContain('QA Monitor');
    });

    it('DROP TABLE 차단', () => {
      const guard = unifiedBashPre.AGENT_BASH_GUARDS['qa-monitor'];
      const dropPattern = guard.patterns.find(p => p.pattern.test('DROP TABLE users'));
      expect(dropPattern).toBeDefined();
    });

    it('일반 명령은 통과', () => {
      const guard = unifiedBashPre.AGENT_BASH_GUARDS['qa-monitor'];
      const anyMatch = guard.patterns.some(p => p.pattern.test('ls -la'));
      expect(anyMatch).toBe(false);
    });
  });
});
