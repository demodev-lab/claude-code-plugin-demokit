/**
 * Cross-Team Validation
 * 고복잡도 작업에서 교차 검증 지시 생성
 */

const CROSS_VALIDATION_MAP = {
  entity: 'service-expert',
  repository: 'service-expert',
  service: 'api-expert',
  controller: 'test-expert',
  dto: 'api-expert',
  config: 'security-expert',
  exception: 'test-expert',
};

const CROSS_VALIDATION_THRESHOLD = 50;

function shouldCrossValidate(complexityScore) {
  return typeof complexityScore === 'number' && complexityScore >= CROSS_VALIDATION_THRESHOLD;
}

function buildCrossValidationPairs(completedTasks) {
  if (!Array.isArray(completedTasks)) return [];
  const seen = new Set();
  return completedTasks
    .filter(t => t.status === 'completed' && t.layer && CROSS_VALIDATION_MAP[t.layer])
    .filter(t => {
      if (seen.has(t.layer)) return false;
      seen.add(t.layer);
      return true;
    })
    .map(t => ({
      sourceLayer: t.layer,
      validatorAgent: CROSS_VALIDATION_MAP[t.layer],
    }));
}

function buildCrossValidationMarkdown(pairs, waveIndex, featureSlug) {
  if (!Array.isArray(pairs) || pairs.length === 0) return '';
  const lines = [];
  lines.push(`## Wave ${waveIndex} 교차 검증 (${featureSlug})`);
  lines.push('');
  for (const pair of pairs) {
    lines.push(`- **${pair.validatorAgent}**가 \`${pair.sourceLayer}\` 산출물 검증`);
  }
  lines.push('');
  lines.push('> 교차 검증: 각 validator agent가 해당 layer의 산출물을 검토하고 피드백을 제공하세요.');
  return lines.join('\n');
}

function attachCrossValidation(waveState, waveIndex, complexityScore) {
  if (!shouldCrossValidate(complexityScore)) {
    return { required: false, pairs: [] };
  }
  if (!waveState || !Array.isArray(waveState.waves)) {
    return { required: false, pairs: [] };
  }
  const wave = waveState.waves.find(w => w.waveIndex === waveIndex);
  if (!wave || !Array.isArray(wave.tasks)) {
    return { required: false, pairs: [] };
  }
  const pairs = buildCrossValidationPairs(wave.tasks);
  return { required: pairs.length > 0, pairs };
}

module.exports = {
  CROSS_VALIDATION_MAP,
  CROSS_VALIDATION_THRESHOLD,
  shouldCrossValidate,
  buildCrossValidationPairs,
  buildCrossValidationMarkdown,
  attachCrossValidation,
};
