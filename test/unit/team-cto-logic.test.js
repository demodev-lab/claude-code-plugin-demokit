const { evaluateCheckResults } = require('../../lib/team/cto-logic');

jest.mock('../../lib/core', () => ({
  debug: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('CTO Decision Logic', () => {
  describe('evaluateCheckResults', () => {
    it('matchRate>=90 & critical==0 → report', () => {
      const result = evaluateCheckResults(95, 0, 90);
      expect(result.decision).toBe('report');
      expect(result.nextAction).toBe('/pdca report');
    });

    it('matchRate>=70 → iterate', () => {
      const result = evaluateCheckResults(80, 0, 85);
      expect(result.decision).toBe('iterate');
    });

    it('matchRate>=70 with critical → iterate', () => {
      const result = evaluateCheckResults(85, 2, 80);
      expect(result.decision).toBe('iterate');
      expect(result.reason).toContain('critical issues');
    });

    it('matchRate<70 → redesign', () => {
      const result = evaluateCheckResults(50, 3, 40);
      expect(result.decision).toBe('redesign');
      expect(result.nextAction).toBe('/pdca design');
    });

    it('matchRate==90 정확 경계 → report', () => {
      const result = evaluateCheckResults(90, 0, 90);
      expect(result.decision).toBe('report');
    });

    it('matchRate==70 정확 경계 → iterate', () => {
      const result = evaluateCheckResults(70, 0, 70);
      expect(result.decision).toBe('iterate');
    });

    it('criticalIssues가 undefined여도 report 가능', () => {
      const result = evaluateCheckResults(95, undefined, 90);
      expect(result.decision).toBe('report');
    });

    it('criticalIssues가 null이어도 report 가능', () => {
      const result = evaluateCheckResults(92, null, 88);
      expect(result.decision).toBe('report');
    });
  });
});
