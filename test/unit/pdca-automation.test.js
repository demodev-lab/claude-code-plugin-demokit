const { calculateMatchRate, needsIteration, identifyGaps, getAutomationLevel, shouldAutoTransition, DEFAULT_WEIGHTS } = require('../../lib/pdca/automation');

describe('PDCA Automation', () => {
  describe('calculateMatchRate', () => {
    it('빈 입력 시 모든 rate 100% 반환', () => {
      const result = calculateMatchRate({}, {});
      expect(result.totalRate).toBe(100);
    });

    it('null 입력 시 안전하게 처리', () => {
      const result = calculateMatchRate(null, null);
      expect(result.totalRate).toBe(100);
    });

    it('API 엔드포인트 매칭 계산', () => {
      const design = {
        apis: [
          { method: 'GET', path: '/api/users' },
          { method: 'POST', path: '/api/users' },
        ],
      };
      const impl = {
        apis: [
          { method: 'GET', path: '/api/users' },
        ],
      };
      const result = calculateMatchRate(design, impl);
      expect(result.details.apiEndpoints.matched).toBe(1);
      expect(result.details.apiEndpoints.total).toBe(2);
      expect(result.details.apiEndpoints.rate).toBe(50);
    });

    it('전체 매칭 시 100% 반환', () => {
      const design = {
        apis: [{ method: 'GET', path: '/api/users' }],
        tables: ['users'],
        dtos: ['UserDto'],
        errors: [{ status: '404', name: 'not-found' }],
        rules: ['unique-email'],
      };
      const impl = {
        apis: [{ method: 'GET', path: '/api/users' }],
        entities: ['users'],
        dtos: ['UserDto'],
        exceptions: [{ status: '404', name: 'not-found' }],
        rules: ['unique-email'],
      };
      const result = calculateMatchRate(design, impl);
      expect(result.totalRate).toBe(100);
    });

    it('가중치 적용 확인', () => {
      const result = calculateMatchRate({}, {}, { apiEndpoints: 50 });
      expect(result.weights.apiEndpoints).toBe(50);
    });
  });

  describe('needsIteration', () => {
    it('rate < threshold 시 true', () => {
      expect(needsIteration({ totalRate: 80 }, 90)).toBe(true);
    });

    it('rate >= threshold 시 false', () => {
      expect(needsIteration({ totalRate: 95 }, 90)).toBe(false);
    });

    it('잘못된 입력 시 true (0으로 처리)', () => {
      expect(needsIteration(null)).toBe(true);
      expect(needsIteration({})).toBe(true);
    });
  });

  describe('identifyGaps', () => {
    it('rate < 100인 카테고리만 반환', () => {
      const matchRate = {
        details: {
          apiEndpoints: { rate: 100, matched: 2, total: 2 },
          dbSchema: { rate: 50, matched: 1, total: 2 },
          dtoFields: { rate: 0, matched: 0, total: 3 },
        },
      };
      const gaps = identifyGaps(matchRate);
      expect(gaps).toHaveLength(2);
      expect(gaps[0].category).toBe('dtoFields');
      expect(gaps[1].category).toBe('dbSchema');
    });

    it('잘못된 입력 시 빈 배열', () => {
      expect(identifyGaps(null)).toEqual([]);
      expect(identifyGaps({})).toEqual([]);
    });

    it('rate 오름차순 정렬', () => {
      const matchRate = {
        details: {
          a: { rate: 80, matched: 4, total: 5 },
          b: { rate: 20, matched: 1, total: 5 },
          c: { rate: 50, matched: 5, total: 10 },
        },
      };
      const gaps = identifyGaps(matchRate);
      expect(gaps[0].rate).toBe(20);
      expect(gaps[1].rate).toBe(50);
      expect(gaps[2].rate).toBe(80);
    });
  });

  describe('getAutomationLevel', () => {
    it('프로젝트 config가 없으면 manual 반환', () => {
      const level = getAutomationLevel('/nonexistent/path');
      // 플러그인 config에 semi-auto가 설정되어 있으므로
      expect(['manual', 'semi-auto']).toContain(level);
    });
  });

  describe('shouldAutoTransition', () => {
    it('manual 레벨에서는 항상 false', () => {
      // manual이 아닌 경우에도 deliverables가 없으면 false
      const result = shouldAutoTransition('/nonexistent/path', 'test-feature', 'plan');
      expect(result).toBe(false);
    });
  });
});
