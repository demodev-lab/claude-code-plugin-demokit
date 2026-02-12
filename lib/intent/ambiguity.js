/**
 * 모호성 감지
 * 사용자 프롬프트가 모호한 경우 명확화 질문 생성
 */

/**
 * 프롬프트 모호성 분석
 * @param {string} prompt
 * @returns {Object|null} 모호한 경우 clarification 정보, 명확한 경우 null
 */
function detectAmbiguity(prompt) {
  const normalized = prompt.toLowerCase().trim();

  // "만들어줘" 만 있고 대상이 없는 경우
  if (/만들어|생성해|추가해/.test(normalized) && !extractTarget(normalized)) {
    return {
      type: 'missing_target',
      message: '무엇을 만들까요? (예: User 엔티티, Order CRUD, 인증 시스템)',
      suggestions: ['/crud {DomainName}', '/entity {Name}', '/security'],
    };
  }

  // 도메인명 없이 계층만 지정한 경우
  if (/엔티티|서비스|컨트롤러/.test(normalized) && !hasDomainName(normalized)) {
    return {
      type: 'missing_domain',
      message: '도메인명을 지정해주세요. (예: User, Order, Product)',
      suggestions: [],
    };
  }

  // 여러 계층이 동시에 언급된 경우
  const layers = countLayers(normalized);
  if (layers > 2) {
    return {
      type: 'multiple_targets',
      message: '여러 항목을 한 번에 생성하시려면 /crud를 사용하세요.',
      suggestions: ['/crud {DomainName}'],
    };
  }

  return null;
}

function extractTarget(prompt) {
  return /엔티티|서비스|컨트롤러|리포지토리|dto|crud|테스트|보안|시큐리티|도커/.test(prompt);
}

function hasDomainName(prompt) {
  return /\b[A-Z][a-z]+\b/.test(prompt);
}

function countLayers(prompt) {
  const layerKeywords = ['엔티티', '서비스', '컨트롤러', '리포지토리', 'dto', '테스트'];
  return layerKeywords.filter(k => prompt.includes(k)).length;
}

module.exports = { detectAmbiguity };
