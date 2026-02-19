/**
 * Hook Runtime Controls
 * demodev.config.json의 hooks.runtime 설정을 읽어 훅 이벤트/스크립트 실행 여부를 제어
 */
const config = require('./config');

function isEnabled(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  return value !== false;
}

function isEventEnabled(eventName, fallback = true) {
  if (!eventName) return fallback;
  const value = config.getConfigValue(`hooks.runtime.events.${eventName}`, fallback);
  return isEnabled(value, fallback);
}

function isScriptEnabled(scriptKey, fallback = true) {
  if (!scriptKey) return fallback;
  const value = config.getConfigValue(`hooks.runtime.scripts.${scriptKey}`, fallback);
  return isEnabled(value, fallback);
}

function shouldRun({ eventName, scriptKey, eventFallback = true, scriptFallback = true }) {
  if (!isEventEnabled(eventName, eventFallback)) return false;
  if (scriptKey && !isScriptEnabled(scriptKey, scriptFallback)) return false;
  return true;
}

module.exports = {
  isEventEnabled,
  isScriptEnabled,
  shouldRun,
};
