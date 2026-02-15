const path = require('path');
const fs = require('fs');
const os = require('os');

describe('PDCA Output Style', () => {
  let outputStyle;

  beforeEach(() => {
    jest.resetModules();
    outputStyle = require('../../lib/pdca/output-style');
  });

  describe('parseFrontmatter', () => {
    it('frontmatter 파싱', () => {
      const content = `---
name: test-style
description: Test description
triggers: test, 테스트
---

# Body Content`;

      const { metadata, body } = outputStyle.parseFrontmatter(content);
      expect(metadata.name).toBe('test-style');
      expect(metadata.description).toBe('Test description');
      expect(metadata.triggers).toBe('test, 테스트');
      expect(body).toContain('# Body Content');
    });

    it('frontmatter 없는 경우', () => {
      const content = '# Just a body';
      const { metadata, body } = outputStyle.parseFrontmatter(content);
      expect(Object.keys(metadata)).toHaveLength(0);
      expect(body).toBe('# Just a body');
    });

    it('null/빈 문자열', () => {
      expect(outputStyle.parseFrontmatter(null).metadata).toEqual({});
      expect(outputStyle.parseFrontmatter('').body).toBe('');
    });
  });

  describe('loadStyle', () => {
    it('monolith 스타일 로드', () => {
      const style = outputStyle.loadStyle('demodev-monolith');
      expect(style).not.toBeNull();
      expect(style.name).toBe('demodev-monolith');
      expect(style.description).toContain('Monolith');
      expect(style.body).toContain('Spring Boot');
    });

    it('msa 스타일 로드', () => {
      const style = outputStyle.loadStyle('demodev-msa');
      expect(style).not.toBeNull();
      expect(style.name).toBe('demodev-msa');
      expect(style.description).toContain('MSA');
    });

    it('없는 스타일 → null', () => {
      expect(outputStyle.loadStyle('nonexistent-xyz')).toBeNull();
    });

    it('null 입력 → null', () => {
      expect(outputStyle.loadStyle(null)).toBeNull();
    });
  });

  describe('getStyleForLevel', () => {
    it('Monolith level → monolith style', () => {
      const style = outputStyle.getStyleForLevel('Monolith');
      expect(style).not.toBeNull();
      expect(style.name).toBe('demodev-monolith');
    });

    it('MSA level → msa style', () => {
      const style = outputStyle.getStyleForLevel('MSA');
      expect(style).not.toBeNull();
      expect(style.name).toBe('demodev-msa');
    });
  });

  describe('listStyles', () => {
    it('스타일 목록 반환', () => {
      const styles = outputStyle.listStyles();
      expect(styles.length).toBeGreaterThanOrEqual(2);
      const names = styles.map(s => s.name);
      expect(names).toContain('demodev-monolith');
      expect(names).toContain('demodev-msa');
    });

    it('각 항목에 name, description 포함', () => {
      const styles = outputStyle.listStyles();
      for (const style of styles) {
        expect(style.name).toBeDefined();
        expect(typeof style.description).toBe('string');
      }
    });
  });
});
