/**
 * 인메모리 캐시 - 세션 동안 분석 결과 재사용
 */

const _cache = new Map();
const _ttl = new Map();

const DEFAULT_TTL = 5 * 60 * 1000; // 5분

/**
 * 캐시에 값 저장
 */
function set(key, value, ttlMs = DEFAULT_TTL) {
  _cache.set(key, value);
  _ttl.set(key, Date.now() + ttlMs);
}

/**
 * 캐시에서 값 가져오기
 */
function get(key) {
  if (!_cache.has(key)) return null;
  const expiry = _ttl.get(key);
  if (expiry === undefined || Date.now() > expiry) {
    _cache.delete(key);
    _ttl.delete(key);
    return null;
  }
  return _cache.get(key);
}

/**
 * 캐시 키 존재 여부 (TTL 고려)
 */
function has(key) {
  if (!_cache.has(key)) return false;
  const expiry = _ttl.get(key);
  if (expiry === undefined || Date.now() > expiry) {
    _cache.delete(key);
    _ttl.delete(key);
    return false;
  }
  return true;
}

/**
 * 캐시 항목 삭제
 */
function del(key) {
  _cache.delete(key);
  _ttl.delete(key);
}

/**
 * 전체 캐시 초기화
 */
function clear() {
  _cache.clear();
  _ttl.clear();
}

/**
 * 캐시 통계
 */
function stats() {
  return { size: _cache.size };
}

module.exports = { set, get, has, del, clear, stats };
