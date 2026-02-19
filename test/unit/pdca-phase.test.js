const { PHASES, PHASE_INFO, isValidPhase, getNextPhase, getPrevPhase, canTransition, PHASE_DELIVERABLES, checkPhaseDeliverables, generatePhaseSummary } = require('../../lib/pdca/phase');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('PDCA Phase', () => {
  describe('PHASES', () => {
    it('6개 phase 정의', () => {
      expect(PHASES).toEqual(['plan', 'design', 'do', 'analyze', 'iterate', 'report']);
    });
  });

  describe('isValidPhase', () => {
    it('유효한 phase → true', () => {
      PHASES.forEach(p => expect(isValidPhase(p)).toBe(true));
    });

    it('잘못된 phase → false', () => {
      expect(isValidPhase('invalid')).toBe(false);
      expect(isValidPhase('')).toBe(false);
      expect(isValidPhase(null)).toBe(false);
    });
  });

  describe('getNextPhase', () => {
    it('plan → design', () => expect(getNextPhase('plan')).toBe('design'));
    it('design → do', () => expect(getNextPhase('design')).toBe('do'));
    it('do → analyze', () => expect(getNextPhase('do')).toBe('analyze'));
    it('report → null (마지막)', () => expect(getNextPhase('report')).toBeNull());
    it('잘못된 phase → null', () => expect(getNextPhase('invalid')).toBeNull());
  });

  describe('getPrevPhase', () => {
    it('design → plan', () => expect(getPrevPhase('design')).toBe('plan'));
    it('plan → null (처음)', () => expect(getPrevPhase('plan')).toBeNull());
  });

  describe('canTransition', () => {
    it('이전 phase 완료 시 전환 가능', () => {
      const phases = { plan: { status: 'completed' } };
      expect(canTransition('plan', 'design', phases)).toBe(true);
    });

    it('이전 phase 미완료 시 전환 불가', () => {
      const phases = { plan: { status: 'pending' } };
      expect(canTransition('plan', 'design', phases)).toBe(false);
    });

    it('plan은 초기 시작 가능', () => {
      expect(canTransition(null, 'plan', {})).toBe(true);
      expect(canTransition('plan', 'plan', {})).toBe(true);
    });

    it('잘못된 target → false', () => {
      expect(canTransition('plan', 'invalid', {})).toBe(false);
    });
  });

  describe('PHASE_DELIVERABLES', () => {
    it('모든 phase에 deliverables 정의', () => {
      PHASES.forEach(phase => {
        expect(PHASE_DELIVERABLES[phase]).toBeDefined();
        expect(Array.isArray(PHASE_DELIVERABLES[phase])).toBe(true);
        expect(PHASE_DELIVERABLES[phase].length).toBeGreaterThan(0);
      });
    });

    it('각 deliverable에 name, pattern 존재', () => {
      Object.values(PHASE_DELIVERABLES).flat().forEach(d => {
        expect(d.name).toBeDefined();
        expect(d.pattern).toBeDefined();
      });
    });
  });

  describe('checkPhaseDeliverables', () => {
    it('존재하지 않는 경로에서 missing 반환', () => {
      const result = checkPhaseDeliverables('/nonexistent', 'test', 'plan');
      expect(result.complete).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it('결과에 items 배열 포함', () => {
      const result = checkPhaseDeliverables('/nonexistent', 'test', 'plan');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items[0]).toHaveProperty('name');
      expect(result.items[0]).toHaveProperty('found');
    });

    it('do phase에서는 entity 패턴 탐색이 1개 파일로 조기 종료', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdca-phase-test-'));
      try {
        const entityDir = path.join(tmpDir, 'src', 'main', 'java', 'example', 'entity');
        fs.mkdirSync(entityDir, { recursive: true });
        fs.writeFileSync(path.join(entityDir, 'A.java'), 'class A {}');
        fs.writeFileSync(path.join(entityDir, 'B.java'), 'class B {}');

        const result = checkPhaseDeliverables(tmpDir, 'feature', 'do');
        expect(result.complete).toBe(true);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].files).toHaveLength(1);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('do phase 완료 후에는 sticky cache로 반복 체크를 빠르게 반환', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdca-phase-sticky-'));
      try {
        const entityDir = path.join(tmpDir, 'src', 'main', 'java', 'example', 'entity');
        fs.mkdirSync(entityDir, { recursive: true });
        const filePath = path.join(entityDir, 'A.java');
        fs.writeFileSync(filePath, 'class A {}');

        const first = checkPhaseDeliverables(tmpDir, 'feature', 'do');
        expect(first.complete).toBe(true);

        // 이후 파일이 일시적으로 사라져도 do 완료 판정은 유지(성능 최적화 목적)
        fs.rmSync(filePath, { force: true });
        const second = checkPhaseDeliverables(tmpDir, 'feature', 'do');
        expect(second.complete).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('generatePhaseSummary', () => {
    it('phase 상태 시각적 요약 생성', () => {
      const status = {
        currentPhase: 'design',
        phases: {
          plan: { status: 'completed' },
          design: { status: 'in-progress' },
          do: { status: 'pending' },
          analyze: { status: 'pending' },
          iterate: { status: 'pending' },
          report: { status: 'pending' },
        },
      };
      const summary = generatePhaseSummary(status);
      expect(summary).toContain('Plan');
      expect(summary).toContain('Design');
      expect(summary).toContain('(현재)');
    });

    it('null 입력 시 빈 문자열', () => {
      expect(generatePhaseSummary(null)).toBe('');
      expect(generatePhaseSummary({})).toBe('');
    });
  });
});
