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
  const safeProjectRoot = projectRoot || process.cwd();
  return {
    PLUGIN_ROOT: config.getPluginRoot(),
    PROJECT_ROOT: safeProjectRoot,
    PROJECT: safeProjectRoot,
  };
}

function trimImportPath(importPath) {
  if (!importPath) return '';
  return expandTilde(String(importPath).trim()).replace(/^["'`]|["'`]$/g, '');
}

function expandTilde(value) {
  if (!value) return '';
  const raw = String(value);
  if (!raw.startsWith('~')) return raw;
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return raw;
  if (raw === '~') return home;
  if (!/^~[\\/]/.test(raw)) return raw;
  return path.join(home, raw.substring(2));
}

function getImportSourceDir(fromFile) {
  if (!fromFile) return process.cwd();
  const resolved = path.resolve(fromFile);
  const isFile = path.extname(resolved) !== '';
  return isFile ? path.dirname(resolved) : resolved;
}

function toArray(value) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    const normalized = String(value).trim();
    return normalized ? [normalized] : [];
  }
  const result = [];
  for (const item of value) {
    if (Array.isArray(item)) {
      for (const nested of item) {
        if (typeof nested !== 'string') continue;
        const normalized = nested.trim();
        if (normalized) result.push(normalized);
      }
      continue;
    }

    if (typeof item !== 'string') continue;
    const normalized = item.trim();
    if (normalized) result.push(normalized);
  }
  return result;
}

function getUniquePaths(values) {
  const unique = [];
  const seen = new Set();
  for (const value of values) {
    if (!value) continue;
    const normalized = path.normalize(value);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

function getImportCandidateVariants(candidate) {
  const normalized = path.normalize(candidate);
  if (path.extname(normalized)) {
    return [normalized];
  }

  return [
    normalized,
    `${normalized}.md`,
    `${normalized}.markdown`,
  ];
}

function pushImportCandidate(candidates, candidate, fallbackBase) {
  if (!candidate) return;
  const base = fallbackBase || process.cwd();
  for (const variant of getImportCandidateVariants(candidate)) {
    if (!variant) continue;
    const resolved = path.isAbsolute(variant)
      ? path.normalize(variant)
      : path.resolve(base, variant);
    candidates.push(resolved);
  }
}

function toProjectRootList(variables) {
  const varValues = variables || getDefaultVariables();
  const candidates = [];

  if (varValues.PROJECT_ROOT) candidates.push(varValues.PROJECT_ROOT);
  if (varValues.PROJECT && varValues.PROJECT !== varValues.PROJECT_ROOT) candidates.push(varValues.PROJECT);
  if (
    varValues.PLUGIN_ROOT &&
    varValues.PLUGIN_ROOT !== varValues.PROJECT_ROOT &&
    varValues.PLUGIN_ROOT !== varValues.PROJECT
  ) {
    candidates.push(varValues.PLUGIN_ROOT);
  }

  return getUniquePaths(candidates.map(p => path.resolve(p)));
}

function asAbsolutePath(candidate, fallbackBase) {
  const normalized = path.normalize(candidate);
  if (path.isAbsolute(normalized)) return normalized;
  return path.resolve(fallbackBase || process.cwd(), normalized);
}

function collectImportBaseDirs(vars, fromFile) {
  const fromDir = getImportSourceDir(fromFile);
  const bases = [fromDir];
  for (const root of toProjectRootList(vars)) {
    bases.push(root);
  }

  return getUniquePaths(bases.filter(Boolean).map(path.normalize));
}

function buildImportCandidates(importPath, fromFile, variables) {
  const vars = variables || getDefaultVariables();
  const candidates = [];

  const trimmed = trimImportPath(resolveVariables(importPath, vars));
  if (!trimmed) return [];
  const normalized = path.normalize(trimmed);

  if (path.isAbsolute(normalized)) {
    pushImportCandidate(candidates, path.resolve(normalized), process.cwd());
    return getUniquePaths(candidates);
  }

  const baseDirs = collectImportBaseDirs(vars, fromFile);
  for (const baseDir of baseDirs) {
    pushImportCandidate(candidates, asAbsolutePath(normalized, baseDir), baseDir);
  }

  for (const base of toProjectRootList(vars)) {
    pushImportCandidate(candidates, asAbsolutePath(normalized, base), base);
  }

  pushImportCandidate(candidates, asAbsolutePath(normalized, process.cwd()), process.cwd());

  return getUniquePaths(candidates);
}

/**
 * 변수 치환 (${PLUGIN_ROOT} 등)
 */
function resolveVariables(importPath, variables) {
  if (!importPath) return importPath;
  let resolved = String(importPath);
  for (const [key, value] of Object.entries(variables)) {
    const replacement = value === undefined || value === null ? '' : String(value);
    resolved = resolved.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), replacement);
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
 * import 문서에서 ## imports 섹션의 - 항목 추출
 */
function parseImportSection(content) {
  if (!content) return [];

  const lines = content.split(/\r?\n/);
  let inImportsSection = false;
  const imports = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^##\s+imports$/i.test(line)) {
      inImportsSection = true;
      continue;
    }

    if (inImportsSection) {
      if (/^##\s+/.test(line)) {
        break;
      }
      if (line.startsWith('- ')) {
        const importPath = trimImportPath(line.substring(2).trim());
        if (importPath) imports.push(importPath);
      }
    }
  }

  return imports;
}

/**
 * Agent .md 파일에서 imports 추출
 */
function parseAgentImports(agentMdPath) {
  const content = io.readFile(agentMdPath);
  return parseImportSection(content);
}

/**
 * import 경로 정규화
 */
function resolveImportPath(importPath, fromFile, variables) {
  const vars = variables || getDefaultVariables();
  const raw = trimImportPath(resolveVariables(importPath, vars));
  if (!raw) return null;

  const resolvedCandidates = buildImportCandidates(raw, fromFile, vars);
  const existed = resolvedCandidates.find(p => io.fileExists(p));
  return existed || resolvedCandidates[0] || path.resolve(process.cwd(), raw);
}

/**
 * 순환 참조 감지
 */
function detectCircular(chain, currentPath) {
  return chain.has(currentPath);
}

/**
 * import 체인을 따라 재귀 로딩
 */
function collectImportContent(importPath, fromFile, variables, context) {
  const {
    depth,
    maxDepth,
    chain,
    visited,
    contents,
    errors,
  } = context;

  if (depth > maxDepth) {
    errors.push(`Import depth exceeded: ${importPath}`);
    return;
  }

  const resolved = resolveImportPath(importPath, fromFile, variables);
  if (!resolved) {
    errors.push(`Invalid import: ${importPath}`);
    return;
  }

  if (detectCircular(chain, resolved)) {
    errors.push(`Circular import detected: ${importPath}`);
    return;
  }

  if (visited.has(resolved)) {
    return;
  }

  chain.add(resolved);
  try {
    const content = loadImportFile(resolved);
    if (content === null || content === undefined) {
      errors.push(`Failed to load: ${resolved}`);
      return;
    }

    visited.add(resolved);
    contents.push(`<!-- Imported from: ${resolved} -->\n${content}`);

    if (depth === maxDepth) return;

    const nested = parseImportSection(content);
    for (const nestedPath of nested) {
      collectImportContent(nestedPath, resolved, variables, {
        depth: depth + 1,
        maxDepth,
        chain,
        visited,
        contents,
        errors,
      });
    }
  } finally {
    chain.delete(resolved);
  }
}

/**
 * import 경로 배열 → 결합된 내용 반환
 */
function resolveImports(importPaths, variables, fromFile) {
  if (!importPaths || importPaths.length === 0) return '';

  const vars = variables || getDefaultVariables();
  const chain = new Set();
  const visited = new Set();
  const contents = [];
  const errors = [];
  const maxDepth = Math.max(1, getMaxDepth());
  const sourceFile = fromFile || vars.PROJECT_ROOT || vars.PROJECT || vars.PLUGIN_ROOT || process.cwd();
  const normalizedImportPaths = toArray(importPaths);

  for (const importPath of normalizedImportPaths) {
    collectImportContent(importPath, sourceFile, vars, {
      depth: 1,
      maxDepth,
      chain,
      visited,
      contents,
      errors,
    });
  }

  if (errors.length > 0) {
    process.stderr.write(`[import-resolver] ${errors.join(' | ')}\n`);
  }

  return contents.join('\n\n---\n\n');
}

module.exports = {
  resolveImports,
  resolveVariables,
  buildImportCandidates,
  loadImportFile,
  detectCircular,
  parseAgentImports,
  getDefaultVariables,
};
