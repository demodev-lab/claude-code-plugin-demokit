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

/**
 * 프롬프트 길이 기반 작업 규모 분류
 * @returns {{ size: string, label: string, suggestPdca: boolean }}
 */
function classifyBySize(prompt) {
  let thresholds, labels;
  try {
    const { loadConfig } = require('../core/config');
    const config = loadConfig();
    thresholds = config.taskClassification?.thresholds;
    labels = config.taskClassification?.labels;
  } catch { /* config 로드 실패 시 기본값 */ }

  if (!thresholds) {
    thresholds = { quickFix: 50, minorChange: 200, feature: 500, majorFeature: 1000 };
  }
  if (!labels) {
    labels = {
      quickFix: 'Quick Fix',
      minorChange: 'Minor Change',
      feature: 'Feature (PDCA 권장)',
      majorFeature: 'Major Feature (PDCA 필수)',
    };
  }

  const len = (prompt || '').length;

  if (len >= thresholds.majorFeature) {
    return { size: 'majorFeature', label: labels.majorFeature, suggestPdca: true };
  }
  if (len >= thresholds.feature) {
    return { size: 'feature', label: labels.feature, suggestPdca: true };
  }
  if (len >= thresholds.minorChange) {
    return { size: 'minorChange', label: labels.minorChange, suggestPdca: false };
  }
  return { size: 'quickFix', label: labels.quickFix, suggestPdca: false };
}

module.exports = { classifyTask, decomposeCrud, classifyBySize, TASK_TYPES };
