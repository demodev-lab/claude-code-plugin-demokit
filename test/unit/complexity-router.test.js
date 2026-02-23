const { assessComplexity } = require('../../lib/superwork');
const { getPhaseExecutionPatternWithComplexity } = require('../../lib/team/strategy');

describe('assessComplexity', () => {
  const noSignals = { api: false, entity: false, security: false, exception: false, infra: false, qa: false };
  const allSignals = { api: true, entity: true, security: true, exception: true, infra: true, qa: true };

  it('quickFix + Starter → single (starter_level)', () => {
    const result = assessComplexity('간단 수정', noSignals, { size: 'quickFix' }, 'Starter');
    expect(result.mode).toBe('single');
    expect(result.reason).toBe('starter_level');
  });

  it('Starter level은 score 상관없이 single', () => {
    const result = assessComplexity('대규모', allSignals, { size: 'majorFeature' }, 'Starter');
    expect(result.mode).toBe('single');
    expect(result.reason).toBe('starter_level');
  });

  it('majorFeature + MSA + 다수 signals → team', () => {
    const signals = { api: true, entity: true, security: true, exception: false, infra: false, qa: false };
    const result = assessComplexity('회원가입 API', signals, { size: 'majorFeature' }, 'MSA');
    expect(result.mode).toBe('team');
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.reason).toBe('complexity_exceeds_threshold');
  });

  it('경계값: score < 30 → single', () => {
    // minorChange(5) + SingleModule(5) + 1 signal(10) = 20 < 30
    const signals = { api: true, entity: false, security: false, exception: false, infra: false, qa: false };
    const result = assessComplexity('API', signals, { size: 'minorChange' }, 'SingleModule');
    expect(result.mode).toBe('single');
    expect(result.score).toBe(20);
  });

  it('경계값: score == 30 → team', () => {
    // feature(20) + SingleModule(5) + 0 signal + unknown level fallback
    // Actually: feature(20) + MultiModule(15) + 0 signals = 35
    // Let's craft: minorChange(5) + MSA(25) + 0 signals = 30
    const result = assessComplexity('작업', noSignals, { size: 'minorChange' }, 'MSA');
    expect(result.mode).toBe('team');
    expect(result.score).toBe(30);
  });

  it('unknown level → weight 0', () => {
    const result = assessComplexity('작업', noSignals, { size: 'quickFix' }, 'UnknownLevel');
    expect(result.mode).toBe('single');
    expect(result.score).toBe(0);
  });
});

describe('getPhaseExecutionPatternWithComplexity', () => {
  it('single mode → 항상 single 반환', () => {
    expect(getPhaseExecutionPatternWithComplexity('MSA', 'do', 'single')).toBe('single');
    expect(getPhaseExecutionPatternWithComplexity('MultiModule', 'analyze', 'single')).toBe('single');
  });

  it('team mode → 기존 패턴 반환', () => {
    expect(getPhaseExecutionPatternWithComplexity('MSA', 'do', 'team')).toBe('swarm');
    expect(getPhaseExecutionPatternWithComplexity('SingleModule', 'plan', 'team')).toBe('leader');
  });
});
