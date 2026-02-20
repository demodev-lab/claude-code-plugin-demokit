/**
 * 설정 로딩/관리
 */
const fs = require('fs');
const path = require('path');
const contextHierarchy = require('../context-hierarchy');

let _config = null;
let _pluginRoot = null;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeObject(target, source) {
  const merged = { ...target };

  for (const [key, sourceValue] of Object.entries(source || {})) {
    const targetValue = merged[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      merged[key] = mergeObject(targetValue, sourceValue);
      continue;
    }

    merged[key] = sourceValue;
  }

  return merged;
}

/**
 * 플러그인 루트 디렉토리 (demodev.config.json 위치)
 */
function getPluginRoot() {
  if (!_pluginRoot) {
    _pluginRoot = path.resolve(__dirname, '..', '..');
  }
  return _pluginRoot;
}

/**
 * demodev.config.json 로드
 */
function loadConfig() {
  if (_config) return _config;

  const pluginConfigPath = path.join(getPluginRoot(), 'demodev.config.json');
  let pluginConfig;

  try {
    const raw = fs.readFileSync(pluginConfigPath, 'utf-8');
    pluginConfig = JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`설정 파일을 찾을 수 없습니다: ${pluginConfigPath}`);
    }
    throw new Error(`설정 파일 파싱 실패 (${pluginConfigPath}): ${err.message}`);
  }

  const hierarchy = contextHierarchy.getContextHierarchy();
  let merged = mergeObject({}, pluginConfig);

  for (const level of hierarchy.levels) {
    if (level.level === 'plugin') continue;
    merged = mergeObject(merged, level.data || {});
  }

  _config = merged;
  return _config;
}

/**
 * 설정 값 가져오기 (dot notation 지원)
 * 예: getConfigValue('spring.namingConventions.entity')
 */
function getConfigValue(keyPath, defaultValue) {
  const config = loadConfig();
  const keys = keyPath.split('.');
  let value = config;
  for (const key of keys) {
    if (value == null || typeof value !== 'object') return defaultValue;
    value = value[key];
  }
  return value !== undefined ? value : defaultValue;
}

/**
 * 설정 캐시 초기화 (테스트용)
 */
function resetConfig() {
  _config = null;
  contextHierarchy.invalidateCache();
}

module.exports = { getPluginRoot, loadConfig, getConfigValue, resetConfig };
