/**
 * Multi-Level Context Hierarchy
 * 4-level 계층: Plugin(1) → User(2) → Project(3) → Session(4)
 * 높은 priority가 낮은 priority를 override
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const LEVEL_PRIORITY = {
  plugin: 1,
  user: 2,
  project: 3,
  session: 4,
};

// Session context (in-memory)
let _sessionContext = {};

// Cache
const _hierarchyCache = {
  data: null,
  timestamp: 0,
  ttl: 5000, // 5초
};

function getPluginRoot() {
  return path.resolve(__dirname, '..');
}

function getUserConfigDir() {
  return path.join(os.homedir(), '.claude', 'demokit');
}

function getProjectRoot() {
  const { platform } = require(path.join(__dirname, 'core'));
  return platform.findProjectRoot(process.cwd());
}

/**
 * 레벨별 config 로드
 * @param {'plugin' | 'user' | 'project' | 'session'} level
 * @returns {Object|null}
 */
function loadContextLevel(level) {
  const now = new Date().toISOString();

  switch (level) {
    case 'plugin': {
      const configPath = path.join(getPluginRoot(), 'demodev.config.json');
      return loadJsonLevel('plugin', configPath, now);
    }

    case 'user': {
      const configPath = path.join(getUserConfigDir(), 'user-config.json');
      return loadJsonLevel('user', configPath, now);
    }

    case 'project': {
      const projectRoot = getProjectRoot();
      if (!projectRoot) return null;
      const configPath = path.join(projectRoot, 'demodev.config.json');
      return loadJsonLevel('project', configPath, now);
    }

    case 'session': {
      return {
        level: 'session',
        priority: LEVEL_PRIORITY.session,
        source: 'memory',
        data: _sessionContext,
        loadedAt: now,
      };
    }

    default:
      return null;
  }
}

function loadJsonLevel(level, configPath, now) {
  if (!fs.existsSync(configPath)) return null;
  try {
    return {
      level,
      priority: LEVEL_PRIORITY[level],
      source: configPath,
      data: JSON.parse(fs.readFileSync(configPath, 'utf-8')),
      loadedAt: now,
    };
  } catch {
    return null;
  }
}

/**
 * 전체 계층 병합 + conflict 감지
 * @param {boolean} forceRefresh - 캐시 무시
 * @returns {{ levels: Array, merged: Object, conflicts: Array }}
 */
function getContextHierarchy(forceRefresh = false) {
  if (!forceRefresh && _hierarchyCache.data) {
    if (Date.now() - _hierarchyCache.timestamp < _hierarchyCache.ttl) {
      return _hierarchyCache.data;
    }
  }

  const levels = [];
  const conflicts = [];

  for (const levelName of ['plugin', 'user', 'project', 'session']) {
    const level = loadContextLevel(levelName);
    if (level) levels.push(level);
  }

  levels.sort((a, b) => a.priority - b.priority);

  const merged = {};
  const keyHistory = {};

  for (const level of levels) {
    for (const [key, value] of Object.entries(level.data || {})) {
      if (key in merged && JSON.stringify(merged[key]) !== JSON.stringify(value)) {
        const priorHistory = keyHistory[key] ? [...keyHistory[key]] : [];
        conflicts.push({
          key,
          values: [...priorHistory, { level: level.level, value }],
          resolved: value,
        });
      }
      merged[key] = value;
      if (!keyHistory[key]) keyHistory[key] = [];
      keyHistory[key].push({ level: level.level, value });
    }
  }

  const result = { levels, merged, conflicts };

  _hierarchyCache.data = result;
  _hierarchyCache.timestamp = Date.now();

  return result;
}

/**
 * dot-notation 값 조회
 * @param {string} keyPath - 예: "pdca.matchRateThreshold"
 * @param {*} defaultValue
 * @returns {*}
 */
function getHierarchicalConfig(keyPath, defaultValue = null) {
  const hierarchy = getContextHierarchy();
  const keys = keyPath.split('.');
  let value = hierarchy.merged;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return value ?? defaultValue;
}

/**
 * Session level 설정
 * @param {string} key
 * @param {*} value
 */
function setSessionContext(key, value) {
  _sessionContext[key] = value;
  _hierarchyCache.data = null;
}

/**
 * Session level 조회
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
function getSessionContext(key, defaultValue = null) {
  return key in _sessionContext ? _sessionContext[key] : defaultValue;
}

/**
 * Session 정리
 */
function clearSessionContext() {
  _sessionContext = {};
  _hierarchyCache.data = null;
}

/**
 * 캐시 무효화
 */
function invalidateCache() {
  _hierarchyCache.data = null;
}

module.exports = {
  LEVEL_PRIORITY,
  loadContextLevel,
  getContextHierarchy,
  getHierarchicalConfig,
  setSessionContext,
  getSessionContext,
  clearSessionContext,
  invalidateCache,
  getUserConfigDir,
};
