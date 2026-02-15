const path = require('path');
const fs = require('fs');
const os = require('os');

describe('PDCA Automation Extensions', () => {
  let tmpDir;
  let automation;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdca-auto-'));
    jest.resetModules();
    automation = require('../../lib/pdca/automation');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeConfig(level, extraConfig = {}) {
    const config = {
      pdca: {
        automationLevel: level,
        ...extraConfig,
      },
    };
    fs.writeFileSync(path.join(tmpDir, 'demodev.config.json'), JSON.stringify(config));
  }

  describe('getReviewCheckpoints', () => {
    it('기본값: [design]', () => {
      const checkpoints = automation.getReviewCheckpoints(tmpDir);
      expect(checkpoints).toEqual(['design']);
    });

    it('config에서 커스텀 checkpoints 로드', () => {
      const config = {
        pdca: {
          fullAuto: {
            reviewCheckpoints: ['design', 'do'],
          },
        },
      };
      fs.writeFileSync(path.join(tmpDir, 'demodev.config.json'), JSON.stringify(config));
      const checkpoints = automation.getReviewCheckpoints(tmpDir);
      expect(checkpoints).toEqual(['design', 'do']);
    });
  });

  describe('shouldAutoAdvance', () => {
    it('manual → 항상 false', () => {
      writeConfig('manual');
      expect(automation.shouldAutoAdvance(tmpDir, 'plan')).toBe(false);
      expect(automation.shouldAutoAdvance(tmpDir, 'design')).toBe(false);
    });

    it('semi-auto → analyze만 true', () => {
      writeConfig('semi-auto');
      expect(automation.shouldAutoAdvance(tmpDir, 'plan')).toBe(false);
      expect(automation.shouldAutoAdvance(tmpDir, 'analyze')).toBe(true);
    });

    it('full-auto → reviewCheckpoints 제외 true', () => {
      writeConfig('full-auto');
      // 기본 reviewCheckpoints = ['design']
      expect(automation.shouldAutoAdvance(tmpDir, 'plan')).toBe(true);
      expect(automation.shouldAutoAdvance(tmpDir, 'design')).toBe(false);
      expect(automation.shouldAutoAdvance(tmpDir, 'do')).toBe(true);
    });

    it('full-auto + 커스텀 checkpoints', () => {
      const config = {
        pdca: {
          automationLevel: 'full-auto',
          fullAuto: { reviewCheckpoints: ['plan', 'design'] },
        },
      };
      fs.writeFileSync(path.join(tmpDir, 'demodev.config.json'), JSON.stringify(config));
      expect(automation.shouldAutoAdvance(tmpDir, 'plan')).toBe(false);
      expect(automation.shouldAutoAdvance(tmpDir, 'design')).toBe(false);
      expect(automation.shouldAutoAdvance(tmpDir, 'do')).toBe(true);
    });
  });

  describe('generateAutoTrigger', () => {
    it('manual → null', () => {
      writeConfig('manual');
      const result = automation.generateAutoTrigger(tmpDir, 'plan', { feature: 'auth' });
      expect(result).toBeNull();
    });

    it('full-auto → trigger 반환', () => {
      writeConfig('full-auto');
      const result = automation.generateAutoTrigger(tmpDir, 'plan', { feature: 'auth' });
      expect(result).not.toBeNull();
      expect(result.nextPhase).toBe('design');
      expect(result.command).toContain('/pdca design auth');
      expect(result.autoExecute).toBe(true);
    });

    it('full-auto + reviewCheckpoint phase → null', () => {
      writeConfig('full-auto');
      // design은 기본 reviewCheckpoint
      const result = automation.generateAutoTrigger(tmpDir, 'design', { feature: 'auth' });
      expect(result).toBeNull();
    });

    it('semi-auto + analyze + matchRate >= 90 → trigger', () => {
      writeConfig('semi-auto');
      const result = automation.generateAutoTrigger(tmpDir, 'analyze', { feature: 'auth', matchRate: 95 });
      expect(result).not.toBeNull();
      expect(result.nextPhase).toBe('iterate');
      expect(result.autoExecute).toBe(false);
    });

    it('semi-auto + analyze + matchRate < 90 → null', () => {
      writeConfig('semi-auto');
      const result = automation.generateAutoTrigger(tmpDir, 'analyze', { feature: 'auth', matchRate: 80 });
      expect(result).toBeNull();
    });

    it('마지막 phase(report) → null', () => {
      writeConfig('full-auto');
      const result = automation.generateAutoTrigger(tmpDir, 'report', { feature: 'auth' });
      expect(result).toBeNull();
    });
  });

  describe('isFullAutoMode / isManualMode', () => {
    it('full-auto 감지', () => {
      writeConfig('full-auto');
      expect(automation.isFullAutoMode(tmpDir)).toBe(true);
      expect(automation.isManualMode(tmpDir)).toBe(false);
    });

    it('manual 감지', () => {
      writeConfig('manual');
      expect(automation.isManualMode(tmpDir)).toBe(true);
      expect(automation.isFullAutoMode(tmpDir)).toBe(false);
    });

    it('config 없으면 기본값 (manual 또는 플러그인 config fallback)', () => {
      // 플러그인 자체 demodev.config.json이 존재하면 그 값을 사용
      const level = automation.getAutomationLevel(tmpDir);
      expect(['manual', 'semi-auto', 'full-auto']).toContain(level);
    });
  });
});
