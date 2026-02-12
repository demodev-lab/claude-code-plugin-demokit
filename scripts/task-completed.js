/**
 * Task Completed Hook
 * Agent 작업 완료 시:
 * 1. context.md에 현재 상태 저장
 * 2. PDCA 자동 진행 및 다음 단계 안내
 * 3. Loop 활성이면 루프 상태 업데이트
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

  const hints = [];

  // 1. context.md 저장
  try {
    const { writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
    const gradle = cache.get('gradle');
    const project = cache.get('project');
    const level = cache.get('level');

    let pdcaFeatures = [];
    try {
      const { status: pdcaStatus } = require(path.join(__dirname, '..', 'lib', 'pdca'));
      pdcaFeatures = pdcaStatus.listFeatures(projectRoot);
    } catch { /* ignore */ }

    let loopState = { active: false };
    try {
      const loopMod = require(path.join(__dirname, '..', 'lib', 'loop', 'state'));
      loopState = loopMod.getState(projectRoot);
    } catch { /* ignore */ }

    let domains = [];
    try {
      const { projectAnalyzer } = require(path.join(__dirname, '..', 'lib', 'spring'));
      const projectInfo = projectAnalyzer.analyzeProject(projectRoot);
      domains = projectInfo.domains || [];
    } catch { /* ignore */ }

    // 작업 설명 추출 (hook 데이터에서)
    const taskDesc = hookData.task_description || hookData.tool_name || '작업 완료';

    writer.saveContext(projectRoot, {
      gradle,
      project,
      level,
      pdcaFeatures,
      loopState,
      domains,
      currentTask: {
        description: taskDesc,
        status: 'completed',
      },
      recentChanges: [taskDesc],
    });
  } catch (err) {
    // context 저장 실패해도 계속 진행
    process.stderr.write(`[demokit] context.md 저장 실패: ${err.message}\n`);
  }

  // 2. PDCA 진행 상태 확인
  try {
    const { status: pdcaStatus, phase: pdcaPhase } = require(path.join(__dirname, '..', 'lib', 'pdca'));
    const features = pdcaStatus.listFeatures(projectRoot);
    const activeFeature = features.find(f => f.currentPhase && f.currentPhase !== 'report');

    if (activeFeature) {
      const nextPhase = pdcaPhase.getNextPhase(activeFeature.currentPhase);
      if (nextPhase) {
        hints.push(`[PDCA] '${activeFeature.feature}' 현재 단계: ${activeFeature.currentPhase}`);
        hints.push(`  다음 단계: /pdca ${nextPhase} ${activeFeature.feature}`);
      }
    }
  } catch { /* pdca 모듈 로드 실패 시 무시 */ }

  // 3. Loop 상태 확인
  try {
    const loopState = require(path.join(__dirname, '..', 'lib', 'loop', 'state'));
    const loop = loopState.getState(projectRoot);
    if (loop.active) {
      hints.push(`[Loop] 활성 중: ${loop.currentIteration}/${loop.maxIterations}회`);
    }
  } catch { /* loop 모듈 로드 실패 시 무시 */ }

  if (hints.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit]\n${hints.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(err => {
  console.error(`[demokit] task-completed 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
