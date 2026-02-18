/**
 * Task Chain Builder
 * CRUD / PDCA 작업 체인 자동 생성 (의존성 포함)
 */

/**
 * CRUD 도메인 체인 생성
 * Entity → Repository → Service → DTO → Controller → Test
 */
function buildCrudChain(domainName) {
  const tasks = [
    { id: `${domainName}-entity`, subject: `${domainName} Entity 생성`, skill: 'entity', order: 1 },
    { id: `${domainName}-repository`, subject: `${domainName} Repository 생성`, skill: 'repository', order: 2 },
    { id: `${domainName}-service`, subject: `${domainName} Service 생성`, skill: 'service', order: 3 },
    { id: `${domainName}-dto`, subject: `${domainName} DTO 생성`, skill: 'dto', order: 4 },
    { id: `${domainName}-controller`, subject: `${domainName} Controller 생성`, skill: 'controller', order: 5 },
    { id: `${domainName}-test`, subject: `${domainName} Test 생성`, skill: 'test', order: 6 },
  ];

  // 의존성 설정: 각 태스크는 이전 태스크에 의존
  for (let i = 1; i < tasks.length; i++) {
    tasks[i].blockedBy = [tasks[i - 1].id];
  }

  return tasks;
}

/**
 * PDCA 워크플로우 체인 생성
 * Plan → Design → Do → Analyze → Iterate → Report
 */
function buildPdcaChain(featureName) {
  const tasks = [
    { id: `${featureName}-plan`, subject: `${featureName} Plan`, skill: 'pdca', args: `plan ${featureName}`, order: 1 },
    { id: `${featureName}-design`, subject: `${featureName} Design`, skill: 'pdca', args: `design ${featureName}`, order: 2 },
    { id: `${featureName}-do`, subject: `${featureName} Do`, skill: 'pdca', args: `do ${featureName}`, order: 3 },
    { id: `${featureName}-analyze`, subject: `${featureName} Analyze`, skill: 'pdca', args: `analyze ${featureName}`, order: 4 },
    { id: `${featureName}-iterate`, subject: `${featureName} Iterate`, skill: 'pdca', args: `iterate ${featureName}`, order: 5 },
    { id: `${featureName}-report`, subject: `${featureName} Report`, skill: 'pdca', args: `report ${featureName}`, order: 6 },
  ];

  for (let i = 1; i < tasks.length; i++) {
    tasks[i].blockedBy = [tasks[i - 1].id];
  }

  return tasks;
}

module.exports = { buildCrudChain, buildPdcaChain };
