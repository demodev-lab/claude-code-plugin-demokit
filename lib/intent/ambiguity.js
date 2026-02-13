/**
 * 모호성 감지
 * 사용자 프롬프트가 모호한 경우 명확화 질문 생성
 */

const ACTION_VERBS = /(만들어|생성|추가|작성|구현|수정|변경|설정|삭제|리팩토링|리뷰|분석|테스트|테스트해)/i;
const DOMAIN_KEYWORDS = /[A-Z][a-zA-Z0-9]+(?:[A-Z][a-zA-Z0-9]+)*|[a-z]+(?:-[a-z]+)+|[가-힣]{2,}/i;
const LAYER_KEYWORDS = /^(?:엔티티|entity|서비스|service|컨트롤러|controller|리포지토리|repository|dto|테스트|test|보안|security|시큐리티|도커|docker|캐시|cache|마이그레이션|migration|api-?doc|erd|설정|config|gradle|pdca|루프|loop)$/i;
const STOPWORDS = /^(?:만들|만들어|생성|추가|제작|개발|도메인|기능|api|요청|설계|구현|작업)$/i;

/**
 * 프롬프트 모호성 분석
 * @param {string} prompt
 * @returns {Object|null}
 */
function detectAmbiguity(prompt) {
  if (!prompt || !prompt.trim()) return null;

  const normalized = prompt.toLowerCase().trim();

  if (mentionsLayerWithoutDomain(normalized)) {
    return {
      type: 'missing_domain',
      message: '도메인명을 지정해주세요. (예: User, Order, Product)',
      suggestions: [],
    };
  }

  if (isCreateLike(normalized) && !extractTarget(normalized)) {
    return {
      type: 'missing_target',
      message: '무엇을 만들까요? (예: User 엔티티, Order CRUD, 인증 시스템)',
      suggestions: ['/crud {DomainName}', '/entity {Name}', '/security'],
    };
  }

  const layerCount = countLayers(normalized);
  if (layerCount >= 3) {
    return {
      type: 'multiple_targets',
      message: '여러 항목을 한 번에 처리하려면 /crud를 사용하세요.',
      suggestions: ['/crud {DomainName}'],
    };
  }

  if (isVeryShortWithoutDetails(normalized)) {
    return {
      type: 'low_context',
      message: '요청 대상(도메인/파일/범위)을 조금 더 구체적으로 적어주세요.',
      suggestions: ['User 엔티티 생성', 'Order 도메인 CRUD', '/loop 테스트 통과'],
    };
  }

  return null;
}

function isCreateLike(text) {
  return ACTION_VERBS.test(text);
}

function extractTarget(text) {
  if (/(?:\"(?:.*?)\"|'(?:.*?)')/.test(text)) return true;

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
  const layerKeywords = [
    '엔티티', 'entity',
    '서비스', 'service',
    '컨트롤러', 'controller',
    '리포지토리', 'repository',
    'dto',
    '테스트', 'test',
    '보안', 'security',
    '도커', 'docker',
    '캐시', 'cache',
    '마이그레이션', 'migration',
    'erd',
    '설정', 'config',
    '루프', 'loop',
  ];
  const seen = new Set();
  for (const keyword of layerKeywords) {
    if (text.includes(keyword)) seen.add(keyword);
  }
  return seen.size;
}

function isVeryShortWithoutDetails(text) {
  return text.length <= 8 && !extractTarget(text) && /[가-힣]|[a-z]/.test(text);
}

module.exports = { detectAmbiguity };
