/**
 * CTO Decision Logic
 * Check 결과 기반 다음 방향 결정
 */
const { debug: log } = require('../core');

/**
 * Check 결과 기반 다음 방향 결정
 * @param {number} matchRate - 0~100
 * @param {number} criticalIssues
 * @param {number} qualityScore - 0~100
 * @returns {{ decision: 'report'|'iterate'|'redesign', reason, nextAction }}
 */
function evaluateCheckResults(matchRate, criticalIssues, qualityScore) {
  // matchRate 정규화: 숫자 또는 { totalRate } 객체 모두 지원
  const rate = typeof matchRate === 'number' ? matchRate
    : (typeof matchRate === 'object' && matchRate !== null) ? matchRate.totalRate
    : null;

  if (rate == null) {
    log.debug('cto-logic', 'matchRate unavailable, defaulting to iterate');
    return { decision: 'iterate', reason: 'Match rate unavailable', nextAction: '/pdca iterate' };
  }

  let decision, reason, nextAction;
  const safeCritical = (typeof criticalIssues === 'number' && Number.isFinite(criticalIssues)) ? criticalIssues : 0;

  if (rate >= 90 && safeCritical === 0) {
    decision = 'report';
    reason = `Match rate ${rate}% meets threshold, no critical issues`;
    nextAction = '/pdca report';
  } else if (rate >= 70) {
    decision = 'iterate';
    reason = safeCritical > 0
      ? `${safeCritical} critical issues need resolution`
      : `Match rate ${rate}% below 90% threshold`;
    nextAction = '/pdca iterate';
  } else {
    decision = 'redesign';
    reason = `Match rate ${rate}% is critically low, redesign recommended`;
    nextAction = '/pdca design';
  }

  log.debug('cto-logic', `check evaluation: ${decision}`, { matchRate: rate, criticalIssues, qualityScore });

  return { decision, reason, nextAction };
}

module.exports = {
  evaluateCheckResults,
};
