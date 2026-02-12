/**
 * 디버그 로깅 유틸리티
 * 환경 변수 DEMODEV_DEBUG=true 일 때만 출력
 */

const isDebug = process.env.DEMODEV_DEBUG === 'true';

/**
 * 디버그 메시지 출력 (stderr)
 */
function debug(tag, message, data) {
  if (!isDebug) return;
  const timestamp = new Date().toISOString().slice(11, 23);
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  process.stderr.write(`[demodev:${tag}] ${timestamp} ${message}${dataStr}\n`);
}

/**
 * 경고 메시지 (항상 출력)
 */
function warn(tag, message) {
  process.stderr.write(`[demodev:${tag}] WARN: ${message}\n`);
}

/**
 * 에러 메시지 (항상 출력)
 */
function error(tag, message, err) {
  const errStr = err ? ` - ${err.message || err}` : '';
  process.stderr.write(`[demodev:${tag}] ERROR: ${message}${errStr}\n`);
}

module.exports = { debug, warn, error };
