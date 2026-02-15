const { evaluateCheckResults, evaluateDocument, decidePdcaPhase, recommendTeamComposition, REQUIRED_SECTIONS } = require('../../lib/team/cto-logic');

// pdca 모듈 mock
jest.mock('../../lib/pdca/status', () => ({
  loadStatus: jest.fn(),
}));

jest.mock('../../lib/pdca/phase', () => ({
  getNextPhase: jest.fn(),
  checkPhaseDeliverables: jest.fn(),
}));

jest.mock('../../lib/team/team-config', () => ({
  getPhaseTeam: jest.fn(),
}));

jest.mock('../../lib/core', () => ({
  debug: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  config: { loadConfig: () => ({ team: { level: 'Monolith' } }) },
}));

const statusMock = require('../../lib/pdca/status');
const phaseMock = require('../../lib/pdca/phase');
const teamConfigMock = require('../../lib/team/team-config');

describe('CTO Decision Logic', () => {
  beforeEach(() => jest.clearAllMocks());

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

  describe('decidePdcaPhase', () => {
    it('상태 없으면 plan 권장', () => {
      statusMock.loadStatus.mockReturnValue(null);
      const result = decidePdcaPhase('/project', 'auth');
      expect(result.currentPhase).toBeNull();
      expect(result.nextPhase).toBe('plan');
      expect(result.readyToAdvance).toBe(true);
    });

    it('deliverables 미완료 → blocker 추가', () => {
      statusMock.loadStatus.mockReturnValue({ currentPhase: 'plan', phases: {} });
      phaseMock.getNextPhase.mockReturnValue('design');
      phaseMock.checkPhaseDeliverables.mockReturnValue({
        complete: false,
        missing: ['plan.md'],
        items: [],
      });
      const result = decidePdcaPhase('/project', 'auth');
      expect(result.readyToAdvance).toBe(false);
      expect(result.blockers).toContain('Missing deliverable: plan.md');
    });

    it('deliverables 완료 → 전환 가능', () => {
      statusMock.loadStatus.mockReturnValue({ currentPhase: 'design', phases: {} });
      phaseMock.getNextPhase.mockReturnValue('do');
      phaseMock.checkPhaseDeliverables.mockReturnValue({ complete: true, missing: [], items: [] });
      const result = decidePdcaPhase('/project', 'auth');
      expect(result.readyToAdvance).toBe(true);
      expect(result.nextPhase).toBe('do');
    });

    it('analyze phase에서 숫자형 matchRate 처리', () => {
      statusMock.loadStatus.mockReturnValue({
        currentPhase: 'analyze',
        phases: { analyze: { matchRate: 85 } },
      });
      phaseMock.getNextPhase.mockReturnValue('iterate');
      phaseMock.checkPhaseDeliverables.mockReturnValue({ complete: true, missing: [], items: [] });
      const result = decidePdcaPhase('/project', 'auth');
      expect(result.readyToAdvance).toBe(false);
      expect(result.blockers.some(b => b.includes('85'))).toBe(true);
    });

    it('analyze phase에서 object형 matchRate >= 90 → 전환 가능', () => {
      statusMock.loadStatus.mockReturnValue({
        currentPhase: 'analyze',
        phases: { analyze: { matchRate: { totalRate: 95 } } },
      });
      phaseMock.getNextPhase.mockReturnValue('iterate');
      phaseMock.checkPhaseDeliverables.mockReturnValue({ complete: true, missing: [], items: [] });
      const result = decidePdcaPhase('/project', 'auth');
      expect(result.readyToAdvance).toBe(true);
    });
  });

  describe('evaluateDocument', () => {
    it('문서 없으면 score=0', () => {
      phaseMock.checkPhaseDeliverables.mockReturnValue({ items: [{ found: false, files: [] }] });
      const result = evaluateDocument('/project', 'auth', 'plan');
      expect(result.exists).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('recommendTeamComposition', () => {
    it('팀 구성 추천 반환', () => {
      teamConfigMock.getPhaseTeam.mockReturnValue({
        lead: 'spring-architect',
        members: ['domain-expert', 'api-expert'],
        pattern: 'leader',
      });
      const result = recommendTeamComposition('/project', 'auth', 'design');
      expect(result.teammates).toHaveLength(2);
      expect(result.pattern).toBe('leader');
      expect(result.reasoning).toContain('2 members');
    });

    it('팀 없으면 빈 배열', () => {
      teamConfigMock.getPhaseTeam.mockReturnValue(null);
      const result = recommendTeamComposition('/project', 'auth', 'report');
      expect(result.teammates).toEqual([]);
    });
  });

  describe('REQUIRED_SECTIONS', () => {
    it('plan 섹션 정의', () => {
      expect(REQUIRED_SECTIONS.plan).toContain('Overview');
      expect(REQUIRED_SECTIONS.plan).toContain('API Endpoints');
    });

    it('design 섹션 정의', () => {
      expect(REQUIRED_SECTIONS.design).toContain('Entity');
      expect(REQUIRED_SECTIONS.design).toContain('Controller');
    });
  });
});
