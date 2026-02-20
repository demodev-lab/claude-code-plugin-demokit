/**
 * 의도 감지 트리거
 * 사용자 프롬프트에서 패턴 매칭으로 적절한 Skill/Agent를 결정
 */

const INTENT_PATTERNS = [
  {
    id: 'commit-push',
    patterns: [/^\/\s*commit-push\b/i, /\b커밋\s*[-\s]*푸시\b/i, /\bcommit[-\s]*push\b/i, /커밋하고\s*푸시/i],
    command: '/commit-push',
    description: '커밋 + 푸시',
    agent: null,
    isAlways: true,
  },
  {
    id: 'commit',
    patterns: [/^\/\s*commit\b/i, /커밋/i, /\bcommit\b/i],
    command: '/commit',
    description: '변경사항 커밋',
    agent: null,
    isAlways: false,
  },
  {
    id: 'push',
    patterns: [/^\/\s*push\b/i, /원격\s*푸시/i, /푸시/i, /\bgit\s+push\b/i],
    command: '/push',
    description: '원격 푸시',
    agent: null,
    isAlways: false,
  },
  {
    id: 'pr',
    patterns: [/^\/\s*pr\b/i, /\bpr\b|풀리퀘|풀리퀘스트|pull\s*request/i, /create\s+(a\s+)?pull\s*request/i],
    command: '/pr',
    description: 'PR 생성',
    agent: null,
    isAlways: true,
  },
  {
    id: 'help',
    patterns: [/^\/\s*help\b/i, /도움말|help|명령어\s*목록|사용법\s*조회/i],
    command: '/help',
    description: '도움말 조회',
    agent: null,
    isAlways: true,
  },
  {
    id: 'init',
    patterns: [/^\/\s*init\b/i, /프로젝트\s*초기화|init|프로젝트\s*감지/i, /스프링\s*부트\s*초기화/i],
    command: '/init',
    description: '프로젝트 초기화',
    agent: null,
    isAlways: true,
  },
  {
    id: 'config',
    patterns: [/^\/\s*config\b/i, /설정|config/i, /config\s+생성/i],
    command: '/config',
    description: 'Spring 설정 클래스 생성',
    agent: 'infra-expert',
    isAlways: true,
  },
  {
    id: 'entity',
    patterns: [/^\/\s*entity\b/i, /엔티티|entity/i, /도메인\s*(모델|클래스|객체)/i, /create\s+(a\s+)?(new\s+)?entity/i, /add\s+(a\s+)?domain\s+model/i, /make\s+(a\s+)?jpa\s+entity/i],
    command: '/entity',
    description: 'JPA Entity 생성',
    agent: 'domain-expert',
  },
  {
    id: 'repository',
    patterns: [/^\/\s*repository\b/i, /리포지토리|repository/i, /create\s+(a\s+)?repository/i, /add\s+(a\s+)?repo/i],
    command: '/repository',
    description: 'Repository 생성',
    agent: 'domain-expert',
  },
  {
    id: 'service',
    patterns: [/^\/\s*service\b/i, /서비스\s*(만들|생성|추가)/i, /service\s*(만들|생성|추가)/i, /비즈니스\s*로직/i, /implement\s+(the\s+)?business\s+logic/i],
    command: '/service',
    description: 'Service 레이어 생성',
    agent: 'service-expert',
  },
  {
    id: 'controller',
    patterns: [/^\/\s*controller\b/i, /컨트롤러|controller/i, /api\s*(만들|생성|추가)/i, /엔드포인트/i, /create\s+(a\s+)?controller/i, /add\s+(a\s+)?(rest\s+)?endpoint/i],
    command: '/controller',
    description: 'REST Controller 생성',
    agent: 'api-expert',
  },
  {
    id: 'dto',
    patterns: [/^\/\s*dto\b/i, /\bdto\b/i, /request|response\s*(객체|클래스)/i, /create\s+(a\s+)?dto/i, /add\s+(a\s+)?(request|response)\s+(class|record)/i],
    command: '/dto',
    description: 'DTO 생성',
    agent: 'api-expert',
  },
  {
    id: 'crud',
    patterns: [/^\/\s*crud\b/i, /crud|스캐폴드|scaffold/i, /전체\s*(만들|생성)/i, /scaffold\s+(a\s+)?domain/i, /generate\s+crud/i],
    command: '/crud',
    description: '도메인 CRUD 일괄 생성',
    agent: 'spring-architect',
    isAlways: true,
  },
  {
    id: 'review',
    patterns: [/^\/\s*review\b/i, /리뷰|review|검토/i, /review\s+(this|my|the)\s+code/i, /check\s+code\s+quality/i],
    command: '/review',
    description: '코드 리뷰',
    agent: 'code-reviewer',
    isAlways: true,
  },
  {
    id: 'test',
    patterns: [/^\/\s*test\b/i, /테스트|test/i, /write\s+tests?\s+for/i, /add\s+unit\s+tests?/i],
    command: '/test',
    description: '테스트 생성',
    agent: 'test-expert',
    isAlways: true,
  },
  {
    id: 'docker',
    patterns: [/^\/\s*docker\b/i, /도커|docker|컨테이너/i, /setup\s+docker/i, /containerize/i],
    command: '/docker',
    description: 'Docker 설정',
    agent: 'infra-expert',
  },
  {
    id: 'security',
    patterns: [/^\/\s*security\b/i, /시큐리티|security|인증|인가|jwt|oauth/i, /setup\s+(spring\s+)?security/i],
    command: '/security',
    description: 'Spring Security 설정',
    agent: 'security-expert',
  },
  {
    id: 'exception',
    patterns: [/^\/\s*exception\b/i, /예외|exception|에러\s*처리/i, /setup\s+error\s+handling/i],
    command: '/exception',
    description: '예외 처리 설정',
    agent: 'api-expert',
  },
  {
    id: 'cache',
    patterns: [/^\/\s*cache\b/i, /캐시|cache|redis/i, /caffeine|캐시\s*전략/i],
    command: '/cache',
    description: '캐싱 전략',
    agent: 'infra-expert',
  },
  {
    id: 'api-docs',
    patterns: [/^\/\s*api-docs\b/i, /api[-\s]*docs|스프링독|springdoc|swagger/i, /api\s*문서/i],
    command: '/api-docs',
    description: 'API 문서화 설정',
    agent: 'api-expert',
  },
  {
    id: 'erd',
    patterns: [/^\/\s*erd\b/i, /erd|다이어그램|엔티티\s*관계/i, /entity\s+relationship\s+diagram/i],
    command: '/erd',
    description: 'ERD 다이어그램 생성',
    agent: 'domain-expert',
  },
  {
    id: 'migration',
    patterns: [/^\/\s*migration\b/i, /마이그레이션|migration|flyway|liquibase/i, /add\s+(db\s+)?migration/i],
    command: '/migration',
    description: 'DB 마이그레이션',
    agent: 'domain-expert',
  },
  {
    id: 'gradle',
    patterns: [/^\/\s*gradle\b/i, /gradle|의존성|dependency/i, /add\s+(.*)\s+dependency/i, /setup\s+gradle/i],
    command: '/gradle',
    description: 'Gradle 의존성 관리',
    agent: 'infra-expert',
  },
  {
    id: 'changelog',
    patterns: [/^\/\s*changelog\b/i, /changelog|변경\s*로그|릴리즈\s*노트/i, /release\s+notes/i],
    command: '/changelog',
    description: '변경 로그 생성',
    agent: 'infra-expert',
  },
  {
    id: 'optimize',
    patterns: [/^\/\s*optimize\b/i, /최적화|optimize|n\+1|인덱스/i, /성능\s*(분석|개선)/i],
    command: '/optimize',
    description: '성능 최적화 분석',
    agent: 'domain-expert',
  },
  {
    id: 'properties',
    patterns: [/^\/\s*properties\b/i, /application\.yml|application\.properties|application\s*설정/i, /configure\s+(spring\s+)?properties/i],
    command: '/properties',
    description: 'Spring 설정 파일 관리',
    agent: 'infra-expert',
  },
  {
    id: 'pdca',
    patterns: [/^\/\s*pdca\b/i, /\bpdca\b/i, /^\/\s*(?:plan|design|do|analyz|iterate|report|status|next|archive|cleanup)\b(?!-)/i],
    command: '/pdca',
    description: 'PDCA 워크플로우',
    agent: 'spring-architect',
    isAlways: true,
  },
  {
    id: 'superwork',
    patterns: [/^\/\s*superwork\b/i],
    command: '/superwork',
    description: 'Superwork 팀 오케스트레이션 엔진',
    agent: 'spring-architect',
    isAlways: true,
  },
  {
    id: 'loop',
    patterns: [/^\/\s*loop\b/i, /루프|loop|반복\s*(실행|수행|돌려)/i, /자동\s*(반복|루프)/i, /run\s+in\s+(a\s+)?loop/i],
    command: '/loop',
    description: '자율 반복 루프',
    agent: null,
    isAlways: true,
  },
  {
    id: 'cancel-loop',
    patterns: [/^\/\s*cancel-loop\b/i, /루프\s*취소|loop\s*cancel/i, /루프\s*중지/i],
    command: '/cancel-loop',
    description: '루프 취소',
    agent: null,
    isAlways: true,
  },
  {
    id: 'plan-plus',
    patterns: [/^\/\s*plan-plus\b/i, /브레인스토밍|강화\s*계획|plan[-\s]*plus/i, /요구사항\s*분석/i],
    command: '/plan-plus',
    description: '브레인스토밍 강화 계획',
    agent: 'spring-architect',
    isAlways: true,
  },
  {
    id: 'pipeline',
    patterns: [/^\/\s*pipeline\b/i, /파이프라인|pipeline|9단계/i, /개발\s*파이프라인/i],
    command: '/pipeline',
    description: '9단계 개발 파이프라인',
    agent: 'spring-architect',
    isAlways: true,
  },
  {
    id: 'qa',
    patterns: [/^\/\s*qa\b/i, /품질\s*분석|빌드\s*분석|로그\s*분석|테스트\s*리포트/i],
    command: '/qa',
    description: 'Zero-Script QA',
    agent: 'qa-monitor',
    isAlways: true,
  },
];

function matchIntent(prompt) {
  if (!prompt || !prompt.trim()) return null;
  const normalized = prompt.toLowerCase();
  const hasActionVerb = /만들|생성|추가|설정|구현|작성|세팅|create|add|generate|make|build|implement|setup|configure|scaffold|write/i.test(normalized);
  const isStrongPattern = /(crud|스캐폴드|리뷰|review|pdca|루프|loop|커밋|commit|푸시|push|풀리퀘|erd|최적화|optimize|changelog|변경\s*로그|containerize|pull\s*request)/i.test(normalized);

  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (!pattern.test(normalized)) continue;

      if (intent.isAlways || isStrongPattern || hasActionVerb) {
        return intent;
      }
    }
  }

  return null;
}

module.exports = { matchIntent, INTENT_PATTERNS };
