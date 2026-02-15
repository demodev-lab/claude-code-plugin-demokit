const path = require('path');

describe('Unified Write Post Handler', () => {
  let unifiedWritePost;

  beforeEach(() => {
    jest.resetModules();
    unifiedWritePost = require('../../scripts/unified-write-post');
  });

  describe('AGENT_HANDLERS', () => {
    it('qa-monitor, gap-detector handler 등록', () => {
      expect(unifiedWritePost.AGENT_HANDLERS['qa-monitor']).toBeDefined();
      expect(unifiedWritePost.AGENT_HANDLERS['gap-detector']).toBeDefined();
    });
  });

  describe('handleQaMonitorPost', () => {
    it('QA 보고서 감지', () => {
      const hints = unifiedWritePost.handleQaMonitorPost({}, '/project/qa-report.md');
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0]).toContain('QA Monitor');
    });

    it('QA 보고서가 아닌 파일 → 빈 배열', () => {
      const hints = unifiedWritePost.handleQaMonitorPost({}, '/project/src/Main.java');
      expect(hints).toEqual([]);
    });

    it('빈 filePath → 빈 배열', () => {
      const hints = unifiedWritePost.handleQaMonitorPost({}, '');
      expect(hints).toEqual([]);
    });
  });

  describe('handleGapDetectorPost', () => {
    it('analysis 문서 감지', () => {
      const hints = unifiedWritePost.handleGapDetectorPost({}, '/project/.pdca/auth/analysis.md');
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0]).toContain('Gap Detector');
    });

    it('gap 문서 감지', () => {
      const hints = unifiedWritePost.handleGapDetectorPost({}, '/project/gap-report.md');
      expect(hints.length).toBeGreaterThan(0);
    });

    it('일반 파일 → 빈 배열', () => {
      const hints = unifiedWritePost.handleGapDetectorPost({}, '/project/src/User.java');
      expect(hints).toEqual([]);
    });
  });
});
