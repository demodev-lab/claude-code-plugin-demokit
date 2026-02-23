/**
 * Work Pod — Protocol 기반 4역할 시스템
 * 단일 subagent가 Navigator → Dev → Executor → QA 순서로 수행
 */

const LAYER_POD_MAP = {
  entity:     { navigator: 'spring-architect', dev: 'domain-expert',    executor: 'test-expert', qa: 'code-reviewer' },
  dto:        { navigator: 'spring-architect', dev: 'report-generator', executor: 'test-expert', qa: 'code-reviewer' },
  config:     { navigator: 'spring-architect', dev: 'spring-architect', executor: 'test-expert', qa: 'security-expert' },
  exception:  { navigator: 'spring-architect', dev: 'security-expert',  executor: 'test-expert', qa: 'code-reviewer' },
  repository: { navigator: 'spring-architect', dev: 'dba-expert',       executor: 'test-expert', qa: 'code-reviewer' },
  service:    { navigator: 'spring-architect', dev: 'service-expert',   executor: 'test-expert', qa: 'code-reviewer' },
  controller: { navigator: 'spring-architect', dev: 'api-expert',      executor: 'test-expert', qa: 'code-reviewer' },
  test:       { navigator: 'spring-architect', dev: 'test-expert',     executor: 'test-expert', qa: 'qa-monitor' },
};

const POD_LEVEL_PROFILES = {
  Starter:      { activeRoles: [] },
  SingleModule: { activeRoles: ['navigator', 'dev', 'executor', 'qa'] },
  MultiModule:  { activeRoles: ['navigator', 'dev', 'executor', 'qa'] },
  Monolith:     { activeRoles: ['navigator', 'dev', 'executor', 'qa'] },
  MSA:          { activeRoles: ['navigator', 'dev', 'executor', 'qa'] },
};

/**
 * task에 대한 pod 구성 반환
 * @param {string} layer
 * @param {string} level
 * @returns {{ navigator: string, dev: string, executor: string, qa: string, activeRoles: string[] } | null}
 */
function resolvePodForTask(layer, level) {
  if (!layer || !level) return null;

  const normalizedLayer = layer.toLowerCase();
  const pod = LAYER_POD_MAP[normalizedLayer];
  if (!pod) return null;

  const profile = POD_LEVEL_PROFILES[level];
  if (!profile || profile.activeRoles.length === 0) return null;

  return {
    navigator: pod.navigator,
    dev: pod.dev,
    executor: pod.executor,
    qa: pod.qa,
    activeRoles: profile.activeRoles.slice(),
  };
}

/**
 * pod protocol 마크다운 생성
 * @param {string} layer
 * @param {string} level
 * @param {{ verifyCmd?: string }} [options]
 * @returns {string|null}
 */
function buildPodProtocol(layer, level, options) {
  const pod = resolvePodForTask(layer, level);
  if (!pod) return null;

  const verifyCmd = options?.verifyCmd;

  const lines = [];
  lines.push('#### Work Pod Protocol');
  lines.push('| Role | Agent | Step |');
  lines.push('|------|-------|------|');
  lines.push(`| Navigator | \`${pod.navigator}\` | 1. 구현 전 설계 검토 |`);
  lines.push(`| Dev | \`${pod.dev}\` | 2. 코드 구현 |`);
  lines.push(`| Executor | \`${pod.executor}\` | 3. 빌드/테스트 검증 |`);
  lines.push(`| QA | \`${pod.qa}\` | 4. 코드 리뷰 |`);
  lines.push('');
  lines.push(`Step 1 — Navigator: 설계 의도/인터페이스 확인, 네이밍/의존성/패키지 구조 체크`);
  lines.push(`Step 2 — Dev: OWN FILES 범위 내 구현, Step 1 설계 지침 준수`);

  if (verifyCmd) {
    lines.push(`Step 3 — Executor: \`${verifyCmd}\` 실행, 실패 시 Step 2 복귀 (최대 3회)`);
  } else {
    lines.push('Step 3 — Executor: 수동 검증 수행, 실패 시 Step 2 복귀 (최대 3회)');
  }

  lines.push('Step 4 — QA: 코드 품질/OWN FILES 위반 확인, 수정 필요 시 Step 2로');

  return lines.join('\n');
}

module.exports = {
  LAYER_POD_MAP,
  POD_LEVEL_PROFILES,
  resolvePodForTask,
  buildPodProtocol,
};
