/**
 * PDCA 수준 판별 (SingleModule / MultiModule / MSA)
 * 프로젝트 레벨에 따라 PDCA 문서/가이드 스타일 분기
 */

const LEVELS = {
  Starter: {
    outputStyle: 'demodev-monolith',
    characteristics: [
      '초기 프로젝트',
      '기본 구조만 존재',
    ],
    scaffoldStrategy: 'single-module',
  },
  SingleModule: {
    outputStyle: 'demodev-monolith',
    characteristics: [
      '단일 애플리케이션',
      '단일 데이터베이스',
      '패키지 기반 레이어 분리',
    ],
    scaffoldStrategy: 'single-module',
  },
  MultiModule: {
    outputStyle: 'demodev-monolith',
    characteristics: [
      '멀티모듈 구조 (include 2개 이상)',
      '단일 데이터베이스 또는 모듈별 분리',
      'MSA 의존성 없음',
    ],
    scaffoldStrategy: 'multi-module',
  },
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
  return LEVELS[level] || LEVELS.SingleModule;
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
