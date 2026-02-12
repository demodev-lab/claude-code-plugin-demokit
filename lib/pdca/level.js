/**
 * PDCA 수준 판별 (Monolith / MSA)
 * 프로젝트 레벨에 따라 PDCA 문서/가이드 스타일 분기
 */

const LEVELS = {
  Monolith: {
    outputStyle: 'demodev-monolith',
    characteristics: [
      '단일 애플리케이션',
      '단일 데이터베이스',
      '패키지 기반 레이어 분리',
    ],
    scaffoldStrategy: 'single-module',
  },
  MSA: {
    outputStyle: 'demodev-msa',
    characteristics: [
      '서비스 간 통신 (Feign/RestTemplate)',
      '서비스별 독립 데이터베이스',
      '멀티모듈 구조',
      'API Gateway',
    ],
    scaffoldStrategy: 'multi-module',
  },
};

/**
 * 레벨 정보 반환
 */
function getLevelInfo(level) {
  return LEVELS[level] || LEVELS.Monolith;
}

/**
 * 레벨에 맞는 output style 반환
 */
function getOutputStyle(level) {
  const info = getLevelInfo(level);
  return info.outputStyle;
}

/**
 * 레벨에 맞는 scaffold 전략 반환
 */
function getScaffoldStrategy(level) {
  const info = getLevelInfo(level);
  return info.scaffoldStrategy;
}

module.exports = { LEVELS, getLevelInfo, getOutputStyle, getScaffoldStrategy };
