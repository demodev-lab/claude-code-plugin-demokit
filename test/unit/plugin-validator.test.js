const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseSimpleYaml,
  parseFrontmatter,
  extractScriptRefs,
  validatePluginStructure,
} = require('../../lib/core/plugin-validator');
const { parseArgs } = require('../../scripts/validate-plugin');

function writeFile(root, relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function createBaseFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-validator-'));

  writeFile(root, 'README.md', '# Demo Plugin\n');
  writeFile(root, 'demodev.config.json', '{"name":"demokit"}\n');
  writeFile(root, 'package.json', '{"name":"demo","version":"1.0.0"}\n');

  writeFile(root, '.claude-plugin/plugin.json', JSON.stringify({
    name: 'demokit',
    version: '1.0.0',
    description: 'demo',
  }, null, 2));

  writeFile(root, '.claude-plugin/marketplace.json', JSON.stringify({
    name: 'demodev-plugins',
    metadata: { version: '1.0.0' },
    plugins: [{ name: 'demokit', version: '1.0.0', source: './' }],
  }, null, 2));

  writeFile(root, 'hooks/hooks.json', JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: 'node ${CLAUDE_PLUGIN_ROOT}/scripts/pre-bash.js',
            },
          ],
        },
      ],
    },
  }, null, 2));
  writeFile(root, 'templates/.keep', '');
  writeFile(root, 'scripts/pre-bash.js', 'module.exports = {};\n');
  writeFile(root, 'agents/spring-architect.md', '# Spring Architect\n');

  writeFile(root, 'skills/init/SKILL.md', [
    '---',
    'name: init',
    'description: init skill',
    '---',
    '',
    '# /init',
    '',
    '참조: scripts/pre-bash.js',
  ].join('\n'));

  writeFile(root, 'skills/init/skill.yaml', [
    'name: init',
    'argument-hint: "[path]"',
  ].join('\n'));

  return root;
}

describe('plugin-validator', () => {
  describe('parsers', () => {
    it('parseSimpleYaml supports key/value + list', () => {
      const yaml = [
        'name: pdca',
        'imports:',
        '  - shared/a.md',
        '  - shared/b.md',
      ].join('\n');

      const parsed = parseSimpleYaml(yaml);
      expect(parsed.name).toBe('pdca');
      expect(parsed.imports).toEqual(['shared/a.md', 'shared/b.md']);
    });

    it('parseFrontmatter supports multiline description', () => {
      const md = [
        '---',
        'name: sample',
        'description: |',
        '  line1',
        '  line2',
        '---',
        '# body',
      ].join('\n');

      const parsed = parseFrontmatter(md);
      expect(parsed.name).toBe('sample');
      expect(parsed.description).toBe('line1\nline2');
    });

    it('extractScriptRefs finds CLAUDE_PLUGIN_ROOT and relative refs', () => {
      const md = [
        'hook1: ${CLAUDE_PLUGIN_ROOT}/scripts/pre-bash.js',
        'hook2: scripts/post-write.js',
      ].join('\n');

      const refs = extractScriptRefs(md);
      expect(refs).toContain('scripts/pre-bash.js');
      expect(refs).toContain('scripts/post-write.js');
    });
  });

  describe('validatePluginStructure', () => {
    it('returns valid for well-formed demokit structure', () => {
      const root = createBaseFixture();
      try {
        const result = validatePluginStructure(root);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.stats.skills.total).toBe(1);
        expect(result.stats.agents.total).toBe(1);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it('fails when skill references missing script', () => {
      const root = createBaseFixture();
      try {
        writeFile(root, 'skills/init/SKILL.md', [
          '---',
          'name: init',
          'description: init skill',
          '---',
          '',
          '# /init',
          'hook: scripts/missing-script.js',
        ].join('\n'));

        const result = validatePluginStructure(root);
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((msg) => /Missing skill script reference|스크립트 참조 누락/.test(msg))
        ).toBe(true);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it('fails on marketplace/plugin version mismatch', () => {
      const root = createBaseFixture();
      try {
        writeFile(root, '.claude-plugin/marketplace.json', JSON.stringify({
          name: 'demodev-plugins',
          metadata: { version: '2.0.0' },
          plugins: [{ name: 'demokit', version: '2.0.0', source: './' }],
        }, null, 2));

        const result = validatePluginStructure(root);
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((msg) => /version mismatch|버전 불일치/.test(msg))
        ).toBe(true);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it('fails when skill frontmatter name mismatches folder name', () => {
      const root = createBaseFixture();
      try {
        writeFile(root, 'skills/init/SKILL.md', [
          '---',
          'name: wrong-name',
          'description: init skill',
          '---',
          '# body',
        ].join('\n'));

        const result = validatePluginStructure(root);
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((msg) => /Skill name mismatch|Skill 이름 불일치/.test(msg))
        ).toBe(true);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });

  describe('validate-plugin script args', () => {
    it('parseArgs parses root, verbose, json flags', () => {
      const args = parseArgs(['--verbose', '--json', '--root', '/tmp/demo']);
      expect(args.verbose).toBe(true);
      expect(args.json).toBe(true);
      expect(args.root).toBe('/tmp/demo');
    });

    it('parseArgs parses --root=value syntax', () => {
      const args = parseArgs(['--root=/tmp/demo']);
      expect(args.root).toBe('/tmp/demo');
      expect(args.verbose).toBe(false);
      expect(args.json).toBe(false);
    });
  });
});
