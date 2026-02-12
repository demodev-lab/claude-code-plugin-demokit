/**
 * Intent 모듈 - 사용자 의도 감지
 */
const trigger = require('./trigger');
const language = require('./language');
const ambiguity = require('./ambiguity');

module.exports = { trigger, language, ambiguity };
