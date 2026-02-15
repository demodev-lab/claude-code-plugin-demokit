/**
 * PDCA 전체 워크플로우 통합 테스트
 * create → phase transition → phaseHistory → archive
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('PDCA Workflow Integration', () => {
  let tmpDir;
  let pdcaStatus;
  let pdcaPhase;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdca-workflow-'));
    fs.mkdirSync(path.join(tmpDir, '.pdca'), { recursive: true });

    jest.resetModules();

    jest.doMock('../../lib/core', () => ({
      io: {
        readJson: (filePath) => {
          try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
        },
        writeJson: (filePath, data) => {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        },
        fileExists: (p) => fs.existsSync(p),
        listFiles: (dir, regex) => {
          if (!fs.existsSync(dir)) return [];
          return fs.readdirSync(dir).filter(f => regex.test(f)).map(f => path.join(dir, f));
        },
      },
      debug: { debug: () => {}, warn: () => {} },
    }));

    pdcaStatus = require('../../lib/pdca/status');
    pdcaPhase = require('../../lib/pdca/phase');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('전체 PDCA 사이클: 생성 → phase 전환 → 완료', () => {
    // 1. Feature 생성
    const status = pdcaStatus.createStatus(tmpDir, 'user-management');
    expect(status.currentPhase).toBe('plan');
    expect(status.phaseHistory).toEqual([]);

    // 2. Plan 완료 → Design 전환
    const afterPlan = pdcaStatus.updatePhaseStatus(tmpDir, 'user-management', 'plan', {
      status: 'completed',
      completedAt: '2024-01-01T00:00:00Z',
      documentPath: '.pdca/user-management/plan.md',
    });
    expect(afterPlan.phaseHistory).toHaveLength(1);
    expect(afterPlan.phaseHistory[0].phase).toBe('plan');

    // 전환 가능 확인
    expect(pdcaPhase.canTransition('plan', 'design', afterPlan.phases)).toBe(true);
    expect(pdcaPhase.canTransition('plan', 'do', afterPlan.phases)).toBe(false);

    // currentPhase 업데이트
    const fullStatus = pdcaStatus.loadStatus(tmpDir, 'user-management');
    fullStatus.currentPhase = 'design';
    fullStatus.phases.design.status = 'in-progress';
    fullStatus.phases.design.startedAt = '2024-01-02T00:00:00Z';
    pdcaStatus.saveStatus(tmpDir, 'user-management', fullStatus);

    // 3. Design 완료 → Do 전환
    pdcaStatus.updatePhaseStatus(tmpDir, 'user-management', 'design', {
      status: 'completed',
      completedAt: '2024-01-03T00:00:00Z',
    });

    const afterDesign = pdcaStatus.loadStatus(tmpDir, 'user-management');
    expect(afterDesign.phaseHistory).toHaveLength(2);
    expect(pdcaPhase.canTransition('design', 'do', afterDesign.phases)).toBe(true);

    // 4. Phase summary 생성
    afterDesign.currentPhase = 'do';
    const summary = pdcaPhase.generatePhaseSummary(afterDesign);
    expect(summary).toContain('Plan');
    expect(summary).toContain('Do');
    expect(summary).toContain('(현재)');
  });

  it('feature 목록 조회', () => {
    pdcaStatus.createStatus(tmpDir, 'feature-a');
    pdcaStatus.createStatus(tmpDir, 'feature-b');

    const features = pdcaStatus.listFeatures(tmpDir);
    expect(features).toHaveLength(2);

    const names = features.map(f => f.feature).sort();
    expect(names).toEqual(['feature-a', 'feature-b']);
  });

  it('deliverables 검증', () => {
    // .pdca/test-feature/plan.md 생성
    const featureDir = path.join(tmpDir, '.pdca', 'test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    fs.writeFileSync(path.join(featureDir, 'plan.md'), '# Plan');

    const result = pdcaPhase.checkPhaseDeliverables(tmpDir, 'test-feature', 'plan');
    expect(result.complete).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});
