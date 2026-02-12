/**
 * 언어 감지 유틸리티
 * 한국어/영어 프롬프트에서 도메인명, 동작, 대상을 추출
 */

/**
 * 프롬프트에서 도메인명 추출
 * "User 엔티티 만들어줘" → "User"
 * "주문 서비스 생성" → "Order" (매핑 필요 시 null)
 */
function extractDomainName(prompt) {
  // PascalCase 영어 단어 추출
  const pascalMatch = prompt.match(/\b([A-Z][a-z]+(?:[A-Z][a-z]+)*)\b/);
  if (pascalMatch) return pascalMatch[1];

  // camelCase 추출 후 PascalCase 변환
  const camelMatch = prompt.match(/\b([a-z]+(?:[A-Z][a-z]+)+)\b/);
  if (camelMatch) {
    return camelMatch[1].charAt(0).toUpperCase() + camelMatch[1].slice(1);
  }

  return null;
}

/**
 * 동작 동사 추출
 */
function extractAction(prompt) {
  const actions = {
    create: /만들|생성|추가|작성/,
    update: /수정|변경|업데이트/,
    delete: /삭제|제거/,
    review: /리뷰|검토|분석/,
    setup: /설정|세팅|구성|초기화/,
    test: /테스트|검증/,
  };

  for (const [action, pattern] of Object.entries(actions)) {
    if (pattern.test(prompt)) return action;
  }
  return 'create'; // 기본값
}

/**
 * 대상 계층 추출
 */
function extractLayer(prompt) {
  const layers = {
    entity: /엔티티|entity|도메인\s*모델/i,
    repository: /리포지토리|repository/i,
    service: /서비스|service/i,
    controller: /컨트롤러|controller|api/i,
    dto: /dto|request|response/i,
    test: /테스트|test/i,
    config: /설정|config/i,
    security: /시큐리티|security|인증|jwt/i,
  };

  for (const [layer, pattern] of Object.entries(layers)) {
    if (pattern.test(prompt)) return layer;
  }
  return null;
}

module.exports = { extractDomainName, extractAction, extractLayer };
