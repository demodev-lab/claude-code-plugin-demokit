const path = require('path');
const fs = require('fs');
const os = require('os');

describe('PDCA Multi-Feature', () => {
  let tmpDir;
  let pdcaStatus;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdca-multi-'));
    fs.mkdirSync(path.join(tmpDir, '.pdca'), { recursive: true });

    jest.resetModules();

    jest.doMock('../../lib/core', () => ({
      io: {
        readJson: (filePath) => {
          try {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          } catch { return null; }
        },
        writeJson: (filePath, data) => {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        },
        writeFile: (filePath, content) => {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, content, 'utf-8');
        },
        ensureDir: (dir) => fs.mkdirSync(dir, { recursive: true }),
        fileExists: (p) => fs.existsSync(p),
        listFiles: (dir, regex) => {
          if (!fs.existsSync(dir)) return [];
          return fs.readdirSync(dir)
            .filter(f => regex.test(f))
            .map(f => path.join(dir, f));
        },
        withFileLock: (_filePath, fn) => fn(),
      },
      debug: { debug: () => {}, warn: () => {} },
    }));

    pdcaStatus = require('../../lib/pdca/status');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('addActiveFeature', () => {
    it('feature 추가', () => {
      pdcaStatus.addActiveFeature(tmpDir, 'auth');
      const features = pdcaStatus.getActiveFeatures(tmpDir);
      expect(features).toContain('auth');
    });

    it('중복 추가 방지', () => {
      pdcaStatus.addActiveFeature(tmpDir, 'auth');
      pdcaStatus.addActiveFeature(tmpDir, 'auth');
      const features = pdcaStatus.getActiveFeatures(tmpDir);
      expect(features.filter(f => f === 'auth')).toHaveLength(1);
    });

    it('setAsPrimary로 주요 기능 설정', () => {
      pdcaStatus.addActiveFeature(tmpDir, 'auth', true);
      expect(pdcaStatus.getPrimaryFeature(tmpDir)).toBe('auth');
    });

    it('첫 번째 feature는 자동으로 primary', () => {
      pdcaStatus.addActiveFeature(tmpDir, 'auth');
      expect(pdcaStatus.getPrimaryFeature(tmpDir)).toBe('auth');
    });
  });

  describe('removeActiveFeature', () => {
    it('feature 제거', () => {
      pdcaStatus.addActiveFeature(tmpDir, 'auth');
      pdcaStatus.addActiveFeature(tmpDir, 'user');
      pdcaStatus.removeActiveFeature(tmpDir, 'auth');
      const features = pdcaStatus.getActiveFeatures(tmpDir);
      expect(features).not.toContain('auth');
      expect(features).toContain('user');
    });

    it('primary feature 제거 시 다음 feature로 전환', () => {
      pdcaStatus.addActiveFeature(tmpDir, 'auth', true);
      pdcaStatus.addActiveFeature(tmpDir, 'user');
      pdcaStatus.removeActiveFeature(tmpDir, 'auth');
      expect(pdcaStatus.getPrimaryFeature(tmpDir)).toBe('user');
    });

    it('마지막 feature 제거 시 primary → null', () => {
      pdcaStatus.addActiveFeature(tmpDir, 'auth');
      pdcaStatus.removeActiveFeature(tmpDir, 'auth');
      expect(pdcaStatus.getPrimaryFeature(tmpDir)).toBeNull();
    });
  });

  describe('switchFeatureContext', () => {
    it('primary 변경', () => {
      pdcaStatus.addActiveFeature(tmpDir, 'auth');
      pdcaStatus.addActiveFeature(tmpDir, 'user');
      pdcaStatus.switchFeatureContext(tmpDir, 'user');
      expect(pdcaStatus.getPrimaryFeature(tmpDir)).toBe('user');
    });

    it('없는 feature로 전환 시 자동 추가', () => {
      pdcaStatus.switchFeatureContext(tmpDir, 'new-feature');
      expect(pdcaStatus.getActiveFeatures(tmpDir)).toContain('new-feature');
      expect(pdcaStatus.getPrimaryFeature(tmpDir)).toBe('new-feature');
    });

    it('true 반환', () => {
      const result = pdcaStatus.switchFeatureContext(tmpDir, 'auth');
      expect(result).toBe(true);
    });
  });

  describe('listFeaturesExtended', () => {
    it('isPrimary, isActive 포함', () => {
      pdcaStatus.createStatus(tmpDir, 'auth');
      pdcaStatus.createStatus(tmpDir, 'user');
      pdcaStatus.addActiveFeature(tmpDir, 'auth', true);
      pdcaStatus.addActiveFeature(tmpDir, 'user');

      const extended = pdcaStatus.listFeaturesExtended(tmpDir);
      expect(extended).toHaveLength(2);

      const authItem = extended.find(f => f.feature === 'auth');
      expect(authItem.isPrimary).toBe(true);
      expect(authItem.isActive).toBe(true);

      const userItem = extended.find(f => f.feature === 'user');
      expect(userItem.isPrimary).toBe(false);
      expect(userItem.isActive).toBe(true);
    });
  });

  describe('loadMultiFeatureState', () => {
    it('파일 없으면 기본값', () => {
      const state = pdcaStatus.loadMultiFeatureState(tmpDir);
      expect(state.activeFeatures).toEqual([]);
      expect(state.primaryFeature).toBeNull();
    });

    it('손상된 데이터에서도 안전하게 동작', () => {
      // activeFeatures가 없는 데이터 직접 저장
      const filePath = path.join(tmpDir, '.pdca', 'multi-feature.json');
      fs.writeFileSync(filePath, JSON.stringify({ updatedAt: '2024-01-01' }), 'utf-8');

      const state = pdcaStatus.loadMultiFeatureState(tmpDir);
      expect(state.activeFeatures).toEqual([]);
      expect(state.primaryFeature).toBeNull();

      // addActiveFeature가 TypeError 없이 동작하는지 확인
      pdcaStatus.addActiveFeature(tmpDir, 'test-feature');
      expect(pdcaStatus.getActiveFeatures(tmpDir)).toContain('test-feature');
    });
  });
});
