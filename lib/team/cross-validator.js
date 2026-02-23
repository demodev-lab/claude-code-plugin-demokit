/**
 * Cross-Team Validation
 * 고복잡도 작업에서 교차 검증 지시 생성
 */
const { LAYER_FILE_PATTERNS } = require('./layer-constants');

const CROSS_VALIDATION_MAP = {
  entity: 'service-expert',
  repository: 'service-expert',
  service: 'api-expert',
  controller: 'test-expert',
  dto: 'api-expert',
  config: 'security-expert',
  exception: 'test-expert',
  test: 'service-expert',
};

const LAYER_REVIEW_CHECKLIST = {
  entity:     ['필드명/타입 일관성', '연관관계 방향', 'equals/hashCode'],
  repository: ['메서드 네이밍 규약', '불필요 native query', 'N+1 위험'],
  service:    ['트랜잭션 경계', 'entity 직접 노출 여부', '외부 의존성 주입'],
  controller: ['응답 코드 일관성', 'DTO 변환 위치', 'API 경로 규약'],
  dto:        ['요청/응답 필드 대칭성', '검증 어노테이션 누락', 'Null 정책'],
  config:     ['환경변수 하드코딩', '보안 민감값 노출', '빈 충돌 가능성'],
  exception:  ['에러 코드 중복', '상태코드 일관성', '메시지 국제화'],
  test:       ['핵심 비즈니스 케이스 커버', '경계값/예외 케이스', 'Mock 과의존'],
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
  const slug = featureSlug || 'unknown';
  const lines = [];
  lines.push(`## Wave ${waveIndex} 교차 검증 (${slug})`);
  lines.push('');
  for (const pair of pairs) {
    const patterns = LAYER_FILE_PATTERNS[pair.sourceLayer] || [];
    const checklist = LAYER_REVIEW_CHECKLIST[pair.sourceLayer] || [];
    lines.push(`### ${pair.sourceLayer} → ${pair.validatorAgent}`);
    if (patterns.length > 0) {
      lines.push(`- **대상 파일**: \`${patterns.join('`, `')}\``);
    }
    if (checklist.length > 0) {
      lines.push('- **검토 항목**:');
      for (const item of checklist) {
        lines.push(`  - [ ] ${item}`);
      }
    }
    lines.push('');
  }
  lines.push('> **완료 보고 양식**:');
  lines.push('> - Reviewed layer: (검토한 레이어)');
  lines.push('> - Issues found: (발견된 문제, 없으면 "none")');
  lines.push('> - Suggestions: (개선 제안)');
  return lines.join('\n');
}

function buildCrossValidationDispatch(pairs, waveIndex, featureSlug) {
  if (!Array.isArray(pairs) || pairs.length === 0) return '';
  const md = buildCrossValidationMarkdown(pairs, waveIndex, featureSlug);
  const lines = [];
  lines.push(md);
  lines.push('');
  lines.push(`> 위 ${pairs.length}개 교차 검증을 각각 독립된 Task subagent로 **병렬 실행**하세요.`);
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
  LAYER_REVIEW_CHECKLIST,
  shouldCrossValidate,
  buildCrossValidationPairs,
  buildCrossValidationMarkdown,
  buildCrossValidationDispatch,
  attachCrossValidation,
};
