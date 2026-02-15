const { forkContext, getForkedContext, updateForkedContext, mergeForkedContext, discardFork, getActiveForks, clearAllForks } = require('../../lib/context-fork');

describe('Context Fork', () => {
  beforeEach(() => {
    clearAllForks();
  });

  describe('forkContext', () => {
    it('fork 생성 + forkId 반환', () => {
      const result = forkContext('test-skill');
      expect(result.forkId).toBeDefined();
      expect(result.forkId).toMatch(/^fork-/);
      expect(result.context).toBeDefined();
    });

    it('각 fork는 고유 ID', () => {
      const fork1 = forkContext('skill-a');
      const fork2 = forkContext('skill-b');
      expect(fork1.forkId).not.toBe(fork2.forkId);
    });

    it('deep clone 격리 확인', () => {
      const fork = forkContext('test');
      fork.context.testValue = 'modified';
      // 다른 fork에 영향 없음
      const fork2 = forkContext('test2');
      expect(fork2.context.testValue).toBeUndefined();
    });
  });

  describe('getForkedContext', () => {
    it('존재하는 fork 조회', () => {
      const { forkId } = forkContext('test');
      const ctx = getForkedContext(forkId);
      expect(ctx).not.toBeNull();
    });

    it('존재하지 않는 fork → null', () => {
      expect(getForkedContext('nonexistent')).toBeNull();
    });
  });

  describe('updateForkedContext', () => {
    it('fork 상태 업데이트', () => {
      const { forkId } = forkContext('test');
      updateForkedContext(forkId, { newField: 'value' });
      const ctx = getForkedContext(forkId);
      expect(ctx.newField).toBe('value');
    });

    it('존재하지 않는 fork → 무시', () => {
      expect(() => updateForkedContext('nonexistent', {})).not.toThrow();
    });
  });

  describe('mergeForkedContext', () => {
    it('병합 성공', () => {
      const { forkId } = forkContext('test');
      updateForkedContext(forkId, { features: ['new-feature'] });
      const result = mergeForkedContext(forkId);
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('존재하지 않는 fork → 실패', () => {
      const result = mergeForkedContext('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Fork not found');
    });

    it('mergeResult:false → 병합 스킵', () => {
      const { forkId } = forkContext('test', { mergeResult: false });
      const result = mergeForkedContext(forkId);
      expect(result.success).toBe(true);
      expect(result.merged).toBeNull();
    });

    it('병합 후 fork 삭제', () => {
      const { forkId } = forkContext('test');
      mergeForkedContext(forkId);
      expect(getForkedContext(forkId)).toBeNull();
    });

    it('conflict 감지', () => {
      const { forkId } = forkContext('test');
      updateForkedContext(forkId, { features: ['changed'] });
      const result = mergeForkedContext(forkId);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.conflicts)).toBe(true);
    });
  });

  describe('discardFork', () => {
    it('fork 폐기 (병합 없이)', () => {
      const { forkId } = forkContext('test');
      discardFork(forkId);
      expect(getForkedContext(forkId)).toBeNull();
    });

    it('존재하지 않는 fork → 에러 없음', () => {
      expect(() => discardFork('nonexistent')).not.toThrow();
    });
  });

  describe('getActiveForks', () => {
    it('활성 fork 목록', () => {
      forkContext('skill-a');
      forkContext('skill-b');
      const forks = getActiveForks();
      expect(forks).toHaveLength(2);
      expect(forks[0]).toHaveProperty('forkId');
      expect(forks[0]).toHaveProperty('name');
      expect(forks[0]).toHaveProperty('createdAt');
    });

    it('빈 목록', () => {
      expect(getActiveForks()).toHaveLength(0);
    });
  });

  describe('clearAllForks', () => {
    it('전체 정리', () => {
      forkContext('a');
      forkContext('b');
      forkContext('c');
      clearAllForks();
      expect(getActiveForks()).toHaveLength(0);
    });
  });
});
