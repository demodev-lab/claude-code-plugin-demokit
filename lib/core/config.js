/**
 * 설정 로딩/관리
 */
const fs = require('fs');
const path = require('path');

let _config = null;
let _pluginRoot = null;

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
  const configPath = path.join(getPluginRoot(), 'demodev.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`설정 파일을 찾을 수 없습니다: ${configPath}`);
  }
  _config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
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
}

module.exports = { getPluginRoot, loadConfig, getConfigValue, resetConfig };
