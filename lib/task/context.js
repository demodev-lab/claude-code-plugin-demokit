/**
 * 작업 컨텍스트 관리
 * 현재 진행 중인 작업의 컨텍스트를 유지하고 전달
 */

/**
 * 작업 컨텍스트 구성
 */
function buildTaskContext({ projectRoot, gradle, project, level, feature, phase, skillName }) {
  return {
    project: {
      root: projectRoot,
      springBootVersion: gradle?.springBootVersion || null,
      javaVersion: gradle?.javaVersion || null,
      basePackage: project?.basePackage || null,
      level: level || 'Monolith',
      dependencies: gradle?.dependencies || [],
    },
    pdca: feature ? { feature, phase } : null,
    conventions: {
      packageStrategy: 'domain-based',
      dtoStyle: 'record',
      errorResponse: 'ProblemDetail',
      httpClient: 'WebClient',
      queryDsl: 'io.github.openfeign.querydsl',
    },
    _skillName: skillName || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Agent에 전달할 시스템 메시지 생성
 */
function buildAgentPrompt(context, taskDescription) {
  const lines = [
    `## 프로젝트 컨텍스트`,
    `- Spring Boot: ${context.project.springBootVersion || '?'}`,
    `- Java: ${context.project.javaVersion || '?'}`,
    `- Base Package: ${context.project.basePackage || '?'}`,
    `- 레벨: ${context.project.level}`,
    '',
    `## 컨벤션`,
    `- 패키지: 도메인 기반 (domain/{name}/{layer}/)`,
    `- DTO: Java record 필수`,
    `- 에러: ProblemDetail (RFC 9457)`,
    `- HTTP: WebClient`,
    `- QueryDSL: OpenFeign fork (io.github.openfeign.querydsl:6.12)`,
    '',
  ];

  if (context.pdca) {
    lines.push(`## PDCA`);
    lines.push(`- Feature: ${context.pdca.feature}`);
    lines.push(`- Phase: ${context.pdca.phase}`);
    lines.push('');
  }

  lines.push(`## 작업`);
  lines.push(taskDescription);

  const prompt = lines.join('\n');

  // import 컨텍스트 주입
  try {
    const { contextBuilder } = require('../import');
    const imported = contextBuilder.getSkillContext(context._skillName, context.project.root);
    if (imported) {
      return contextBuilder.mergeImportedContext(prompt, imported);
    }
  } catch { /* import 모듈 미로드 시 무시 */ }

  return prompt;
}

module.exports = { buildTaskContext, buildAgentPrompt };
