#!/usr/bin/env node
/**
 * demokit plugin validator CLI
 * - bkit의 validate-plugin 흐름을 demokit 구조에 맞게 적용
 */
const path = require('path');
const {
  validatePluginStructure: validatePluginStructureCore,
  printValidationReport,
} = require('../lib/core/plugin-validator');

function validatePluginStructure(pluginRoot) {
  return validatePluginStructureCore(pluginRoot);
}

function parseArgs(argv = []) {
  const parsed = {
    root: process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..'),
    verbose: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--verbose') {
      parsed.verbose = true;
      continue;
    }

    if (arg === '--json') {
      parsed.json = true;
      continue;
    }

    if (arg === '--root' && argv[i + 1]) {
      parsed.root = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg.startsWith('--root=')) {
      parsed.root = path.resolve(arg.split('=').slice(1).join('='));
    }
  }

  return parsed;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const result = validatePluginStructure(args.root);

  printValidationReport(result, { verbose: args.verbose });

  if (args.json || process.env.OUTPUT_JSON) {
    console.log('\nJSON Result:');
    console.log(JSON.stringify(result, null, 2));
  }

  return result.valid ? 0 : 1;
}

module.exports = {
  parseArgs,
  validatePluginStructure,
  main,
};

if (require.main === module) {
  process.exit(main());
}
