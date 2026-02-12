/**
 * 의도 감지 트리거
 * 사용자 프롬프트에서 패턴 매칭으로 적절한 Skill/Agent를 결정
 */

const INTENT_PATTERNS = [
  {
    id: 'commit-push',
    patterns: [/커밋\s*[-]?\s*푸시/i, /commit[-\s]*push/i],
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
    patterns: [/\bpr\b|풀리퀘|풀리퀘스트|pull\s*request/i],
    command: '/pr',
    description: 'PR 생성',
    agent: null,
  },
  {
    id: 'entity',
    patterns: [/엔티티|entity/i, /도메인\s*(모델|클래스|객체)/i],
    command: '/entity',
    description: 'JPA Entity 생성',
    agent: 'domain-expert',
  },
  {
    id: 'repository',
    patterns: [/리포지토리|repository/i],
    command: '/repository',
    description: 'Repository 생성',
    agent: 'domain-expert',
  },
  {
    id: 'service',
    patterns: [/서비스\s*(만들|생성|추가)|service\s*(만들|생성|추가)/i, /비즈니스\s*로직/i],
    command: '/service',
    description: 'Service 레이어 생성',
    agent: 'service-expert',
  },
  {
    id: 'controller',
    patterns: [/컨트롤러|controller/i, /api\s*(만들|생성|추가)/i, /엔드포인트/i],
    command: '/controller',
    description: 'REST Controller 생성',
    agent: 'api-expert',
  },
  {
    id: 'dto',
    patterns: [/dto/i, /request|response\s*(객체|클래스)/i],
    command: '/dto',
    description: 'DTO 생성',
    agent: 'api-expert',
  },
  {
    id: 'crud',
    patterns: [/crud|스캐폴드|scaffold/i, /전체\s*(만들|생성)/i],
    command: '/crud',
    description: '도메인 CRUD 일괄 생성',
    agent: 'spring-architect',
  },
  {
    id: 'review',
    patterns: [/리뷰|review|검토/i],
    command: '/review',
    description: '코드 리뷰',
    agent: 'code-reviewer',
  },
  {
    id: 'test',
    patterns: [/테스트|test/i],
    command: '/test',
    description: '테스트 생성',
    agent: 'test-expert',
  },
  {
    id: 'docker',
    patterns: [/도커|docker|컨테이너/i],
    command: '/docker',
    description: 'Docker 설정',
    agent: 'infra-expert',
  },
  {
    id: 'security',
    patterns: [/시큐리티|security|인증|인가|jwt|oauth/i],
    command: '/security',
    description: 'Spring Security 설정',
    agent: 'security-expert',
  },
  {
    id: 'exception',
    patterns: [/예외|exception|에러\s*처리/i],
    command: '/exception',
    description: '예외 처리 설정',
    agent: 'api-expert',
  },
  {
    id: 'cache',
    patterns: [/캐시|cache|redis/i],
    command: '/cache',
    description: '캐싱 전략',
    agent: 'service-expert',
  },
  {
    id: 'migration',
    patterns: [/마이그레이션|migration|flyway|liquibase/i],
    command: '/migration',
    description: 'DB 마이그레이션',
    agent: 'domain-expert',
  },
  {
    id: 'gradle',
    patterns: [/gradle|의존성|dependency/i],
    command: '/gradle',
    description: 'Gradle 의존성 관리',
    agent: 'infra-expert',
  },
  {
    id: 'pdca',
    patterns: [/pdca/i],
    command: '/pdca',
    description: 'PDCA 워크플로우',
    agent: 'spring-architect',
  },
  {
    id: 'loop',
    patterns: [/루프|loop|반복\s*(실행|수행|돌려)/i, /자동\s*(반복|루프)/i],
    command: '/loop',
    description: '자율 반복 루프',
    agent: null,
  },
];

/**
 * 프롬프트에서 의도 매칭
 */
function matchIntent(prompt) {
  const hasActionVerb = /만들|생성|추가|설정|구현|작성|세팅/.test(prompt);
  const isStrongPattern = /crud|스캐폴드|리뷰|review|pdca|loop|루프|커밋|commit|푸시|push|\bpr\b|풀리퀘/.test(prompt.toLowerCase());

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
