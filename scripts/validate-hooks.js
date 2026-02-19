#!/usr/bin/env node
/**
 * validate-hooks.js
 *
 * bkit의 validate-plugin 아이디어 중 hooks command 경로 무결성 체크를 분리한 도구.
 * - hooks/hooks.json 파싱
 * - command 문자열 내 ${CLAUDE_PLUGIN_ROOT}/... 또는 상대 경로 스크립트 탐지
 * - 존재 여부 검증
 */

const fs = require('fs');
const path = require('path');

function parseHookScriptPath(command) {
  if (!command || typeof command !== 'string') return null;

  const envMatch = command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"']+)/);
  if (envMatch) {
    return envMatch[1];
  }

  const relativeMatch = command.match(/(?:^|\s)((?:hooks|scripts)\/[A-Za-z0-9._/-]+\.js)\b/);
  if (relativeMatch) {
    return relativeMatch[1];
  }

  return null;
}

function readHooksJson(hooksJsonPath) {
  const raw = fs.readFileSync(hooksJsonPath, 'utf8');
  return JSON.parse(raw);
}

function createResult(rootPath, hooksJsonPath) {
  return {
    rootPath,
    hooksJsonPath,
    valid: true,
    stats: {
      events: 0,
      commands: 0,
      checked: 0,
      valid: 0,
      invalid: 0,
      ignored: 0,
    },
    errors: [],
    warnings: [],
  };
}

function validateHooksRoot(rootPath = path.resolve(__dirname, '..')) {
  const absoluteRoot = path.resolve(rootPath);
  const hooksJsonPath = path.join(absoluteRoot, 'hooks', 'hooks.json');
  const result = createResult(absoluteRoot, hooksJsonPath);

  if (!fs.existsSync(hooksJsonPath)) {
    result.valid = false;
    result.errors.push(`hooks.json not found: ${hooksJsonPath}`);
    return result;
  }

  let hooksJson;
  try {
    hooksJson = readHooksJson(hooksJsonPath);
  } catch (error) {
    result.valid = false;
    result.errors.push(`hooks.json parse error: ${error.message}`);
    return result;
  }

  if (!hooksJson.hooks || typeof hooksJson.hooks !== 'object') {
    result.valid = false;
    result.errors.push('hooks.json missing "hooks" object');
    return result;
  }

  for (const [eventName, entries] of Object.entries(hooksJson.hooks)) {
    result.stats.events += 1;

    if (!Array.isArray(entries)) {
      result.warnings.push(`event '${eventName}' is not an array`);
      continue;
    }

    for (const entry of entries) {
      const hooks = entry?.hooks;
      if (!Array.isArray(hooks)) continue;

      for (const hook of hooks) {
        result.stats.commands += 1;
        const command = hook?.command;
        const scriptPath = parseHookScriptPath(command);

        if (!scriptPath) {
          result.stats.ignored += 1;
          continue;
        }

        result.stats.checked += 1;
        const fullPath = path.join(absoluteRoot, scriptPath);
        if (fs.existsSync(fullPath)) {
          result.stats.valid += 1;
        } else {
          result.stats.invalid += 1;
          result.errors.push(`missing script for ${eventName}: ${scriptPath}`);
        }
      }
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}

function formatSummary(result) {
  const lines = [
    '============================================================',
    'demokit Hooks Validation',
    '============================================================',
    `Root: ${result.rootPath}`,
    `hooks.json: ${result.hooksJsonPath}`,
    '',
    `Events:   ${result.stats.events}`,
    `Commands: ${result.stats.commands}`,
    `Checked:  ${result.stats.checked}`,
    `Valid:    ${result.stats.valid}`,
    `Invalid:  ${result.stats.invalid}`,
    `Ignored:  ${result.stats.ignored}`,
    '',
    `Warnings: ${result.warnings.length}`,
    `Errors:   ${result.errors.length}`,
  ];

  if (result.warnings.length) {
    lines.push('', '[Warnings]');
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  if (result.errors.length) {
    lines.push('', '[Errors]');
    result.errors.forEach((error) => lines.push(`- ${error}`));
  }

  lines.push('', result.valid ? '✅ Hooks validation passed' : '❌ Hooks validation failed');
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = {
    root: null,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') {
      args.json = true;
      continue;
    }

    if (token === '--root' && argv[i + 1]) {
      args.root = argv[i + 1];
      i += 1;
      continue;
    }

    if (token.startsWith('--root=')) {
      args.root = token.slice('--root='.length);
    }
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootPath = args.root ? path.resolve(args.root) : path.resolve(__dirname, '..');
  const result = validateHooksRoot(rootPath);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatSummary(result));
  }

  process.exit(result.valid ? 0 : 1);
}

module.exports = {
  parseHookScriptPath,
  validateHooksRoot,
  formatSummary,
  parseArgs,
  main,
};

if (require.main === module) {
  main();
}
