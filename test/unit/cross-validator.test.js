const {
  CROSS_VALIDATION_MAP,
  CROSS_VALIDATION_THRESHOLD,
  LAYER_REVIEW_CHECKLIST,
  shouldCrossValidate,
  buildCrossValidationPairs,
  buildCrossValidationMarkdown,
  buildCrossValidationDispatch,
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

  describe('CROSS_VALIDATION_MAP', () => {
    it('test layer가 service-expert로 매핑됨', () => {
      expect(CROSS_VALIDATION_MAP.test).toBe('service-expert');
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

    it('파일 패턴 포함', () => {
      const pairs = [
        { sourceLayer: 'entity', validatorAgent: 'service-expert' },
      ];
      const md = buildCrossValidationMarkdown(pairs, 1, 'feat');
      expect(md).toContain('src/**/entity/**');
    });

    it('검토 항목 체크리스트 포함', () => {
      const pairs = [
        { sourceLayer: 'entity', validatorAgent: 'service-expert' },
      ];
      const md = buildCrossValidationMarkdown(pairs, 1, 'feat');
      expect(md).toContain('검토 항목');
      expect(md).toContain('필드명/타입 일관성');
    });

    it('완료 보고 양식 포함', () => {
      const pairs = [
        { sourceLayer: 'entity', validatorAgent: 'service-expert' },
      ];
      const md = buildCrossValidationMarkdown(pairs, 1, 'feat');
      expect(md).toContain('완료 보고 양식');
      expect(md).toContain('Reviewed layer');
      expect(md).toContain('Issues found');
    });

    it('featureSlug undefined → "unknown" fallback', () => {
      const pairs = [{ sourceLayer: 'entity', validatorAgent: 'service-expert' }];
      const md = buildCrossValidationMarkdown(pairs, 1, undefined);
      expect(md).toContain('(unknown)');
      expect(md).not.toContain('undefined');
    });

    it('빈 pairs → 빈 문자열', () => {
      expect(buildCrossValidationMarkdown([], 1, 'feat')).toBe('');
    });
  });

  describe('buildCrossValidationDispatch', () => {
    it('병렬 실행 지시 포함', () => {
      const pairs = [
        { sourceLayer: 'entity', validatorAgent: 'service-expert' },
        { sourceLayer: 'service', validatorAgent: 'api-expert' },
      ];
      const md = buildCrossValidationDispatch(pairs, 1, 'feat');
      expect(md).toContain('병렬 실행');
      expect(md).toContain('2개 교차 검증');
    });

    it('빈 pairs → 빈 문자열', () => {
      expect(buildCrossValidationDispatch([], 1, 'feat')).toBe('');
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

    it('complexityScore 0 → required:false', () => {
      const waveState = {
        waves: [{ waveIndex: 1, tasks: [{ layer: 'entity', status: 'completed' }] }],
      };
      const result = attachCrossValidation(waveState, 1, 0);
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
