const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  parseHookScriptPath,
  isSafeScriptPath,
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
                  command: 'node $' + '{CLAUDE_PLUGIN_ROOT}/hooks/session-start.js',
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
    const parsed = parseHookScriptPath('node $' + '{CLAUDE_PLUGIN_ROOT}/scripts/pre-write.js');
    expect(parsed).toBe('scripts/pre-write.js');
  });

  it('parseHookScriptPath supports relative hooks/scripts path', () => {
    expect(parseHookScriptPath('node scripts/pre-write.js')).toBe('scripts/pre-write.js');
    expect(parseHookScriptPath('node hooks/session-start.js')).toBe('hooks/session-start.js');
  });

  it('isSafeScriptPath blocks traversal and non-target paths', () => {
    expect(isSafeScriptPath('scripts/pre-write.js')).toBe(true);
    expect(isSafeScriptPath('hooks/session-start.js')).toBe(true);
    expect(isSafeScriptPath('scripts/../../outside.js')).toBe(false);
    expect(isSafeScriptPath('../scripts/pre-write.js')).toBe(false);
    expect(isSafeScriptPath('etc/passwd')).toBe(false);
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

  it('validateHooksRoot fails for path traversal script reference', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-hooks-traversal-'));
    const outsideScript = path.resolve(root, '..', 'outside-hook-script.js');

    try {
      fs.writeFileSync(outsideScript, 'module.exports = {}\n', 'utf8');
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
                      timeout: 5000,
                      command: 'node scripts/../../outside-hook-script.js',
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

      const result = validateHooksRoot(root);
      expect(result.valid).toBe(false);
      expect(result.stats.invalid).toBe(1);
      expect(result.errors.join('\n')).toContain('unsafe script path');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outsideScript, { force: true });
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
