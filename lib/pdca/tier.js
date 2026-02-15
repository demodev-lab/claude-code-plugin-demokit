/**
 * Language/Tech Tier 분류
 * 파일 확장자 기반 기술 계층 분류 및 PDCA 가이드
 */
const path = require('path');

const TIER_EXTENSIONS = {
  1: ['.java', '.kt'],
  2: ['.gradle', '.gradle.kts', '.properties', '.yml', '.yaml', '.sql'],
  3: ['.xml'],
  4: ['.md', '.txt', '.adoc'],
  experimental: ['.groovy', '.sh'],
};

const TIER_DESCRIPTIONS = {
  1: '핵심 비즈니스 로직 (Java/Kotlin)',
  2: '빌드/설정/데이터 (Gradle, Properties, SQL)',
  3: '설정/메타데이터 (XML)',
  4: '문서/가이드 (Markdown, Text)',
  experimental: '실험적 스크립트 (Groovy, Shell)',
  unknown: '분류 미정',
};

const TIER_PDCA_GUIDANCE = {
  1: 'Plan-Design-Do 전 단계에서 설계 문서 필수. 코드 리뷰 + Gap 분석 수행',
  2: '설정 변경 시 영향 범위 분석 필수. Do phase에서 검증 포함',
  3: 'Do phase에서 직접 수정. 별도 설계 불필요',
  4: 'Report phase에서 자동 생성 가능. 별도 PDCA 불필요',
  experimental: '실험 목적으로만 사용. 프로덕션 적용 전 Tier 1/2로 전환 필요',
  unknown: '확장자 확인 후 적절한 Tier 적용',
};

// 확장자 → tier 역방향 매핑 (조회 최적화)
const _extToTier = {};
for (const [tier, exts] of Object.entries(TIER_EXTENSIONS)) {
  for (const ext of exts) {
    _extToTier[ext] = tier === 'experimental' ? 'experimental' : tier;
  }
}

/**
 * 파일 경로에서 Language Tier 반환
 * @param {string} filePath
 * @returns {'1'|'2'|'3'|'4'|'experimental'|'unknown'}
 */
function getLanguageTier(filePath) {
  if (!filePath) return 'unknown';
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) return 'unknown';

  // .gradle.kts 복합 확장자 처리
  if (filePath.endsWith('.gradle.kts')) return '2';

  return _extToTier[ext] || 'unknown';
}

/**
 * Tier 설명 반환
 */
function getTierDescription(tier) {
  return TIER_DESCRIPTIONS[tier] || TIER_DESCRIPTIONS.unknown;
}

/**
 * Tier별 PDCA 가이드 반환
 */
function getTierPdcaGuidance(tier) {
  return TIER_PDCA_GUIDANCE[tier] || TIER_PDCA_GUIDANCE.unknown;
}

function isTier1(filePath) { return getLanguageTier(filePath) === '1'; }
function isTier2(filePath) { return getLanguageTier(filePath) === '2'; }
function isTier3(filePath) { return getLanguageTier(filePath) === '3'; }
function isTier4(filePath) { return getLanguageTier(filePath) === '4'; }
function isExperimental(filePath) { return getLanguageTier(filePath) === 'experimental'; }

module.exports = {
  TIER_EXTENSIONS,
  TIER_DESCRIPTIONS,
  TIER_PDCA_GUIDANCE,
  getLanguageTier,
  getTierDescription,
  getTierPdcaGuidance,
  isTier1,
  isTier2,
  isTier3,
  isTier4,
  isExperimental,
};
