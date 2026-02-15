/**
 * PDCA Iterator Agent Stop Script
 * iterate 결과 평가 후 report/iterate/redesign 분기 안내
 */
const path = require('path');

async function main(hookData) {
  hookData = hookData || {};
  const transcript = hookData.transcript || hookData.content || '';
  const hints = [];

  try {
    const { ctoLogic } = require(path.join(__dirname, '..', 'lib', 'team'));

    // transcript에서 check 결과 추출
    const passMatch = transcript.match(/pass(?:ed)?[:\s]*(\d+)/i);
    const failMatch = transcript.match(/fail(?:ed)?[:\s]*(\d+)/i);
    const totalMatch = transcript.match(/total[:\s]*(\d+)/i);

    const checkResults = {
      passed: passMatch ? parseInt(passMatch[1], 10) : 0,
      failed: failMatch ? parseInt(failMatch[1], 10) : 0,
      total: totalMatch ? parseInt(totalMatch[1], 10) : 0,
    };

    if (checkResults.total > 0) {
      const matchRate = checkResults.total > 0
        ? Math.round((checkResults.passed / checkResults.total) * 100) : 0;
      const evaluation = ctoLogic.evaluateCheckResults(matchRate, checkResults.failed, 0);

      if (evaluation.decision === 'report') {
        hints.push(`[Iterator] 검증 통과 (${checkResults.passed}/${checkResults.total})`);
        hints.push(`[제안] /pdca report 로 완료 보고서를 작성하세요.`);
      } else if (evaluation.decision === 'iterate') {
        hints.push(`[Iterator] 추가 수정 필요 (실패: ${checkResults.failed}/${checkResults.total})`);
        hints.push(`[제안] /pdca iterate 를 다시 실행하세요.`);
      } else if (evaluation.decision === 'redesign') {
        hints.push(`[Iterator] 설계 재검토 필요`);
        hints.push(`[제안] /pdca design 으로 돌아가서 설계를 수정하세요.`);
      }
    }
  } catch { /* cto-logic 로드 실패 시 무시 */ }

  return hints;
}

module.exports = { main };
