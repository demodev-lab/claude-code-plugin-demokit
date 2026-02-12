/**
 * 작업 분류
 * 사용자 요청을 분석하여 적절한 Agent/Skill로 라우팅
 */

const TASK_TYPES = {
  'entity-creation': {
    agent: 'domain-expert',
    skill: 'entity',
    description: 'JPA Entity 생성',
    priority: 1,
  },
  'repository-creation': {
    agent: 'domain-expert',
    skill: 'repository',
    description: 'Repository 생성',
    priority: 2,
  },
  'service-creation': {
    agent: 'service-expert',
    skill: 'service',
    description: 'Service 레이어 생성',
    priority: 3,
  },
  'controller-creation': {
    agent: 'api-expert',
    skill: 'controller',
    description: 'Controller 생성',
    priority: 4,
  },
  'dto-creation': {
    agent: 'api-expert',
    skill: 'dto',
    description: 'DTO 생성',
    priority: 5,
  },
  'crud-scaffold': {
    agent: 'spring-architect',
    skill: 'crud',
    description: 'CRUD 일괄 생성',
    priority: 0,
  },
  'test-creation': {
    agent: 'test-expert',
    skill: 'test',
    description: '테스트 생성',
    priority: 6,
  },
  'code-review': {
    agent: 'code-reviewer',
    skill: 'review',
    description: '코드 리뷰',
    priority: 7,
  },
  'security-setup': {
    agent: 'security-expert',
    skill: 'security',
    description: 'Spring Security 설정',
    priority: 8,
  },
  'architecture-design': {
    agent: 'spring-architect',
    skill: 'pdca',
    description: '아키텍처 설계',
    priority: 0,
  },
  'gap-analysis': {
    agent: 'gap-detector',
    skill: 'pdca',
    description: '설계-구현 Gap 분석',
    priority: 9,
  },
  'infra-setup': {
    agent: 'infra-expert',
    skill: null,
    description: '인프라 설정',
    priority: 10,
  },
};

/**
 * 작업 유형 결정
 */
function classifyTask(intentId) {
  for (const [taskType, config] of Object.entries(TASK_TYPES)) {
    if (config.skill === intentId || taskType.startsWith(intentId)) {
      return { taskType, ...config };
    }
  }
  return null;
}

/**
 * CRUD scaffold를 개별 작업으로 분해
 */
function decomposeCrud(domainName) {
  return [
    { type: 'entity-creation', domain: domainName, order: 1 },
    { type: 'repository-creation', domain: domainName, order: 2 },
    { type: 'service-creation', domain: domainName, order: 3 },
    { type: 'dto-creation', domain: domainName, order: 4 },
    { type: 'controller-creation', domain: domainName, order: 5 },
    { type: 'test-creation', domain: domainName, order: 6 },
  ];
}

module.exports = { classifyTask, decomposeCrud, TASK_TYPES };
