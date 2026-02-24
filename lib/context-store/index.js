/**
 * Context Store 모듈
 * MD 파일 기반 컨텍스트 영구 저장
 */
const writer = require('./writer');
const snapshot = require('./snapshot');
let injector = null;
try { injector = require('../../dist/lib/context-store/context-injector'); } catch { /* 미빌드 시 무시 */ }

module.exports = { writer, snapshot, injector };
