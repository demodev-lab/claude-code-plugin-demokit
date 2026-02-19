#!/usr/bin/env node
/**
 * generate-graph-index.js
 * demokit-system/_GRAPH-INDEX.md의 Agents 표를 실제 agents/*.md 기반으로 동기화
 *
 * Usage:
 *   node scripts/generate-graph-index.js
 *   node scripts/generate-graph-index.js --check
 */
const fs = require('fs');
const path = require('path');

const AGENTS_HEADING = '## Agents (에이전트)';
const TABLE_HEADER = '| 이름 | 모델 | 역할 |';
const TABLE_DIVIDER = '|------|------|------|';

function getPluginRoot() {
  return path.resolve(__dirname, '..');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function parseSectionSingleLineValue(content, headingText) {
  const lines = content.split(/\r?\n/);
  const idx = lines.findIndex(line => line.trim() === `## ${headingText}`);
  if (idx === -1) return null;

  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('## ')) return null;
    return line;
  }

  return null;
}

function parseSectionParagraph(content, headingText) {
  const lines = content.split(/\r?\n/);
  const idx = lines.findIndex(line => line.trim() === `## ${headingText}`);
  if (idx === -1) return null;

  const buff = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      if (buff.length > 0) break;
      continue;
    }
    if (line.startsWith('## ')) break;
    buff.push(line);
  }

  if (buff.length === 0) return null;
  return buff.join(' ').replace(/\s+/g, ' ').trim();
}

function readAgentMeta(agentFile) {
  const content = readText(agentFile);
  const model = parseSectionSingleLineValue(content, '모델') || 'unknown';
  const role = parseSectionParagraph(content, '역할') || '역할 설명 없음';

  return {
    name: path.basename(agentFile, '.md'),
    model,
    role,
  };
}

function getAgentOrder(pluginRoot, existingNames) {
  const configPath = path.join(pluginRoot, 'demodev.config.json');
  try {
    const cfg = JSON.parse(readText(configPath));
    const orderedFromConfig = Object.keys(cfg?.agents?.modelAssignment || {})
      .filter(name => existingNames.includes(name));

    const rest = existingNames
      .filter(name => !orderedFromConfig.includes(name))
      .sort();

    return [...orderedFromConfig, ...rest];
  } catch {
    return [...existingNames].sort();
  }
}

function escapeCell(text) {
  return String(text || '').replace(/\|/g, '\\|');
}

function buildAgentsTableRows(pluginRoot) {
  const agentsDir = path.join(pluginRoot, 'agents');
  const files = fs.readdirSync(agentsDir)
    .filter(name => name.endsWith('.md'))
    .map(name => path.join(agentsDir, name));

  const metas = files.map(readAgentMeta);
  const byName = new Map(metas.map(meta => [meta.name, meta]));
  const order = getAgentOrder(pluginRoot, metas.map(meta => meta.name));

  return order.map(name => {
    const meta = byName.get(name);
    return `| ${escapeCell(meta.name)} | ${escapeCell(meta.model)} | ${escapeCell(meta.role)} |`;
  });
}

function replaceAgentsTable(graphContent, rows) {
  const lines = graphContent.split(/\r?\n/);
  const headingIdx = lines.findIndex(line => line.trim() === AGENTS_HEADING);
  if (headingIdx === -1) {
    throw new Error(`${AGENTS_HEADING} 섹션을 찾을 수 없습니다.`);
  }

  const headerIdx = lines.findIndex((line, idx) => idx > headingIdx && line.trim() === TABLE_HEADER);
  if (headerIdx === -1) {
    throw new Error('Agents 표 헤더를 찾을 수 없습니다.');
  }

  let endIdx = headerIdx;
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith('|')) {
      endIdx = i;
      break;
    }
    endIdx = i + 1;
  }

  const newTableLines = [TABLE_HEADER, TABLE_DIVIDER, ...rows];
  const updated = [
    ...lines.slice(0, headerIdx),
    ...newTableLines,
    ...lines.slice(endIdx),
  ].join('\n');

  return updated.endsWith('\n') ? updated : `${updated}\n`;
}

function syncGraphIndex(pluginRoot) {
  const graphPath = path.join(pluginRoot, 'demokit-system', '_GRAPH-INDEX.md');
  const current = readText(graphPath);
  const rows = buildAgentsTableRows(pluginRoot);
  const updated = replaceAgentsTable(current, rows);

  return {
    graphPath,
    changed: current !== updated,
    content: updated,
  };
}

function parseArgs(argv) {
  return {
    check: argv.includes('--check'),
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const pluginRoot = getPluginRoot();
  const result = syncGraphIndex(pluginRoot);

  if (!result.changed) {
    console.log('Graph index is up to date.');
    return 0;
  }

  if (args.check) {
    console.error('Graph index drift detected. Run: npm run sync:graph-index');
    return 1;
  }

  fs.writeFileSync(result.graphPath, result.content, 'utf-8');
  console.log(`Updated: ${result.graphPath}`);
  return 0;
}

module.exports = {
  parseSectionSingleLineValue,
  parseSectionParagraph,
  readAgentMeta,
  getAgentOrder,
  buildAgentsTableRows,
  replaceAgentsTable,
  syncGraphIndex,
  parseArgs,
  main,
};

if (require.main === module) {
  process.exit(main());
}
