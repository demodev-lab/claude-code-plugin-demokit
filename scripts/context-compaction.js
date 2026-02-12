/**
 * Context Compaction Hook
 * 컨텍스트 압축 전 중요 상태를 보존
 *
 * 1. context.md에 전체 상태 스냅샷 저장 (영구)
 * 2. systemMessage로 핵심 상태 반환 (Claude 메모리)
 */
const path = require('path');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData = {};
  try {
    if (input && input.trim()) hookData = JSON.parse(input);
  } catch { /* ignore */ }

  const { platform, cache } = require(path.join(__dirname, '..', 'lib', 'core'));
  const projectRoot = platform.findProjectRoot(process.cwd());

  if (!projectRoot) {
    console.log(JSON.stringify({}));
    return;
  }

  // 공통 상태 수집
  const { snapshot, writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
  const state = snapshot.collectState(projectRoot, cache);

  const stateLines = ['[demokit] 컨텍스트 보존 상태:'];

  // 프로젝트 정보
  if (state.project || state.gradle) {
    stateLines.push('');
    stateLines.push('## 프로젝트');
    if (state.gradle) {
      stateLines.push(`- Spring Boot: ${state.gradle.springBootVersion || '?'}`);
      stateLines.push(`- Java: ${state.gradle.javaVersion || '?'}`);
    }
    if (state.project) {
      stateLines.push(`- Base Package: ${state.project.basePackage || '?'}`);
    }
    if (state.level) {
      stateLines.push(`- 레벨: ${state.level}`);
    }
  }

  // PDCA 상태
  if (state.pdcaFeatures.length > 0) {
    stateLines.push('');
    stateLines.push('## PDCA');
    state.pdcaFeatures.forEach(f => {
      stateLines.push(`- ${f.feature}: ${f.currentPhase}`);
    });
  }

  // Loop 상태
  if (state.loopState.active) {
    stateLines.push('');
    stateLines.push('## Loop');
    stateLines.push(`- 반복: ${state.loopState.currentIteration}/${state.loopState.maxIterations}`);
    stateLines.push(`- 프롬프트: ${state.loopState.prompt}`);
    stateLines.push(`- 완료 신호: ${state.loopState.completionPromise}`);
  }

  // 도메인 목록
  if (state.domains.length > 0) {
    stateLines.push('');
    stateLines.push('## 도메인');
    stateLines.push(`- ${state.domains.join(', ')}`);
  }

  // 참조
  stateLines.push('');
  stateLines.push('## 참조');
  stateLines.push('- 이전 작업 이력: .demodev/context.md');
  if (state.loopState.active) {
    stateLines.push('- 루프 로그: .demodev/loop-log.md');
  }

  // context.md에 전체 상태 스냅샷 영구 저장
  try {
    writer.saveContext(projectRoot, {
      ...state,
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
