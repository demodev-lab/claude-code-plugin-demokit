/**
 * Context Compaction Hook
 * 컨텍스트 압축 전 중요 상태를 보존
 *
 * 1. context.md에 전체 상태 스냅샷 저장 (영구)
 * 2. systemMessage로 핵심 상태 반환 (Claude 메모리)
 *
 * 보존 항목:
 * - PDCA 현재 상태 (feature, phase)
 * - Loop 상태 (active, iteration, prompt)
 * - 프로젝트 분석 결과 (basePackage, level, domains)
 * - 마지막 작업 컨텍스트
 */
const path = require('path');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData = {};
  try {
    hookData = JSON.parse(input);
  } catch { /* ignore */ }

  const { platform, cache } = require(path.join(__dirname, '..', 'lib', 'core'));
  const projectRoot = platform.findProjectRoot(process.cwd());

  if (!projectRoot) {
    console.log(JSON.stringify({}));
    return;
  }

  const stateLines = ['[demokit] 컨텍스트 보존 상태:'];

  // 프로젝트 정보
  const project = cache.get('project');
  const gradle = cache.get('gradle');
  const level = cache.get('level');

  if (project || gradle) {
    stateLines.push('');
    stateLines.push('## 프로젝트');
    if (gradle) {
      stateLines.push(`- Spring Boot: ${gradle.springBootVersion || '?'}`);
      stateLines.push(`- Java: ${gradle.javaVersion || '?'}`);
    }
    if (project) {
      stateLines.push(`- Base Package: ${project.basePackage || '?'}`);
    }
    if (level) {
      stateLines.push(`- 레벨: ${level}`);
    }
  }

  // PDCA 상태
  let pdcaFeatures = [];
  try {
    const { status: pdcaStatus } = require(path.join(__dirname, '..', 'lib', 'pdca'));
    pdcaFeatures = pdcaStatus.listFeatures(projectRoot);
    if (pdcaFeatures.length > 0) {
      stateLines.push('');
      stateLines.push('## PDCA');
      pdcaFeatures.forEach(f => {
        stateLines.push(`- ${f.feature}: ${f.currentPhase}`);
      });
    }
  } catch { /* ignore */ }

  // Loop 상태
  let loopStateData = { active: false };
  try {
    const loopState = require(path.join(__dirname, '..', 'lib', 'loop', 'state'));
    loopStateData = loopState.getState(projectRoot);
    if (loopStateData.active) {
      stateLines.push('');
      stateLines.push('## Loop');
      stateLines.push(`- 반복: ${loopStateData.currentIteration}/${loopStateData.maxIterations}`);
      stateLines.push(`- 프롬프트: ${loopStateData.prompt}`);
      stateLines.push(`- 완료 신호: ${loopStateData.completionPromise}`);
    }
  } catch { /* ignore */ }

  // 도메인 목록
  let domains = [];
  try {
    const { projectAnalyzer } = require(path.join(__dirname, '..', 'lib', 'spring'));
    const projectInfo = projectAnalyzer.analyzeProject(projectRoot);
    domains = projectInfo.domains || [];
    if (domains.length > 0) {
      stateLines.push('');
      stateLines.push('## 도메인');
      stateLines.push(`- ${domains.join(', ')}`);
    }
  } catch { /* ignore */ }

  // context.md에 이전 컨텍스트가 있으면 참조 안내
  stateLines.push('');
  stateLines.push('## 참조');
  stateLines.push('- 이전 작업 이력: .demodev/context.md');
  if (loopStateData.active) {
    stateLines.push('- 루프 로그: .demodev/loop-log.md');
  }

  // context.md에 전체 상태 스냅샷 영구 저장
  try {
    const { writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
    writer.saveContext(projectRoot, {
      gradle,
      project,
      level,
      pdcaFeatures,
      loopState: loopStateData,
      domains,
      currentTask: {
        description: '컨텍스트 압축',
        status: 'compacting',
      },
      recentChanges: ['컨텍스트 압축 발생 - 상태 스냅샷 저장'],
    });
  } catch (err) {
    process.stderr.write(`[demokit] context.md 저장 실패: ${err.message}\n`);
  }

  console.log(JSON.stringify({
    systemMessage: stateLines.join('\n'),
  }));
}

main().catch(err => {
  console.error(`[demokit] context-compaction 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
