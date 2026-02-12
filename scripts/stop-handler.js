/**
 * Stop Hook Handler
 * Claude가 작업을 마치고 종료하려 할 때 실행
 *
 * 1. context.md에 현재 상태 스냅샷 저장 (항상)
 * 2. Loop 활성 시:
 *    a. completion promise 감지 → 루프 종료 + loop-log.md 마무리
 *    b. max iterations 도달 → 루프 종료 + loop-log.md 마무리
 *    c. 그 외 → loop-log.md에 결과 append + 종료 차단 + prompt 재주입
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
  } catch { /* stdin이 비어있을 수 있음 */ }

  const { platform, cache } = require(path.join(__dirname, '..', 'lib', 'core'));
  const loopState = require(path.join(__dirname, '..', 'lib', 'loop', 'state'));

  const projectRoot = platform.findProjectRoot(process.cwd());

  if (!projectRoot) {
    console.log(JSON.stringify({}));
    return;
  }

  const state = loopState.getState(projectRoot);

  // context.md에 현재 상태 스냅샷 저장 (루프 여부와 무관하게 항상)
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

    let domains = [];
    try {
      const { projectAnalyzer } = require(path.join(__dirname, '..', 'lib', 'spring'));
      const projectInfo = projectAnalyzer.analyzeProject(projectRoot);
      domains = projectInfo.domains || [];
    } catch { /* ignore */ }

    const stopReason = state.active ? '루프 반복 중' : '세션 종료';

    writer.saveContext(projectRoot, {
      gradle,
      project,
      level,
      pdcaFeatures,
      loopState: state,
      domains,
      currentTask: {
        description: stopReason,
        status: state.active ? 'in_progress' : 'stopped',
      },
      recentChanges: [`세션 중단 (${stopReason})`],
    });
  } catch (err) {
    process.stderr.write(`[demodev-be] context.md 저장 실패: ${err.message}\n`);
  }

  // Loop가 비활성이면 정상 종료
  if (!state.active) {
    console.log(JSON.stringify({}));
    return;
  }

  // completion promise 감지
  const transcript = hookData.transcript || hookData.stop_reason || hookData.content || '';
  if (state.completionPromise && transcript.includes(state.completionPromise)) {
    const iterations = state.currentIteration;
    loopState.completeLoop(projectRoot);

    // loop-log.md 마무리
    try {
      const { writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
      writer.finalizeLoopLog(projectRoot, {
        totalIterations: iterations,
        completionReason: `완료 신호 '${state.completionPromise}' 감지`,
      });
    } catch { /* ignore */ }

    console.log(JSON.stringify({
      systemMessage: [
        `[demodev-be] Loop 완료: '${state.completionPromise}' 감지`,
        `총 ${iterations}회 반복 후 완료.`,
        `결과: .demodev/loop-log.md 참조`,
      ].join('\n'),
    }));
    return;
  }

  // 외부에서 complete 처리된 경우
  if (!state.active) {
    console.log(JSON.stringify({}));
    return;
  }

  // max iterations 도달
  if (loopState.isMaxReached(state)) {
    loopState.completeLoop(projectRoot);

    // loop-log.md 마무리
    try {
      const { writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
      writer.finalizeLoopLog(projectRoot, {
        totalIterations: state.currentIteration,
        completionReason: `최대 반복 횟수(${state.maxIterations}회) 도달`,
      });
    } catch { /* ignore */ }

    console.log(JSON.stringify({
      systemMessage: [
        `[demodev-be] Loop 종료: 최대 반복 횟수(${state.maxIterations}회) 도달`,
        `프롬프트: ${state.prompt.substring(0, 100)}...`,
        `결과: .demodev/loop-log.md 참조`,
        `수동으로 계속하려면 /loop 를 다시 실행하세요.`,
      ].join('\n'),
    }));
    return;
  }

  // 반복 계속: iteration 증가
  const newState = loopState.incrementIteration(projectRoot);

  // loop-log.md에 이번 반복 결과 append
  try {
    const { writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
    const resultSummary = transcript
      ? transcript.substring(0, 500)
      : '(결과 요약 없음)';

    writer.appendLoopLog(projectRoot, {
      iteration: newState.currentIteration,
      maxIterations: newState.maxIterations,
      prompt: state.prompt,
      result: resultSummary,
      nextAction: '자동 반복 계속',
    });
  } catch (err) {
    process.stderr.write(`[demodev-be] loop-log.md 저장 실패: ${err.message}\n`);
  }

  console.log(JSON.stringify({
    decision: 'block',
    systemMessage: [
      `[demodev-be] Loop 반복 ${newState.currentIteration}/${newState.maxIterations}`,
      ``,
      `이전 작업 결과를 확인하고, 아래 작업을 계속 진행하세요:`,
      ``,
      state.prompt,
      ``,
      `---`,
      `작업이 완료되면 응답에 '${state.completionPromise}'를 포함하세요.`,
      `완료 전까지 자동으로 반복됩니다.`,
      `(루프 로그: .demodev/loop-log.md)`,
    ].join('\n'),
  }));
}

main().catch(err => {
  console.error(`[demodev-be] stop-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
