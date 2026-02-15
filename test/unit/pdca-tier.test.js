const {
  TIER_EXTENSIONS, getLanguageTier, getTierDescription, getTierPdcaGuidance,
  isTier1, isTier2, isTier3, isTier4, isExperimental,
} = require('../../lib/pdca/tier');

describe('PDCA Tier', () => {
  describe('TIER_EXTENSIONS', () => {
    it('4개 tier + experimental 정의', () => {
      expect(TIER_EXTENSIONS[1]).toContain('.java');
      expect(TIER_EXTENSIONS[1]).toContain('.kt');
      expect(TIER_EXTENSIONS[2]).toContain('.gradle');
      expect(TIER_EXTENSIONS[3]).toContain('.xml');
      expect(TIER_EXTENSIONS[4]).toContain('.md');
      expect(TIER_EXTENSIONS.experimental).toContain('.groovy');
    });
  });

  describe('getLanguageTier', () => {
    it('.java → Tier 1', () => {
      expect(getLanguageTier('src/main/java/User.java')).toBe('1');
    });

    it('.kt → Tier 1', () => {
      expect(getLanguageTier('Main.kt')).toBe('1');
    });

    it('.gradle → Tier 2', () => {
      expect(getLanguageTier('build.gradle')).toBe('2');
    });

    it('.gradle.kts → Tier 2', () => {
      expect(getLanguageTier('build.gradle.kts')).toBe('2');
    });

    it('.yml → Tier 2', () => {
      expect(getLanguageTier('application.yml')).toBe('2');
    });

    it('.sql → Tier 2', () => {
      expect(getLanguageTier('V1__init.sql')).toBe('2');
    });

    it('.xml → Tier 3', () => {
      expect(getLanguageTier('pom.xml')).toBe('3');
    });

    it('.md → Tier 4', () => {
      expect(getLanguageTier('README.md')).toBe('4');
    });

    it('.groovy → experimental', () => {
      expect(getLanguageTier('script.groovy')).toBe('experimental');
    });

    it('.sh → experimental', () => {
      expect(getLanguageTier('deploy.sh')).toBe('experimental');
    });

    it('미등록 확장자 → unknown', () => {
      expect(getLanguageTier('file.rs')).toBe('unknown');
    });

    it('확장자 없음 → unknown', () => {
      expect(getLanguageTier('Makefile')).toBe('unknown');
    });

    it('null/빈값 → unknown', () => {
      expect(getLanguageTier(null)).toBe('unknown');
      expect(getLanguageTier('')).toBe('unknown');
    });
  });

  describe('getTierDescription', () => {
    it('각 tier에 대한 설명 반환', () => {
      expect(getTierDescription('1')).toContain('핵심');
      expect(getTierDescription('2')).toContain('빌드');
      expect(getTierDescription('unknown')).toContain('분류');
    });
  });

  describe('getTierPdcaGuidance', () => {
    it('각 tier에 대한 PDCA 가이드 반환', () => {
      expect(getTierPdcaGuidance('1')).toContain('Plan');
      expect(getTierPdcaGuidance('experimental')).toContain('실험');
    });

    it('존재하지 않는 tier → unknown guidance', () => {
      expect(getTierPdcaGuidance('99')).toContain('확장자');
    });
  });

  describe('convenience functions', () => {
    it('isTier1', () => {
      expect(isTier1('User.java')).toBe(true);
      expect(isTier1('build.gradle')).toBe(false);
    });

    it('isTier2', () => {
      expect(isTier2('build.gradle')).toBe(true);
      expect(isTier2('User.java')).toBe(false);
    });

    it('isTier3', () => {
      expect(isTier3('pom.xml')).toBe(true);
      expect(isTier3('User.java')).toBe(false);
    });

    it('isTier4', () => {
      expect(isTier4('README.md')).toBe(true);
      expect(isTier4('User.java')).toBe(false);
    });

    it('isExperimental', () => {
      expect(isExperimental('script.groovy')).toBe(true);
      expect(isExperimental('User.java')).toBe(false);
    });
  });
});
