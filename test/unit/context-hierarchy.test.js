const { getContextHierarchy, getHierarchicalConfig, setSessionContext, getSessionContext, clearSessionContext, invalidateCache, LEVEL_PRIORITY } = require('../../lib/context-hierarchy');

describe('Context Hierarchy', () => {
  beforeEach(() => {
    clearSessionContext();
    invalidateCache();
  });

  describe('LEVEL_PRIORITY', () => {
    it('4-level 우선순위 정의', () => {
      expect(LEVEL_PRIORITY.plugin).toBe(1);
      expect(LEVEL_PRIORITY.user).toBe(2);
      expect(LEVEL_PRIORITY.project).toBe(3);
      expect(LEVEL_PRIORITY.session).toBe(4);
    });
  });

  describe('getContextHierarchy', () => {
    it('계층 구조 반환', () => {
      const hierarchy = getContextHierarchy();
      expect(hierarchy).toHaveProperty('levels');
      expect(hierarchy).toHaveProperty('merged');
      expect(hierarchy).toHaveProperty('conflicts');
      expect(Array.isArray(hierarchy.levels)).toBe(true);
    });

    it('캐시 동작 확인', () => {
      const h1 = getContextHierarchy();
      const h2 = getContextHierarchy();
      expect(h1).toBe(h2); // 같은 참조 (캐시)
    });

    it('forceRefresh 시 새로 로드', () => {
      const h1 = getContextHierarchy();
      const h2 = getContextHierarchy(true);
      expect(h2).toHaveProperty('levels');
    });

    it('plugin level 포함', () => {
      const hierarchy = getContextHierarchy(true);
      const pluginLevel = hierarchy.levels.find(l => l.level === 'plugin');
      expect(pluginLevel).toBeDefined();
    });

    it('session level 포함', () => {
      setSessionContext('testKey', 'testValue');
      const hierarchy = getContextHierarchy(true);
      const sessionLevel = hierarchy.levels.find(l => l.level === 'session');
      expect(sessionLevel).toBeDefined();
      expect(sessionLevel.data.testKey).toBe('testValue');
    });
  });

  describe('getHierarchicalConfig', () => {
    it('dot-notation 값 조회', () => {
      // plugin config (demodev.config.json)의 pdca.matchRateThreshold
      const threshold = getHierarchicalConfig('pdca.matchRateThreshold');
      expect(threshold).toBe(90);
    });

    it('없는 키 → defaultValue', () => {
      const val = getHierarchicalConfig('nonexistent.key', 'default');
      expect(val).toBe('default');
    });

    it('session 우선순위 확인', () => {
      setSessionContext('pdca', { matchRateThreshold: 95 });
      const threshold = getHierarchicalConfig('pdca.matchRateThreshold');
      expect(threshold).toBe(95);
    });
  });

  describe('Session Context', () => {
    it('set → get', () => {
      setSessionContext('key1', 'value1');
      expect(getSessionContext('key1')).toBe('value1');
    });

    it('없는 키 → defaultValue', () => {
      expect(getSessionContext('nonexistent', 'fallback')).toBe('fallback');
    });

    it('clear 후 빈 값', () => {
      setSessionContext('key1', 'value1');
      clearSessionContext();
      expect(getSessionContext('key1')).toBeNull();
    });

    it('set 시 캐시 무효화', () => {
      const h1 = getContextHierarchy();
      setSessionContext('newKey', 'newValue');
      const h2 = getContextHierarchy();
      // 캐시가 무효화되었으므로 다른 참조
      expect(h1).not.toBe(h2);
    });
  });

  describe('invalidateCache', () => {
    it('캐시 무효화 후 재로드', () => {
      const h1 = getContextHierarchy();
      invalidateCache();
      const h2 = getContextHierarchy();
      expect(h2).toHaveProperty('levels');
    });
  });
});
