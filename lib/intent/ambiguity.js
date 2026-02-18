/**
 * 모호성 감지
 * 점수 기반 모호성 분석 + Magic Word bypass
 */

const ACTION_VERBS = /(만들어|생성|추가|작성|구현|수정|변경|설정|삭제|리팩토링|리뷰|분석|테스트|테스트해)/i;
const DOMAIN_KEYWORDS = /[A-Z][a-zA-Z0-9]+(?:[A-Z][a-zA-Z0-9]+)*|[a-z]+(?:-[a-z]+)+|[가-힣]{2,}/i;
const LAYER_KEYWORDS = /^(?:엔티티|entity|서비스|service|컨트롤러|controller|리포지토리|repository|dto|테스트|test|보안|security|시큐리티|도커|docker|캐시|cache|마이그레이션|migration|api-?doc|erd|설정|config|gradle|pdca|루프|loop)$/i;
const STOPWORDS = /^(?:만들|만들어|생성|추가|제작|개발|도메인|기능|api|요청|설계|구현|작업)$/i;

const MAGIC_WORDS = ['!hotfix', '!prototype', '!bypass'];
const AMBIGUITY_THRESHOLD = 0.5;

// 기술 용어 패턴
const TECHNICAL_TERMS = /(?:entity|repository|service|controller|dto|api|crud|jpa|rest|http|sql|query|index|cache|auth|jwt|oauth|spring|gradle|docker|k8s|kubernetes|ci\/cd|pipeline|deploy|migration|flyway|querydsl|actuator|엔티티|리포지토리|서비스|컨트롤러|인덱스|캐시|인증|배포|마이그레이션)/i;
// 파일 경로 패턴
const FILE_PATH_PATTERN = /(?:\/|\\|\.java|\.kt|\.gradle|\.yml|\.yaml|\.properties|\.md|\.json|src\/|main\/|test\/|domain\/|common\/)/i;
// 스코프 한정 패턴
const SCOPE_PATTERN = /(?:에서|에게|으로|까지|부터|만|전체|모든|해당|이|그|저|특정|각|현재|기존)/;
// 구체적 명사 패턴 (PascalCase, camelCase, 한글 2글자 이상 명사)
const SPECIFIC_NOUN = /(?:[A-Z][a-z]+(?:[A-Z][a-z]+)+|[a-z]+[A-Z][a-zA-Z]*|[가-힣]{2,}(?:서비스|컨트롤러|엔티티|모듈|기능|시스템|관리|처리))/;

/**
 * 모호성 점수 계산 (0~1)
 * @param {string} prompt
 * @returns {number}
 */
function calculateAmbiguityScore(prompt) {
  if (!prompt || !prompt.trim()) return 0;

  const normalized = prompt.trim();
  let score = 0;

  // 파일 경로 없음 (+0.15)
  if (!FILE_PATH_PATTERN.test(normalized)) {
    score += 0.15;
  }

  // 기술 용어 없음 (+0.10)
  if (!TECHNICAL_TERMS.test(normalized)) {
    score += 0.10;
  }

  // 구체적 명사 없음 (+0.15)
  if (!SPECIFIC_NOUN.test(normalized) && !extractTarget(normalized)) {
    score += 0.15;
  }

  // 스코프 한정 없음 (+0.10)
  if (!SCOPE_PATTERN.test(normalized)) {
    score += 0.10;
  }

  // 복수 해석 가능 (+0.20)
  if (hasMultipleInterpretations(normalized)) {
    score += 0.20;
  }

  // 컨텍스트 충돌 (+0.15/건)
  const conflicts = countContextConflicts(normalized);
  score += conflicts * 0.15;

  // 짧은 요청 (+0.15)
  if (normalized.length <= 15) {
    score += 0.15;
  }

  return Math.min(score, 1.0);
}

/**
 * 복수 해석 가능 여부
 */
function hasMultipleInterpretations(text) {
  const lower = text.toLowerCase();
  // 동사만 있고 목적어가 불명확
  if (ACTION_VERBS.test(lower) && !extractTarget(lower)) return true;
  // "이거", "그거", "저거" 등 대명사만 사용
  if (/^(이거|그거|저거|이것|그것|저것|여기|거기)\s/.test(lower)) return true;
  return false;
}

/**
 * 컨텍스트 충돌 수
 */
function countContextConflicts(text) {
  const lower = text.toLowerCase();
  let conflicts = 0;
  // 상반된 지시 (예: "추가하고 삭제")
  if (/추가/.test(lower) && /삭제/.test(lower)) conflicts++;
  if (/생성/.test(lower) && /제거/.test(lower)) conflicts++;
  // 레이어 + 다른 레이어 혼재 (entity + controller 등 3개 이상)
  if (countLayers(lower) >= 3) conflicts++;
  return conflicts;
}

/**
 * 프롬프트 모호성 분석
 * @param {string} prompt
 * @returns {Object|null} - null이면 모호하지 않음
 */
function detectAmbiguity(prompt) {
  if (!prompt || !prompt.trim()) return null;

  const normalized = prompt.toLowerCase().trim();

  // Magic Word bypass
  for (const magic of MAGIC_WORDS) {
    if (normalized.startsWith(magic)) return null;
  }

  // 점수 기반 판정
  const score = calculateAmbiguityScore(prompt);

  if (score < AMBIGUITY_THRESHOLD) return null;

  // 하위 호환: 기존 형식의 clarification 반환
  if (mentionsLayerWithoutDomain(normalized)) {
    return {
      type: 'missing_domain',
      message: '도메인명을 지정해주세요. (예: User, Order, Product)',
      suggestions: [],
      score,
    };
  }

  if (isCreateLike(normalized) && !extractTarget(normalized)) {
    return {
      type: 'missing_target',
      message: '무엇을 만들까요? (예: User 엔티티, Order CRUD, 인증 시스템)',
      suggestions: ['/crud {DomainName}', '/entity {Name}', '/security'],
      score,
    };
  }

  const layerCount = countLayers(normalized);
  if (layerCount >= 3) {
    return {
      type: 'multiple_targets',
      message: '여러 항목을 한 번에 처리하려면 /crud를 사용하세요.',
      suggestions: ['/crud {DomainName}'],
      score,
    };
  }

  return {
    type: 'low_context',
    message: '요청 대상(도메인/파일/범위)을 조금 더 구체적으로 적어주세요.',
    suggestions: ['User 엔티티 생성', 'Order 도메인 CRUD', '/loop 테스트 통과'],
    score,
  };
}

function isCreateLike(text) {
  return ACTION_VERBS.test(text);
}

function extractTarget(text) {
  if (/(?:"(?:.*?)"|'(?:.*?)')/.test(text)) return true;

  const tokens = text.match(/[a-z]+(?:-[a-z]+)*|[가-힣]{2,}/gi) || [];
  return tokens.some(token => {
    if (STOPWORDS.test(token)) return false;
    if (LAYER_KEYWORDS.test(token)) return false;
    return token.length >= 2 && DOMAIN_KEYWORDS.test(token);
  });
}

function mentionsLayerWithoutDomain(text) {
  const hasLayer = /(엔티티|entity|서비스|service|컨트롤러|controller|리포지토리|repository|dto|테스트|test|보안|security|시큐리티|도커|docker|캐시|cache|마이그레이션|migration|api-?doc|erd|설정|config|gradle|pdca|루프|loop)/.test(text);
  return hasLayer && !extractTarget(text);
}

function countLayers(text) {
  const layerGroups = [
    ['엔티티', 'entity'],
    ['서비스', 'service'],
    ['컨트롤러', 'controller'],
    ['리포지토리', 'repository'],
    ['dto'],
    ['테스트', 'test'],
    ['보안', 'security'],
    ['도커', 'docker'],
    ['캐시', 'cache'],
    ['마이그레이션', 'migration'],
    ['erd'],
    ['설정', 'config'],
    ['루프', 'loop'],
  ];
  let count = 0;
  for (const group of layerGroups) {
    if (group.some(keyword => text.includes(keyword))) count++;
  }
  return count;
}

module.exports = { detectAmbiguity, calculateAmbiguityScore };
