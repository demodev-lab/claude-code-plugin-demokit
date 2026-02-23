const {
  CROSS_VALIDATION_MAP,
  CROSS_VALIDATION_THRESHOLD,
  shouldCrossValidate,
  buildCrossValidationPairs,
  buildCrossValidationMarkdown,
  attachCrossValidation,
} = require('../../lib/team/cross-validator');

describe('team/cross-validator', () => {
  describe('shouldCrossValidate', () => {
    it('threshold 이상이면 true', () => {
      expect(shouldCrossValidate(CROSS_VALIDATION_THRESHOLD)).toBe(true);
      expect(shouldCrossValidate(100)).toBe(true);
    });

    it('threshold 미만이면 false', () => {
      expect(shouldCrossValidate(49)).toBe(false);
      expect(shouldCrossValidate(0)).toBe(false);
    });

    it('null/undefined → false', () => {
      expect(shouldCrossValidate(null)).toBe(false);
      expect(shouldCrossValidate(undefined)).toBe(false);
    });
  });

  describe('buildCrossValidationPairs', () => {
    it('completed task만 매핑', () => {
      const tasks = [
        { layer: 'entity', status: 'completed' },
        { layer: 'service', status: 'failed' },
        { layer: 'controller', status: 'completed' },
      ];
      const pairs = buildCrossValidationPairs(tasks);
      expect(pairs).toHaveLength(2);
      expect(pairs[0]).toEqual({ sourceLayer: 'entity', validatorAgent: 'service-expert' });
      expect(pairs[1]).toEqual({ sourceLayer: 'controller', validatorAgent: 'test-expert' });
    });

    it('매핑 없는 layer는 제외', () => {
      const tasks = [{ layer: 'unknown', status: 'completed' }];
      expect(buildCrossValidationPairs(tasks)).toEqual([]);
    });

    it('빈 배열', () => {
      expect(buildCrossValidationPairs([])).toEqual([]);
    });

    it('null 방어', () => {
      expect(buildCrossValidationPairs(null)).toEqual([]);
    });

    it('동일 layer 중복 task 시 pair 1개만 생성', () => {
      const tasks = [
        { layer: 'entity', status: 'completed' },
        { layer: 'entity', status: 'completed' },
      ];
      const pairs = buildCrossValidationPairs(tasks);
      expect(pairs).toHaveLength(1);
    });
  });

  describe('buildCrossValidationMarkdown', () => {
    it('마크다운 포함', () => {
      const pairs = [
        { sourceLayer: 'entity', validatorAgent: 'service-expert' },
      ];
      const md = buildCrossValidationMarkdown(pairs, 1, 'test-feat');
      expect(md).toContain('Wave 1 교차 검증');
      expect(md).toContain('test-feat');
      expect(md).toContain('service-expert');
      expect(md).toContain('entity');
    });

    it('빈 pairs → 빈 문자열', () => {
      expect(buildCrossValidationMarkdown([], 1, 'feat')).toBe('');
    });
  });

  describe('attachCrossValidation', () => {
    it('score 충족 + completed tasks → required:true', () => {
      const waveState = {
        waves: [{
          waveIndex: 1,
          tasks: [
            { layer: 'entity', status: 'completed' },
            { layer: 'service', status: 'completed' },
          ],
        }],
      };
      const result = attachCrossValidation(waveState, 1, 60);
      expect(result.required).toBe(true);
      expect(result.pairs.length).toBeGreaterThan(0);
    });

    it('score 미달 → required:false', () => {
      const waveState = {
        waves: [{
          waveIndex: 1,
          tasks: [{ layer: 'entity', status: 'completed' }],
        }],
      };
      const result = attachCrossValidation(waveState, 1, 30);
      expect(result.required).toBe(false);
    });

    it('null waveState 방어', () => {
      const result = attachCrossValidation(null, 1, 60);
      expect(result.required).toBe(false);
      expect(result.pairs).toEqual([]);
    });

    it('존재하지 않는 waveIndex 방어', () => {
      const waveState = { waves: [{ waveIndex: 1, tasks: [] }] };
      const result = attachCrossValidation(waveState, 99, 60);
      expect(result.required).toBe(false);
    });
  });
});
