const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseFrontmatter,
  extractScriptReferences,
  validatePlugin,
} = require('../../lib/core/plugin-validator');

function mkdirp(target) {
  fs.mkdirSync(target, { recursive: true });
}

function writeJson(filePath, value) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function writeText(filePath, value) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, value, 'utf8');
}

function createPluginFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-validate-'));

  writeText(path.join(root, 'README.md'), '# fixture\n');
  writeJson(path.join(root, 'package.json'), {
    name: 'fixture-plugin',
    version: '1.0.0',
    private: true,
  });
  writeJson(path.join(root, 'demodev.config.json'), {
    pluginName: 'fixture-plugin',
  });

  writeJson(path.join(root, '.claude-plugin', 'plugin.json'), {
    name: 'fixture-plugin',
    version: '1.0.0',
    description: 'fixture',
  });

  writeJson(path.join(root, '.claude-plugin', 'marketplace.json'), {
    name: 'fixture-marketplace',
    metadata: { version: '1.0.0' },
    plugins: [{ name: 'fixture-plugin', version: '1.0.0' }],
  });

  writeText(
    path.join(root, 'skills', 'demo', 'SKILL.md'),
    `---\nname: demo\ndescription: demo skill\n---\n\n# Demo`
  );

  writeText(path.join(root, 'skills', 'demo', 'skill.yaml'), 'name: demo\n');

  writeText(path.join(root, 'agents', 'demo.md'), '# Demo agent\n\nallowed tools');

  writeText(path.join(root, 'scripts', 'pre-write.js'), 'module.exports = {}\n');
  writeText(path.join(root, 'scripts', 'post-write.js'), 'module.exports = {}\n');

  writeJson(path.join(root, 'hooks', 'hooks.json'), {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: 'node ${CLAUDE_PLUGIN_ROOT}/scripts/pre-write.js',
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: 'node ${CLAUDE_PLUGIN_ROOT}/scripts/post-write.js',
            },
          ],
        },
      ],
    },
  });

  mkdirp(path.join(root, 'lib'));
  mkdirp(path.join(root, 'templates'));

  return root;
}

describe('plugin-validator', () => {
  const roots = [];

  afterAll(() => {
    for (const root of roots) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('frontmatter 파싱', () => {
    const frontmatter = parseFrontmatter(`---\nname: test\ndescription: hello\n---\ncontent`);
    expect(frontmatter).toEqual({
      name: 'test',
      description: 'hello',
    });
  });

  it('script reference 추출', () => {
    const refs = extractScriptReferences(
      'node ${CLAUDE_PLUGIN_ROOT}/scripts/pre-write.js && node ${CLAUDE_PLUGIN_ROOT}/scripts/post-write.js'
    );
    expect(refs).toEqual(['scripts/pre-write.js', 'scripts/post-write.js']);
  });

  it('유효한 플러그인 구조는 validation 통과', () => {
    const root = createPluginFixture();
    roots.push(root);

    const result = validatePlugin(root);

    expect(result.valid).toBe(true);
    expect(result.stats.errors).toEqual([]);
    expect(result.stats.skills.valid).toBe(1);
    expect(result.stats.agents.valid).toBe(1);
    expect(result.stats.scriptRefs.valid).toBe(2);
  });

  it('hook script 누락 시 validation 실패', () => {
    const root = createPluginFixture();
    roots.push(root);
    fs.rmSync(path.join(root, 'scripts', 'post-write.js'));

    const result = validatePlugin(root);

    expect(result.valid).toBe(false);
    expect(result.stats.errors.some(error => error.includes('Missing hook script: scripts/post-write.js'))).toBe(true);
    expect(result.stats.scriptRefs.invalid).toBe(1);
  });

  it('skill frontmatter 누락 시 validation 실패', () => {
    const root = createPluginFixture();
    roots.push(root);
    writeText(path.join(root, 'skills', 'demo', 'SKILL.md'), '# broken');

    const result = validatePlugin(root);

    expect(result.valid).toBe(false);
    expect(result.stats.skills.invalid).toBe(1);
    expect(result.stats.errors.some(error => error.includes('Skill missing frontmatter'))).toBe(true);
  });
});
