const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseHookScriptPath,
  validateHooksRoot,
  parseArgs,
} = require('../../scripts/validate-hooks');

function writeFile(root, relativePath, content) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function createFixture({ includeScript = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-hooks-'));

  writeFile(
    root,
    'hooks/hooks.json',
    JSON.stringify(
      {
        hooks: {
          SessionStart: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: 'node ${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js',
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
                  command: 'node scripts/unified-write-post.js',
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    ),
  );

  if (includeScript) {
    writeFile(root, 'hooks/session-start.js', 'module.exports = {};\n');
    writeFile(root, 'scripts/unified-write-post.js', 'module.exports = {};\n');
  }

  return root;
}

describe('scripts/validate-hooks.js', () => {
  it('parseHookScriptPath supports CLAUDE_PLUGIN_ROOT reference', () => {
    const parsed = parseHookScriptPath('node ${CLAUDE_PLUGIN_ROOT}/scripts/pre-write.js');
    expect(parsed).toBe('scripts/pre-write.js');
  });

  it('parseHookScriptPath supports relative hooks/scripts path', () => {
    expect(parseHookScriptPath('node scripts/pre-write.js')).toBe('scripts/pre-write.js');
    expect(parseHookScriptPath('node hooks/session-start.js')).toBe('hooks/session-start.js');
  });

  it('validateHooksRoot passes for valid hooks.json', () => {
    const root = createFixture();
    try {
      const result = validateHooksRoot(root);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.stats.checked).toBe(2);
      expect(result.stats.valid).toBe(2);
      expect(result.stats.invalid).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('validateHooksRoot fails when referenced scripts are missing', () => {
    const root = createFixture({ includeScript: false });
    try {
      const result = validateHooksRoot(root);
      expect(result.valid).toBe(false);
      expect(result.stats.invalid).toBe(2);
      expect(result.errors.join('\n')).toContain('missing script for SessionStart');
      expect(result.errors.join('\n')).toContain('missing script for PostToolUse');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('parseArgs parses --json and --root', () => {
    const parsed = parseArgs(['--json', '--root', '/tmp/demo']);
    expect(parsed.json).toBe(true);
    expect(parsed.root).toBe('/tmp/demo');
  });

  it('parseArgs parses --root=value', () => {
    const parsed = parseArgs(['--root=/tmp/demo']);
    expect(parsed.root).toBe('/tmp/demo');
    expect(parsed.json).toBe(false);
  });
});
