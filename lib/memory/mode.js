/**
 * Mode System
 * Spring Boot 도메인 특화 observation type/concept 자동 분류
 *
 * Observation Types: entity-change, api-change, config-change,
 *   test-result, build-result, discovery, decision, refactor
 *
 * Concepts: spring-pattern, jpa-gotcha, security-concern,
 *   performance-issue, how-it-works, what-changed
 */

const FILE_RULES = [
  { pattern: /Entity\.java$/, type: 'entity-change', concepts: ['spring-pattern'] },
  { pattern: /Repository(Custom|Impl)?\.java$/, type: 'entity-change', concepts: ['spring-pattern', 'jpa-gotcha'] },
  { pattern: /Service\.java$/, type: 'api-change', concepts: ['spring-pattern'] },
  { pattern: /Controller\.java$/, type: 'api-change', concepts: ['spring-pattern'] },
  { pattern: /Security.*\.java$/, type: 'config-change', concepts: ['security-concern'] },
  { pattern: /(Config|Configuration)\.java$/, type: 'config-change', concepts: ['spring-pattern'] },
  { pattern: /(Dto|Request|Response)\.java$/, type: 'api-change', concepts: ['spring-pattern'] },
  { pattern: /Test\.java$/, type: 'test-result', concepts: [] },
  { pattern: /\.sql$/, type: 'entity-change', concepts: ['jpa-gotcha'] },
  { pattern: /application.*\.(yml|yaml|properties)$/, type: 'config-change', concepts: [] },
  { pattern: /build\.gradle(\.kts)?$/, type: 'config-change', concepts: [] },
  { pattern: /(Dockerfile|docker-compose)/, type: 'config-change', concepts: [] },
  { pattern: /Exception\.java$/, type: 'api-change', concepts: ['spring-pattern'] },
  { pattern: /(Interceptor|Filter|Aspect).*\.java$/, type: 'config-change', concepts: ['spring-pattern'] },
  { pattern: /migration.*\.sql$/i, type: 'entity-change', concepts: ['jpa-gotcha'] },
  { pattern: /index.*\.(html|tsx?|jsx?)$/, type: 'config-change', concepts: [] },
];

const COMMAND_RULES = [
  { pattern: /gradlew\s+(test|check)/, type: 'test-result', concepts: [] },
  { pattern: /gradlew\s+(build|assemble|jar|bootJar)/, type: 'build-result', concepts: [] },
  { pattern: /gradlew\s+bootRun/, type: 'build-result', concepts: [] },
  { pattern: /npm\s+(test|run\s+test)/, type: 'test-result', concepts: [] },
  { pattern: /npm\s+(run\s+)?build/, type: 'build-result', concepts: [] },
  { pattern: /docker\s+(build|compose|run)/, type: 'config-change', concepts: [] },
  { pattern: /git\s+(log|diff|show|blame)/, type: 'discovery', concepts: ['how-it-works'] },
  { pattern: /curl|httpie|wget/, type: 'discovery', concepts: [] },
];

/**
 * 파일 경로 기반 observation 분류
 * @param {string} filePath
 * @returns {{ observationType: string, concepts: string[] }}
 */
function classifyFile(filePath) {
  if (!filePath) return { observationType: 'discovery', concepts: [] };

  for (const rule of FILE_RULES) {
    if (rule.pattern.test(filePath)) {
      return { observationType: rule.type, concepts: [...rule.concepts] };
    }
  }

  // 기본 분류: Java 파일이면 what-changed, 그 외 discovery
  if (/\.java$/.test(filePath)) {
    return { observationType: 'refactor', concepts: ['what-changed'] };
  }
  return { observationType: 'discovery', concepts: ['what-changed'] };
}

/**
 * Bash 명령 기반 observation 분류
 * @param {string} command
 * @param {number} exitCode
 * @returns {{ observationType: string, concepts: string[] }}
 */
function classifyCommand(command, exitCode) {
  if (!command) return { observationType: 'discovery', concepts: [] };

  for (const rule of COMMAND_RULES) {
    if (rule.pattern.test(command)) {
      const concepts = [...rule.concepts];
      if (exitCode != null && exitCode !== 0 && rule.type === 'test-result') {
        concepts.push('test-failure');
      } else if (exitCode != null && exitCode !== 0 && rule.type === 'build-result') {
        concepts.push('build-failure');
      }
      return { observationType: rule.type, concepts };
    }
  }

  return { observationType: 'discovery', concepts: [] };
}

/**
 * Skill 실행 분류
 * @param {string} skillName
 * @returns {{ observationType: string, concepts: string[] }}
 */
function classifySkill(skillName) {
  const SKILL_MAP = {
    entity: { type: 'entity-change', concepts: ['spring-pattern'] },
    repository: { type: 'entity-change', concepts: ['spring-pattern', 'jpa-gotcha'] },
    service: { type: 'api-change', concepts: ['spring-pattern'] },
    controller: { type: 'api-change', concepts: ['spring-pattern'] },
    dto: { type: 'api-change', concepts: ['spring-pattern'] },
    crud: { type: 'api-change', concepts: ['spring-pattern'] },
    security: { type: 'config-change', concepts: ['security-concern'] },
    config: { type: 'config-change', concepts: ['spring-pattern'] },
    test: { type: 'test-result', concepts: [] },
    docker: { type: 'config-change', concepts: [] },
    gradle: { type: 'config-change', concepts: [] },
    optimize: { type: 'refactor', concepts: ['performance-issue'] },
    review: { type: 'discovery', concepts: ['how-it-works'] },
    exception: { type: 'api-change', concepts: ['spring-pattern'] },
    migration: { type: 'entity-change', concepts: ['jpa-gotcha'] },
  };

  const mapped = SKILL_MAP[skillName];
  if (mapped) return { observationType: mapped.type, concepts: [...mapped.concepts] };
  return { observationType: 'discovery', concepts: [] };
}

/**
 * 범용 분류 (entry의 type 필드 기반 dispatch)
 */
function classify(entry) {
  if (entry.type === 'write') return classifyFile(entry.file);
  if (entry.type === 'bash') return classifyCommand(entry.command, entry.exitCode);
  if (entry.type === 'skill') return classifySkill(entry.skill);
  return { observationType: 'discovery', concepts: [] };
}

module.exports = {
  classifyFile,
  classifyCommand,
  classifySkill,
  classify,
};
