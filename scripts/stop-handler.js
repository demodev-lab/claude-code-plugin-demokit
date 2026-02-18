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

const TEAM_CLEAR_MODE_ALWAYS = 'always';
const TEAM_CLEAR_MODE_IF_NO_LIVE = 'if_no_live';
const TEAM_CLEAR_MODE_NEVER = 'never';
const TEAM_CLEAR_LIVE_STATUSES = new Set(['active', 'working', 'idle']);

function hasLiveMembersForClear(teamState) {
  if (!teamState || !Array.isArray(teamState.members)) return false;
  return teamState.members.some(member => TEAM_CLEAR_LIVE_STATUSES.has(member.status));
}

function shouldClearTeamStateAtStop(clearMode, isCompleteStop, hasLiveMembers) {
  if (!isCompleteStop) return false;

  if (clearMode === TEAM_CLEAR_MODE_ALWAYS) {
    return true;
  }

  if (clearMode === TEAM_CLEAR_MODE_IF_NO_LIVE) {
    return !hasLiveMembers;
  }

  return false;
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData = {};
  try {
    if (input && input.trim()) hookData = JSON.parse(input);
  } catch { /* stdin이 비어있을 수 있음 */ }

  const { platform, cache } = require(path.join(__dirname, '..', 'lib', 'core'));
  const loopStateMod = require(path.join(__dirname, '..', 'lib', 'loop', 'state'));

  const projectRoot = platform.findProjectRoot(process.cwd());

  if (!projectRoot) {
    console.log(JSON.stringify({}));
    return;
  }

  const loopState = loopStateMod.getState(projectRoot);

  // context.md에 현재 상태 스냅샷 저장 (루프 여부와 무관하게 항상)
  try {
    const { snapshot, writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
    const state = snapshot.collectState(projectRoot, cache);
    const stopReason = loopState.active ? '루프 반복 중' : '세션 종료';

    writer.saveContext(projectRoot, {
      ...state,
      currentTask: {
        description: stopReason,
        status: loopState.active ? 'in_progress' : 'stopped',
      },
      recentChanges: [`세션 중단 (${stopReason})`],
    });
  } catch (err) {
    process.stderr.write(`[demokit] context.md 저장 실패: ${err.message}\n`);
  }

  // Team 상태 영속화
  try {
    const { stateWriter, teamConfig } = require(path.join(__dirname, '..', 'lib', 'team'));
    const cleanupPolicy = teamConfig.getCleanupPolicy ? teamConfig.getCleanupPolicy() : null;
    const isCompleteStop = !loopState.active;
    const clearMode = cleanupPolicy?.clearTeamStateOnStopMode || TEAM_CLEAR_MODE_NEVER;

    const staleMs = Number(cleanupPolicy?.staleMemberMs);
    let teamState = stateWriter.loadTeamState(projectRoot);
    if (teamState.enabled) {
      const activeMembersAtStop = teamState.members
        .filter(m => m.status === 'active')
        .map(m => m.id)
        .filter(Boolean);

      // 활성 멤버 → paused로 변경
      let pausedAny = false;
      for (const member of teamState.members) {
        if (member.status === 'active') {
          member.status = 'paused';
          member.currentTask = null;
          pausedAny = true;
        }
      }
      if (pausedAny) {
        teamState.history = teamState.history || [];
        teamState.history.push({
          event: 'session_stopped',
          timestamp: new Date().toISOString(),
          pausedMembers: teamState.members.filter(m => m.status === 'paused').map(m => m.id),
        });
        stateWriter.saveTeamState(projectRoot, teamState);
      }

      // 오랫동안 활동하지 않은 멤버 정리
      let staleCleanup = { state: teamState, removedMemberIds: [] };
      if (Number.isFinite(staleMs) && staleMs > 0) {
        staleCleanup = stateWriter.cleanupStaleMembers(projectRoot, staleMs);
        if (staleCleanup.removedMemberIds?.length > 0) {
          teamState = staleCleanup.state;
        }
      }

      // 완료되지 않은 active 멤버의 점유 작업 해제(세션 종료 시)
      if (isCompleteStop) {
        for (const memberId of activeMembersAtStop) {
          stateWriter.releaseTaskAssignmentsForMember(projectRoot, memberId);
        }
      }

      // stop 이벤트 단위 정리: 미작업 멤버 제거 옵션
      if (isCompleteStop && cleanupPolicy?.pruneMembersOnStop) {
        const stoppedState = stateWriter.loadTeamState(projectRoot);
        const prunedMembers = stoppedState.members
          .filter(m => m.status !== 'active')
          .map(m => m.id)
          .filter(Boolean);
        if (prunedMembers.length > 0) {
          stoppedState.members = stoppedState.members.filter(m => m.status === 'active');
          stoppedState.history = stoppedState.history || [];
          stoppedState.history.push({
            event: 'members_pruned_on_stop',
            at: new Date().toISOString(),
            removedMembers: prunedMembers,
          });
          if (stoppedState.history.length > 100) {
            stoppedState.history = stoppedState.history.slice(-100);
          }
          stateWriter.saveTeamState(projectRoot, stoppedState);
        }
      }

      // 완전 종료 처리 정책: clearOnStop 플래그가 명시될 때만 세션 종료 시 정리
      if (isCompleteStop) {
        const latestTeamState = stateWriter.loadTeamState(projectRoot);
        const hasLiveMembers = hasLiveMembersForClear(latestTeamState);
        const clearStateAtStop = shouldClearTeamStateAtStop(clearMode, isCompleteStop, hasLiveMembers)
          || cleanupPolicy?.forceClearOnStop === true
          || cleanupPolicy?.clearOnStop === true;

        if (clearStateAtStop) {
          stateWriter.clearTeamState(projectRoot);
        }
      }
    }
  } catch { /* team 모듈 로드 실패 시 무시 */ }

  // Agent-specific stop dispatch
  try {
    const { context } = require(path.join(__dirname, '..', 'lib', 'task'));
    const activeAgent = context.getActiveAgent();

    if (activeAgent) {
      const agentStopScripts = {
        'gap-detector': './gap-detector-stop.js',
        'pdca-iterator': './iterator-stop.js',
        'cto-lead': './cto-stop.js',
      };

      const stopScript = agentStopScripts[activeAgent];
      if (stopScript) {
        const agentStop = require(path.join(__dirname, stopScript));
        const agentHints = await agentStop.main(hookData);
        if (agentHints && agentHints.length > 0) {
          // agent hints는 별도 systemMessage로 전달하지 않고 context에 기록
          process.stderr.write(`[demokit] agent-stop(${activeAgent}): ${agentHints.join('; ')}\n`);
        }
      }
      context.clearActiveContext();
    }
  } catch { /* agent stop 실패 시 무시 */ }

  // Loop가 비활성이면 정상 종료
  if (!loopState.active) {
    console.log(JSON.stringify({}));
    return;
  }

  // completion promise 감지
  const transcript = hookData.transcript || hookData.stop_reason || hookData.content || '';
  if (loopState.completionPromise && transcript.includes(loopState.completionPromise)) {
    const iterations = loopState.currentIteration;
    loopStateMod.completeLoop(projectRoot);

    // loop-log.md 마무리
    try {
      const { writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
      writer.finalizeLoopLog(projectRoot, {
        totalIterations: iterations,
        completionReason: `완료 신호 '${loopState.completionPromise}' 감지`,
      });
    } catch { /* ignore */ }

    console.log(JSON.stringify({
      systemMessage: [
        `[demokit] Loop 완료: '${loopState.completionPromise}' 감지`,
        `총 ${iterations}회 반복 후 완료.`,
        `결과: .demodev/loop-log.md 참조`,
      ].join('\n'),
    }));
    return;
  }

  // 외부에서 complete 처리된 경우 (최신 상태 재조회)
  if (!loopStateMod.getState(projectRoot).active) {
    console.log(JSON.stringify({}));
    return;
  }

  // max iterations 도달
  if (loopStateMod.isMaxReached(loopState)) {
    loopStateMod.completeLoop(projectRoot);

    // loop-log.md 마무리
    try {
      const { writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
      writer.finalizeLoopLog(projectRoot, {
        totalIterations: loopState.currentIteration,
        completionReason: `최대 반복 횟수(${loopState.maxIterations}회) 도달`,
      });
    } catch { /* ignore */ }

    console.log(JSON.stringify({
      systemMessage: [
        `[demokit] Loop 종료: 최대 반복 횟수(${loopState.maxIterations}회) 도달`,
        `프롬프트: ${(loopState.prompt || '').substring(0, 100)}...`,
        `결과: .demodev/loop-log.md 참조`,
        `수동으로 계속하려면 /loop 를 다시 실행하세요.`,
      ].join('\n'),
    }));
    return;
  }

  // 반복 계속: iteration 증가
  const completedIteration = loopState.currentIteration;
  const newState = loopStateMod.incrementIteration(projectRoot);

  // loop-log.md에 이번 반복 결과 append
  try {
    const { writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
    const resultSummary = transcript
      ? transcript.substring(0, 500)
      : '(결과 요약 없음)';

    writer.appendLoopLog(projectRoot, {
      iteration: completedIteration,
      maxIterations: newState.maxIterations,
      prompt: loopState.prompt,
      result: resultSummary,
      nextAction: '자동 반복 계속',
    });
  } catch (err) {
    process.stderr.write(`[demokit] loop-log.md 저장 실패: ${err.message}\n`);
  }

  console.log(JSON.stringify({
    decision: 'block',
    systemMessage: [
      `[demokit] Loop 반복 ${newState.currentIteration}/${newState.maxIterations}`,
      ``,
      `이전 작업 결과를 확인하고, 아래 작업을 계속 진행하세요:`,
      ``,
      loopState.prompt,
      ``,
      `---`,
      `작업이 완료되면 응답에 '${loopState.completionPromise}'를 포함하세요.`,
      `완료 전까지 자동으로 반복됩니다.`,
      `(루프 로그: .demodev/loop-log.md)`,
    ].join('\n'),
  }));
}

main().catch(err => {
  console.error(`[demokit] stop-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
