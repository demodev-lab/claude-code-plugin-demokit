/**
 * 의존성 기반 프로젝트 특성 감지
 * build.gradle 의존성 목록을 분석하여 프로젝트에서 사용하는 기술 스택 판별
 */

const FEATURE_MAP = {
  security: {
    dependencies: ['spring-boot-starter-security', 'spring-security'],
    description: 'Spring Security 인증/인가',
  },
  oauth2: {
    dependencies: ['spring-boot-starter-oauth2', 'oauth2-resource-server', 'oauth2-client'],
    description: 'OAuth2 인증',
  },
  jpa: {
    dependencies: ['spring-boot-starter-data-jpa', 'hibernate-core'],
    description: 'JPA/Hibernate ORM',
  },
  querydsl: {
    dependencies: ['querydsl-jpa', 'querydsl-apt'],
    description: 'QueryDSL 동적 쿼리',
  },
  redis: {
    dependencies: ['spring-boot-starter-data-redis', 'lettuce-core', 'jedis'],
    description: 'Redis 캐시/세션',
  },
  kafka: {
    dependencies: ['spring-kafka', 'spring-boot-starter-kafka'],
    description: 'Apache Kafka 메시징',
  },
  webflux: {
    dependencies: ['spring-boot-starter-webflux'],
    description: 'WebFlux 리액티브',
  },
  validation: {
    dependencies: ['spring-boot-starter-validation'],
    description: 'Bean Validation',
  },
  actuator: {
    dependencies: ['spring-boot-starter-actuator'],
    description: 'Actuator 모니터링',
  },
  flyway: {
    dependencies: ['flyway-core', 'flyway-mysql'],
    description: 'Flyway DB 마이그레이션',
  },
  liquibase: {
    dependencies: ['liquibase-core'],
    description: 'Liquibase DB 마이그레이션',
  },
  testcontainers: {
    dependencies: ['testcontainers', 'spring-boot-testcontainers'],
    description: 'Testcontainers 통합 테스트',
  },
  springdoc: {
    dependencies: ['springdoc-openapi'],
    description: 'SpringDoc API 문서',
  },
  docker: {
    dependencies: ['spring-boot-docker-compose'],
    description: 'Docker Compose 통합',
  },
};

/**
 * 의존성 목록에서 프로젝트 특성 감지
 * @param {string[]} dependencies - 의존성 문자열 목록
 * @returns {Object[]} 감지된 특성 목록
 */
function detectFeatures(dependencies) {
  const depsLower = dependencies.map(d => d.toLowerCase());
  const detected = [];

  for (const [feature, config] of Object.entries(FEATURE_MAP)) {
    const found = config.dependencies.some(dep =>
      depsLower.some(d => d.includes(dep.toLowerCase()))
    );
    if (found) {
      detected.push({ feature, description: config.description });
    }
  }

  return detected;
}

/**
 * 누락된 권장 의존성 확인
 */
function checkMissingRecommended(dependencies) {
  const recommended = [
    { dep: 'spring-boot-starter-validation', reason: 'Bean Validation (@Valid, @NotBlank 등)' },
    { dep: 'spring-boot-starter-actuator', reason: 'Health check, 모니터링' },
  ];

  const depsLower = dependencies.map(d => d.toLowerCase());
  return recommended.filter(r =>
    !depsLower.some(d => d.includes(r.dep))
  );
}

/**
 * QueryDSL 의존성이 올바른 fork인지 확인
 */
function checkQuerydslFork(dependencies) {
  const hasOldQuerydsl = dependencies.some(d =>
    d.includes('com.querydsl') && !d.includes('openfeign')
  );
  const hasNewQuerydsl = dependencies.some(d =>
    d.includes('io.github.openfeign.querydsl')
  );

  if (hasOldQuerydsl && !hasNewQuerydsl) {
    return {
      issue: true,
      message: 'com.querydsl 사용 중 → io.github.openfeign.querydsl (보안 패치 fork)로 전환 필요',
    };
  }
  return { issue: false };
}

module.exports = { detectFeatures, checkMissingRecommended, checkQuerydslFork, FEATURE_MAP };
