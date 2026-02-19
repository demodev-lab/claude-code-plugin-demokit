/**
 * demokit plugin validator
 * bkit의 validate-plugin 아이디어를 demokit 구조에 맞게 포팅
 */
const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  'README.md',
  'package.json',
  'demodev.config.json',
];

const REQUIRED_DIRS = [
  'skills',
  'agents',
  'hooks',
  'scripts',
  'templates',
];

function stripQuotes(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * 단순 YAML 파서 (key:value + list)
 */
function parseSimpleYaml(content) {
  const result = {};
  if (!content) return result;

  const lines = content.split(/\r?\n/);
  let currentListKey = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '    ');
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    if (currentListKey && trimmed.startsWith('- ')) {
      result[currentListKey].push(stripQuotes(trimmed.slice(2)));
      continue;
    }

    currentListKey = null;

    const kv = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;

    const [, key, rawValue] = kv;
    if (!rawValue) {
      currentListKey = key;
      result[key] = [];
      continue;
    }

    result[key] = stripQuotes(rawValue);
  }

  return result;
}

/**
 * markdown frontmatter 파서
 */
function parseFrontmatter(content) {
  const match = content && content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;

  const lines = match[1].split(/\r?\n/);
  const result = {};

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const kv = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;

    const key = kv[1];
    let value = kv[2] || '';

    if (value === '|' || value === '>') {
      const block = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const blockLine = lines[j];
        if (/^\s{2,}/.test(blockLine)) {
          block.push(blockLine.replace(/^\s{2}/, ''));
          i = j;
          continue;
        }
        break;
      }
      result[key] = block.join('\n').trim();
      continue;
    }

    value = value.trim();

    if (!value) {
      const list = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const item = lines[j].trim();
        if (!item) {
          i = j;
          continue;
        }
        if (item.startsWith('- ')) {
          list.push(stripQuotes(item.slice(2)));
          i = j;
          continue;
        }
        break;
      }
      result[key] = list;
      continue;
    }

    result[key] = stripQuotes(value);
  }

  return Object.keys(result).length > 0 ? result : {};
}

function createStats() {
  return {
    requiredFiles: { total: 0, valid: 0, invalid: 0 },
    requiredDirs: { total: 0, valid: 0, invalid: 0 },
    skills: { total: 0, valid: 0, invalid: 0, missingYaml: 0 },
    agents: { total: 0, valid: 0, invalid: 0 },
    hooks: { total: 0, valid: 0, invalid: 0 },
    scriptRefs: { total: 0, valid: 0, invalid: 0 },
    errors: [],
    warnings: [],
  };
}

function addError(stats, message) {
  stats.errors.push(message);
}

function addWarning(stats, message) {
  stats.warnings.push(message);
}

function walkFiles(dir, predicate) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && predicate(fullPath, entry.name)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function getSkillFiles(pluginRoot) {
  const skillsDir = path.join(pluginRoot, 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  const files = [];
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (fs.existsSync(skillPath)) files.push(skillPath);
  }
  return files;
}

function getAgentFiles(pluginRoot) {
  const agentsDir = path.join(pluginRoot, 'agents');
  return walkFiles(agentsDir, fullPath => fullPath.endsWith('.md'));
}

function toRelative(pluginRoot, filePath) {
  return path.relative(pluginRoot, filePath).replace(/\\/g, '/');
}

/**
 * scripts 참조 추출
 * - ${CLAUDE_PLUGIN_ROOT}/scripts/*.js
 * - scripts/*.js
 */
function extractScriptReferences(content) {
  const refs = [];

  const envPattern = /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/([^\s"')`]+)/g;
  for (const match of content.matchAll(envPattern)) {
    refs.push(`scripts/${match[1]}`);
  }

  const relativePattern = /(?:^|[\s("'`])scripts\/([^\s"')`]+)/g;
  for (const match of content.matchAll(relativePattern)) {
    refs.push(`scripts/${match[1]}`);
  }

  return refs;
}

const extractScriptRefs = extractScriptReferences;

function resolveScriptCandidates(pluginRoot, scriptRef) {
  const cleaned = scriptRef.replace(/[),.;]+$/, '').replace(/^\.\//, '');
  const normalized = cleaned.startsWith('scripts/') ? cleaned : `scripts/${cleaned}`;

  const candidates = [
    path.join(pluginRoot, normalized),
    path.join(pluginRoot, cleaned),
  ];

  if (!path.extname(normalized)) {
    candidates.push(path.join(pluginRoot, `${normalized}.js`));
  }

  if (normalized.endsWith('.sh')) {
    candidates.push(path.join(pluginRoot, normalized.replace(/\.sh$/, '.js')));
  }

  return [...new Set(candidates)];
}

function checkReferencedPath(pluginRoot, referencedPath) {
  const candidates = resolveScriptCandidates(pluginRoot, referencedPath);
  return candidates.some(candidate => fs.existsSync(candidate));
}

function validateRequiredPaths(pluginRoot, stats) {
  for (const requiredFile of REQUIRED_FILES) {
    stats.requiredFiles.total += 1;
    const fullPath = path.join(pluginRoot, requiredFile);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      stats.requiredFiles.valid += 1;
    } else {
      stats.requiredFiles.invalid += 1;
      addError(stats, `Missing required file: ${requiredFile}`);
    }
  }

  for (const requiredDir of REQUIRED_DIRS) {
    stats.requiredDirs.total += 1;
    const fullPath = path.join(pluginRoot, requiredDir);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      stats.requiredDirs.valid += 1;
    } else {
      stats.requiredDirs.invalid += 1;
      addError(stats, `Missing required directory: ${requiredDir}/`);
    }
  }
}

function readJson(filePath, stats, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    addError(stats, `${label} parse error (${filePath}): ${err.message}`);
    return null;
  }
}

function validatePluginMetadata(pluginRoot, stats) {
  const packagePath = path.join(pluginRoot, 'package.json');
  const pluginPath = path.join(pluginRoot, '.claude-plugin', 'plugin.json');
  const marketplacePath = path.join(pluginRoot, '.claude-plugin', 'marketplace.json');

  const pkg = readJson(packagePath, stats, 'package.json');
  const plugin = readJson(pluginPath, stats, '.claude-plugin/plugin.json');
  const marketplace = readJson(marketplacePath, stats, '.claude-plugin/marketplace.json');

  if (!pkg || !plugin || !marketplace) return;

  if (!plugin.name) addError(stats, 'plugin.json missing "name" field');
  if (!plugin.version) addError(stats, 'plugin.json missing "version" field');
  if (!pkg.version) addError(stats, 'package.json missing "version" field');

  if (pkg.version && plugin.version && pkg.version !== plugin.version) {
    addError(stats, `version mismatch: package.json(${pkg.version}) != plugin.json(${plugin.version})`);
  }

  const marketplaceVersion = marketplace.metadata && marketplace.metadata.version;
  if (!marketplaceVersion) {
    addError(stats, 'marketplace.json missing metadata.version');
  } else if (plugin.version && marketplaceVersion !== plugin.version) {
    addError(stats, `version mismatch: marketplace metadata(${marketplaceVersion}) != plugin.json(${plugin.version})`);
  }

  if (!Array.isArray(marketplace.plugins)) {
    addError(stats, 'marketplace.json missing plugins array');
    return;
  }

  const pluginEntry = marketplace.plugins.find(item => item && item.name === plugin.name);
  if (!pluginEntry) {
    addError(stats, `marketplace.json missing plugin entry for "${plugin.name}"`);
    return;
  }

  if (!pluginEntry.version) {
    addError(stats, `marketplace plugin entry for "${plugin.name}" missing version`);
  } else if (plugin.version && pluginEntry.version !== plugin.version) {
    addError(stats, `version mismatch: marketplace plugin(${pluginEntry.version}) != plugin.json(${plugin.version})`);
  }
}

function validateScriptRefs(pluginRoot, content, sourceRelPath, stats, label) {
  const refs = extractScriptReferences(content);
  for (const ref of refs) {
    stats.scriptRefs.total += 1;
    if (checkReferencedPath(pluginRoot, ref)) {
      stats.scriptRefs.valid += 1;
    } else {
      stats.scriptRefs.invalid += 1;
      addError(stats, `Missing ${label} script reference: ${ref} (in ${sourceRelPath})`);
    }
  }
}

function validateSkills(pluginRoot, stats) {
  const skillFiles = getSkillFiles(pluginRoot);

  for (const skillPath of skillFiles) {
    stats.skills.total += 1;
    const relPath = toRelative(pluginRoot, skillPath);
    let valid = true;

    try {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      if (!frontmatter) {
        addError(stats, `Skill missing frontmatter: ${relPath}`);
        valid = false;
      } else {
        const skillName = path.basename(path.dirname(skillPath));
        if (!frontmatter.name) {
          addError(stats, `Skill missing frontmatter.name: ${relPath}`);
          valid = false;
        } else if (frontmatter.name !== skillName) {
          addError(stats, `Skill name mismatch: folder(${skillName}) != frontmatter(${frontmatter.name})`);
          valid = false;
        }

        if (!frontmatter.description) {
          addWarning(stats, `Skill missing frontmatter.description: ${relPath}`);
        }
      }

      const skillYamlPath = path.join(path.dirname(skillPath), 'skill.yaml');
      if (!fs.existsSync(skillYamlPath)) {
        stats.skills.missingYaml += 1;
        addWarning(stats, `skill.yaml missing for skill: ${relPath}`);
      } else {
        const yaml = parseSimpleYaml(fs.readFileSync(skillYamlPath, 'utf-8'));
        const skillName = path.basename(path.dirname(skillPath));
        if (yaml.name && yaml.name !== skillName) {
          addError(stats, `Skill yaml name mismatch: folder(${skillName}) != yaml(${yaml.name})`);
          valid = false;
        }
      }

      validateScriptRefs(pluginRoot, content, relPath, stats, 'skill');
    } catch (err) {
      addError(stats, `Failed to read skill ${relPath}: ${err.message}`);
      valid = false;
    }

    if (valid) {
      stats.skills.valid += 1;
    } else {
      stats.skills.invalid += 1;
    }
  }
}

function validateAgents(pluginRoot, stats) {
  const agentFiles = getAgentFiles(pluginRoot);

  for (const agentPath of agentFiles) {
    stats.agents.total += 1;
    const relPath = toRelative(pluginRoot, agentPath);
    let valid = true;

    try {
      const content = fs.readFileSync(agentPath, 'utf-8');
      if (!/^#\s+.+/m.test(content)) {
        addError(stats, `Agent missing markdown title heading: ${relPath}`);
        valid = false;
      }

      const frontmatter = parseFrontmatter(content);
      if (frontmatter && !frontmatter.name) {
        addWarning(stats, `Agent frontmatter missing name: ${relPath}`);
      }

      validateScriptRefs(pluginRoot, content, relPath, stats, 'agent');
    } catch (err) {
      addError(stats, `Failed to read agent ${relPath}: ${err.message}`);
      valid = false;
    }

    if (valid) {
      stats.agents.valid += 1;
    } else {
      stats.agents.invalid += 1;
    }
  }
}

function validateHooksConfig(pluginRoot, stats) {
  const hooksPath = path.join(pluginRoot, 'hooks', 'hooks.json');
  if (!fs.existsSync(hooksPath)) return;

  let hooksConfig;
  try {
    hooksConfig = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
  } catch (err) {
    addError(stats, `hooks/hooks.json parse error: ${err.message}`);
    return;
  }

  const hooks = hooksConfig.hooks;
  if (!hooks || typeof hooks !== 'object') {
    addError(stats, 'hooks/hooks.json missing hooks object');
    return;
  }

  for (const [eventName, entries] of Object.entries(hooks)) {
    if (!Array.isArray(entries)) {
      addWarning(stats, `Hook event ${eventName} is not an array`);
      continue;
    }

    entries.forEach((entry, entryIndex) => {
      if (!entry || !Array.isArray(entry.hooks)) {
        addWarning(stats, `Hook event ${eventName}[${entryIndex}] missing hooks array`);
        return;
      }

      entry.hooks.forEach((hook, hookIndex) => {
        if (!hook || typeof hook.command !== 'string') return;

        const refs = extractScriptReferences(hook.command);
        if (refs.length === 0 && hook.command.includes('${CLAUDE_PLUGIN_ROOT}')) {
          addWarning(stats, `Unable to parse hook command path: ${eventName}[${entryIndex}].hooks[${hookIndex}]`);
        }

        refs.forEach(ref => {
          stats.hooks.total += 1;
          stats.scriptRefs.total += 1;

          if (checkReferencedPath(pluginRoot, ref)) {
            stats.hooks.valid += 1;
            stats.scriptRefs.valid += 1;
          } else {
            stats.hooks.invalid += 1;
            stats.scriptRefs.invalid += 1;
            addError(
              stats,
              `Missing hook script: ${ref} (Hook command script not found, from hooks/${eventName})`
            );
          }
        });
      });
    });
  }
}

function validatePlugin(pluginRoot = path.resolve(__dirname, '..', '..')) {
  const stats = createStats();

  validateRequiredPaths(pluginRoot, stats);
  validatePluginMetadata(pluginRoot, stats);
  validateSkills(pluginRoot, stats);
  validateAgents(pluginRoot, stats);
  validateHooksConfig(pluginRoot, stats);

  return {
    valid: stats.errors.length === 0,
    pluginRoot,
    stats,
  };
}

/**
 * Backward-compatible result shape for tests and scripts
 */
function validatePluginStructure(pluginRoot = path.resolve(__dirname, '..', '..')) {
  const report = validatePlugin(pluginRoot);
  return {
    valid: report.valid,
    pluginRoot: report.pluginRoot,
    stats: report.stats,
    errors: report.stats.errors,
    warnings: report.stats.warnings,
  };
}

function printValidationReport(result, options = {}) {
  const stats = result.stats || {};
  const verbose = options.verbose === true;

  console.log('='.repeat(60));
  console.log('demokit Plugin Validation');
  console.log('='.repeat(60));
  if (stats.requiredFiles) {
    console.log(`Required files: ${stats.requiredFiles.valid}/${stats.requiredFiles.total}`);
  }
  if (stats.requiredDirs) {
    console.log(`Required dirs:  ${stats.requiredDirs.valid}/${stats.requiredDirs.total}`);
  }
  if (stats.skills) {
    console.log(`Skills:         ${stats.skills.valid}/${stats.skills.total} valid`);
  }
  if (stats.agents) {
    console.log(`Agents:         ${stats.agents.valid}/${stats.agents.total} valid`);
  }
  if (stats.hooks) {
    console.log(`Hooks:          ${stats.hooks.valid}/${stats.hooks.total} valid`);
  }
  if (stats.scriptRefs) {
    console.log(`Script refs:    ${stats.scriptRefs.valid}/${stats.scriptRefs.total} valid`);
  }
  console.log(`Errors:         ${(stats.errors || []).length}`);
  console.log(`Warnings:       ${(stats.warnings || []).length}`);

  if (verbose && (stats.warnings || []).length > 0) {
    console.log('\nWarnings:');
    stats.warnings.forEach(msg => console.log(`  - ${msg}`));
  }

  if ((stats.errors || []).length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach(msg => console.log(`  - ${msg}`));
  }
}

module.exports = {
  REQUIRED_FILES,
  REQUIRED_DIRS,
  parseSimpleYaml,
  parseFrontmatter,
  extractScriptReferences,
  extractScriptRefs,
  validatePlugin,
  validatePluginStructure,
  printValidationReport,
};
