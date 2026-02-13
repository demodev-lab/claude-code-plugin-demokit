/**
 * 의도 감지 트리거
 * 사용자 프롬프트에서 패턴 매칭으로 적절한 Skill/Agent를 결정
 */

const INTENT_PATTERNS = [
  {
    id: 'commit-push',
    patterns: [/커밋\s*[-]?\s*푸시/i, /commit[-\s]*push/i, /commit\s+and\s+push/i],
    command: '/commit-push',
    description: '커밋 + 푸시',
    agent: null,
  },
  {
    id: 'commit',
    patterns: [/커밋|commit/i],
    command: '/commit',
    description: '변경사항 커밋',
    agent: null,
  },
  {
    id: 'push',
    patterns: [/푸시|push/i],
    command: '/push',
    description: '원격 푸시',
    agent: null,
  },
  {
    id: 'pr',
    patterns: [/\bpr\b|풀리퀘|풀리퀘스트|pull\s*request/i, /create\s+(a\s+)?pull\s*request/i],
    command: '/pr',
    description: 'PR 생성',
    agent: null,
  },
  {
    id: 'entity',
    patterns: [/엔티티|entity/i, /도메인\s*(모델|클래스|객체)/i, /create\s+(a\s+)?(new\s+)?entity/i, /add\s+(a\s+)?domain\s+model/i, /make\s+(a\s+)?jpa\s+entity/i],
    command: '/entity',
    description: 'JPA Entity 생성',
    agent: 'domain-expert',
  },
  {
    id: 'repository',
    patterns: [/리포지토리|repository/i, /create\s+(a\s+)?repository/i, /add\s+(a\s+)?repo/i],
    command: '/repository',
    description: 'Repository 생성',
    agent: 'domain-expert',
  },
  {
    id: 'service',
    patterns: [/서비스\s*(만들|생성|추가)|service\s*(만들|생성|추가)/i, /비즈니스\s*로직/i, /create\s+(a\s+)?service\s+(layer|class)/i, /add\s+(a\s+)?service\s+for/i, /implement\s+(the\s+)?business\s+logic/i],
    command: '/service',
    description: 'Service 레이어 생성',
    agent: 'service-expert',
  },
  {
    id: 'controller',
    patterns: [/컨트롤러|controller/i, /api\s*(만들|생성|추가)/i, /엔드포인트/i, /create\s+(a\s+)?controller/i, /add\s+(a\s+)?(rest\s+)?endpoint/i, /build\s+(a\s+)?rest\s+api/i],
    command: '/controller',
    description: 'REST Controller 생성',
    agent: 'api-expert',
  },
  {
    id: 'dto',
    patterns: [/dto/i, /request|response\s*(객체|클래스)/i, /create\s+(a\s+)?dto/i, /add\s+(a\s+)?(request|response)\s+(class|record)/i],
    command: '/dto',
    description: 'DTO 생성',
    agent: 'api-expert',
  },
  {
    id: 'crud',
    patterns: [/crud|스캐폴드|scaffold/i, /전체\s*(만들|생성)/i, /scaffold\s+(a\s+)?domain/i, /generate\s+crud/i, /create\s+full\s+(domain|crud)/i],
    command: '/crud',
    description: '도메인 CRUD 일괄 생성',
    agent: 'spring-architect',
  },
  {
    id: 'review',
    patterns: [/리뷰|review|검토/i, /review\s+(this|my|the)\s+code/i, /check\s+code\s+quality/i, /code\s+review/i],
    command: '/review',
    description: '코드 리뷰',
    agent: 'code-reviewer',
  },
  {
    id: 'test',
    patterns: [/테스트|test/i, /write\s+tests?\s+for/i, /add\s+unit\s+tests?/i, /create\s+test\s+(cases?|class)/i, /generate\s+tests?/i],
    command: '/test',
    description: '테스트 생성',
    agent: 'test-expert',
  },
  {
    id: 'docker',
    patterns: [/도커|docker|컨테이너/i, /setup\s+docker/i, /add\s+docker\s*compose/i, /containerize/i],
    command: '/docker',
    description: 'Docker 설정',
    agent: 'infra-expert',
  },
  {
    id: 'security',
    patterns: [/시큐리티|security|인증|인가|jwt|oauth/i, /setup\s+(spring\s+)?security/i, /add\s+authentication/i, /configure\s+auth/i],
    command: '/security',
    description: 'Spring Security 설정',
    agent: 'security-expert',
  },
  {
    id: 'exception',
    patterns: [/예외|exception|에러\s*처리/i, /setup\s+error\s+handling/i, /add\s+exception\s+handler/i, /implement\s+global\s+exception/i],
    command: '/exception',
    description: '예외 처리 설정',
    agent: 'api-expert',
  },
  {
    id: 'cache',
    patterns: [/캐시|cache|redis/i, /setup\s+caching/i, /add\s+cache/i, /configure\s+redis/i],
    command: '/cache',
    description: '캐싱 전략',
    agent: 'service-expert',
  },
  {
    id: 'migration',
    patterns: [/마이그레이션|migration|flyway|liquibase/i, /add\s+(db\s+)?migration/i, /setup\s+flyway/i],
    command: '/migration',
    description: 'DB 마이그레이션',
    agent: 'domain-expert',
  },
  {
    id: 'gradle',
    patterns: [/gradle|의존성|dependency/i, /add\s+(a\s+)?dependency/i, /setup\s+gradle/i, /manage\s+dependencies/i],
    command: '/gradle',
    description: 'Gradle 의존성 관리',
    agent: 'infra-expert',
  },
  {
    id: 'pdca',
    patterns: [/pdca/i, /plan.+design.+do/i],
    command: '/pdca',
    description: 'PDCA 워크플로우',
    agent: 'spring-architect',
  },
  {
    id: 'loop',
    patterns: [/루프|loop|반복\s*(실행|수행|돌려)/i, /자동\s*(반복|루프)/i, /run\s+in\s+(a\s+)?loop/i, /auto\s*repeat/i],
    command: '/loop',
    description: '자율 반복 루프',
    agent: null,
  },
  {
    id: 'erd',
    patterns: [/erd|다이어그램|엔티티\s*관계/i, /er\s*다이어그램/i, /generate\s+(an?\s+)?erd/i, /entity\s+relationship\s+diagram/i],
    command: '/erd',
    description: 'ERD 다이어그램 생성',
    agent: 'domain-expert',
  },
  {
    id: 'optimize',
    patterns: [/최적화|optimize|n\+1|인덱스\s*(추가|분석)/i, /쿼리\s*최적화/i, /성능\s*(분석|개선)/i, /optimize\s+(the\s+)?(query|performance)/i, /fix\s+n\+1/i, /improve\s+performance/i],
    command: '/optimize',
    description: '성능 최적화 분석',
    agent: 'domain-expert',
  },
  {
    id: 'changelog',
    patterns: [/changelog|변경\s*로그|릴리즈\s*노트/i, /generate\s+(a\s+)?changelog/i, /release\s+notes/i],
    command: '/changelog',
    description: '변경 로그 생성',
    agent: null,
  },
  {
    id: 'properties',
    patterns: [/application\.yml|application\.properties|설정\s*파일/i, /configure\s+(spring\s+)?properties/i, /setup\s+application\s+config/i],
    command: '/properties',
    description: 'Spring Boot 설정 관리',
    agent: 'infra-expert',
  },
];

/**
 * 프롬프트에서 의도 매칭
 */
function matchIntent(prompt) {
  const hasActionVerb = /만들|생성|추가|설정|구현|작성|세팅|create|add|generate|make|build|implement|setup|configure|scaffold|write/.test(prompt);
  const isStrongPattern = /crud|스캐폴드|리뷰|review|pdca|loop|루프|커밋|commit|푸시|push|\bpr\b|풀리퀘|erd|최적화|optimize|changelog|변경\s*로그|scaffold|containerize|pull\s*request/.test(prompt.toLowerCase());

  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(prompt) && (hasActionVerb || isStrongPattern)) {
        return intent;
      }
    }
  }
  return null;
}

module.exports = { matchIntent, INTENT_PATTERNS };
