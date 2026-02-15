/**
 * Gap Detector Agent Stop Script
 * analyze phase의 matchRate 확인 후 다음 행동 제안
 */

async function main(hookData) {
  hookData = hookData || {};
  const transcript = hookData.transcript || hookData.content || '';
  const hints = [];

  // matchRate 추출 시도
  const matchRateMatch = transcript.match(/match\s*rate[:\s]*(\d+)/i)
    || transcript.match(/일치율[:\s]*(\d+)/);
  const matchRate = matchRateMatch ? parseInt(matchRateMatch[1], 10) : null;

  if (matchRate !== null) {
    if (matchRate < 90) {
      hints.push(`[Gap Detector] Match Rate: ${matchRate}% (< 90%)`);
      hints.push(`[제안] /pdca iterate 로 자동 수정을 시작하세요.`);
    } else {
      hints.push(`[Gap Detector] Match Rate: ${matchRate}% - 기준 충족`);
      hints.push(`[제안] /pdca report 로 완료 보고서를 작성하세요.`);
    }
  }

  return hints;
}

module.exports = { main };
