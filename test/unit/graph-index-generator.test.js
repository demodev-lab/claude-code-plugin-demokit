const {
  parseSectionSingleLineValue,
  parseSectionParagraph,
  replaceAgentsTable,
  parseArgs,
} = require('../../scripts/generate-graph-index');

describe('generate-graph-index script', () => {
  it('parses model and role sections from agent markdown', () => {
    const md = [
      '# Sample Agent',
      '',
      '## 역할',
      '역할 설명 문장 1.',
      '역할 설명 문장 2.',
      '',
      '## 모델',
      'sonnet',
      '',
      '## 허용 도구',
      'Read',
    ].join('\n');

    expect(parseSectionSingleLineValue(md, '모델')).toBe('sonnet');
    expect(parseSectionParagraph(md, '역할')).toBe('역할 설명 문장 1. 역할 설명 문장 2.');
  });

  it('replaces agents table while preserving other sections', () => {
    const src = [
      '# Graph Index',
      '',
      '## Agents (에이전트)',
      '',
      '| 이름 | 모델 | 역할 |',
      '|------|------|------|',
      '| a | opus | old |',
      '',
      '## Skills (스킬)',
      '| 이름 | 설명 |',
    ].join('\n');

    const rows = [
      '| spring-architect | opus | 아키텍처 설계 |',
      '| domain-expert | sonnet | 도메인 설계 |',
    ];

    const updated = replaceAgentsTable(src, rows);
    expect(updated).toContain('| spring-architect | opus | 아키텍처 설계 |');
    expect(updated).toContain('| domain-expert | sonnet | 도메인 설계 |');
    expect(updated).toContain('## Skills (스킬)');
    expect(updated).not.toContain('| a | opus | old |');
  });

  it('parses --check flag', () => {
    expect(parseArgs(['--check']).check).toBe(true);
    expect(parseArgs([]).check).toBe(false);
  });
});
