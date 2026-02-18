const path = require('path');
const fs = require('fs');
const os = require('os');

describe('PDCA Status', () => {
  let tmpDir;
  let pdcaStatus;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdca-test-'));
    // .pdca 디렉토리 생성
    fs.mkdirSync(path.join(tmpDir, '.pdca'), { recursive: true });

    // core 모듈 mock
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
      debug: {
        debug: () => {},
        warn: () => {},
      },
    }));

    pdcaStatus = require('../../lib/pdca/status');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('createStatus', () => {
    it('초기 상태 생성', () => {
      const status = pdcaStatus.createStatus(tmpDir, 'user-api');
      expect(status.feature).toBe('user-api');
      expect(status.currentPhase).toBe('plan');
      expect(status.phaseHistory).toEqual([]);
      expect(status.phases.plan.status).toBe('pending');
    });

    it('파일 저장 확인', () => {
      pdcaStatus.createStatus(tmpDir, 'user-api');
      const filePath = path.join(tmpDir, '.pdca', 'user-api.status.json');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('loadStatus', () => {
    it('저장된 상태 로드', () => {
      pdcaStatus.createStatus(tmpDir, 'test-feature');
      const loaded = pdcaStatus.loadStatus(tmpDir, 'test-feature');
      expect(loaded).not.toBeNull();
      expect(loaded.feature).toBe('test-feature');
    });

    it('없는 feature → null', () => {
      const loaded = pdcaStatus.loadStatus(tmpDir, 'nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('updatePhaseStatus', () => {
    it('phase 상태 업데이트', () => {
      pdcaStatus.createStatus(tmpDir, 'test');
      const updated = pdcaStatus.updatePhaseStatus(tmpDir, 'test', 'plan', {
        status: 'in-progress',
        startedAt: '2024-01-01',
      });
      expect(updated.phases.plan.status).toBe('in-progress');
    });

    it('phase 완료 시 phaseHistory 추가', () => {
      pdcaStatus.createStatus(tmpDir, 'test');
      const updated = pdcaStatus.updatePhaseStatus(tmpDir, 'test', 'plan', {
        status: 'completed',
        completedAt: '2024-01-01',
      });
      expect(updated.phaseHistory).toHaveLength(1);
      expect(updated.phaseHistory[0].phase).toBe('plan');
      expect(updated.phaseHistory[0].completedAt).toBe('2024-01-01');
    });

    it('없는 feature → null', () => {
      const result = pdcaStatus.updatePhaseStatus(tmpDir, 'nonexistent', 'plan', {});
      expect(result).toBeNull();
    });
  });

  describe('listFeatures', () => {
    it('활성 feature 목록 반환', () => {
      pdcaStatus.createStatus(tmpDir, 'feature-a');
      pdcaStatus.createStatus(tmpDir, 'feature-b');
      const features = pdcaStatus.listFeatures(tmpDir);
      expect(features).toHaveLength(2);
      expect(features.map(f => f.feature).sort()).toEqual(['feature-a', 'feature-b']);
    });

    it('.pdca 디렉토리 없으면 빈 배열', () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
      const features = pdcaStatus.listFeatures(emptyDir);
      expect(features).toEqual([]);
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });
});
