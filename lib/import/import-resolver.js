/**
 * Import Resolver
 * @import 디렉티브로 참조된 파일을 해석하고 내용을 반환
 */
const path = require('path');
const { config, io, cache } = require('../core');

const CACHE_PREFIX = 'import:';
const DEFAULT_CACHE_TTL = 30000; // 30초
const MAX_IMPORT_DEPTH = 5;

/**
 * 기본 변수 맵 반환
 */
function getDefaultVariables(projectRoot) {
  return {
    PLUGIN_ROOT: config.getPluginRoot(),
    PROJECT_ROOT: projectRoot || process.cwd(),
  };
}

/**
 * 변수 치환 (${PLUGIN_ROOT} 등)
 */
function resolveVariables(importPath, variables) {
  if (!importPath) return importPath;
  let resolved = importPath;
  for (const [key, value] of Object.entries(variables)) {
    resolved = resolved.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  }
  return resolved;
}

/**
 * 파일 로드 + 캐시
 */
function loadImportFile(resolvedPath) {
  const cacheKey = CACHE_PREFIX + resolvedPath;
  const cached = cache.get(cacheKey);
  if (cached !== null) return cached;

  const content = io.readFile(resolvedPath);
  if (content === null) return null;

  const ttl = getCacheTtl();
  cache.set(cacheKey, content, ttl);
  return content;
}

/**
 * config에서 cacheTtl 가져오기
 */
function getCacheTtl() {
  try {
    const cfg = config.loadConfig();
    return cfg.contextEngineering?.cacheTtl || DEFAULT_CACHE_TTL;
  } catch {
    return DEFAULT_CACHE_TTL;
  }
}

/**
 * 순환 참조 감지
 */
function detectCircular(chain, currentPath) {
  return chain.has(currentPath);
}

/**
 * config에서 maxImportDepth 가져오기
 */
function getMaxDepth() {
  try {
    const cfg = config.loadConfig();
    return cfg.contextEngineering?.maxImportDepth || MAX_IMPORT_DEPTH;
  } catch {
    return MAX_IMPORT_DEPTH;
  }
}

/**
 * Agent .md 파일에서 ## imports 섹션의 - 항목 추출
 */
function parseAgentImports(agentMdPath) {
  const content = io.readFile(agentMdPath);
  if (!content) return [];

  const lines = content.split('\n');
  let inImportsSection = false;
  const imports = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // ## imports 섹션 시작 감지
    if (/^##\s+imports$/i.test(trimmed)) {
      inImportsSection = true;
      continue;
    }

    // 다른 ## 섹션이 나오면 imports 섹션 종료
    if (inImportsSection && /^##\s+/.test(trimmed)) {
      break;
    }

    // imports 섹션 내부의 - 항목 추출
    if (inImportsSection && trimmed.startsWith('- ')) {
      const importPath = trimmed.substring(2).trim();
      if (importPath) imports.push(importPath);
    }
  }

  return imports;
}

/**
 * import 경로 배열 → 결합된 내용 반환
 */
function resolveImports(importPaths, variables) {
  if (!importPaths || importPaths.length === 0) return '';

  const vars = variables || getDefaultVariables();
  const chain = new Set();
  const contents = [];

  for (const importPath of importPaths) {
    const resolved = resolveVariables(importPath, vars);
    if (detectCircular(chain, resolved)) continue;

    chain.add(resolved);
    const content = loadImportFile(resolved);
    if (content) {
      contents.push(content);
    }
  }

  return contents.join('\n\n---\n\n');
}

module.exports = {
  resolveImports,
  resolveVariables,
  loadImportFile,
  detectCircular,
  parseAgentImports,
  getDefaultVariables,
};
