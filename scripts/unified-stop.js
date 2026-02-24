/**
 * Unified Stop Handler (보조)
 * stop-handler.js와 함께 실행. Skill dispatch + context 정리만 담당.
 * Agent dispatch / context.md / team / loop는 stop-handler.js에서 처리.
 */
const fs = require('fs');
const path = require('path');

const SKILL_HANDLERS = {
  pdca: handlePdcaSkillStop,
};

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData = {};
  try {
    if (input && input.trim()) hookData = JSON.parse(input);
  } catch { /* stdin이 비어있을 수 있음 */ }

  const hints = [];

  // Continuation enforcement: PDCA 미완료 시 종료 차단
  try {
    const { hookRuntime, platform } = require(path.join(__dirname, '..', 'lib', 'core'));
    if (hookRuntime.shouldRun({ scriptKey: 'continuationEnforcement', scriptFallback: false })) {
      const projectRoot = platform.findProjectRoot(process.cwd());
      if (projectRoot) {
        const loopState = require(path.join(__dirname, '..', 'lib', 'loop', 'state'));
        const currentLoopState = loopState.getState(projectRoot);
        if (!currentLoopState.active) {
          const forceStopMarker = path.join(projectRoot, '.pdca', '.force-stop');
          if (fs.existsSync(forceStopMarker)) {
            try { fs.unlinkSync(forceStopMarker); } catch (e) {
              process.stderr.write(`[demokit] force-stop 마커 삭제 실패: ${e.message}\n`);
            }
          } else {
            const { status } = require(path.join(__dirname, '..', 'lib', 'pdca'));
            const { PHASE_ORDER } = status;
            const features = status.listFeatures(projectRoot);
            const incompleteFeatures = [];
            for (const f of features) {
              const s = status.loadStatus(projectRoot, f.feature);
              if (!s || !s.phases) continue;
              if (PHASE_ORDER.some(phase => s.phases[phase]?.status !== 'completed')) {
                incompleteFeatures.push({ ...f, _status: s });
              }
            }
            if (incompleteFeatures.length > 0) {
              const f = incompleteFeatures[0];
              const s = f._status;
              const completedPhases = PHASE_ORDER.filter(phase => s.phases[phase]?.status === 'completed');
              const remainingPhases = PHASE_ORDER.filter(phase => s.phases[phase]?.status !== 'completed');
              const systemMessage = `[demokit] PDCA 진행 중 — 종료가 차단되었습니다.\n\n활성 feature: ${f.feature} (${f.currentPhase} 진행 중)\n완료: ${completedPhases.join(', ') || '없음'} | 남은: ${remainingPhases.join(', ')}\n\n계속 작업하거나, 강제 종료: /pdca force-stop`;
              console.log(JSON.stringify({ decision: 'block', systemMessage }));
              return;
            }
          }
        }
      }
    }
  } catch { /* continuation enforcement 실패 시 무시 */ }

  // Agent dispatch는 stop-handler.js에서 처리하므로 여기서는 생략
  // Skill-specific stop dispatch만 수행
  try {
    const { context } = require(path.join(__dirname, '..', 'lib', 'task'));
    const activeSkill = context.getActiveSkill();

    if (activeSkill && SKILL_HANDLERS[activeSkill]) {
      const skillHints = SKILL_HANDLERS[activeSkill](hookData);
      if (skillHints && skillHints.length > 0) {
        hints.push(...skillHints);
      }
    }
  } catch { /* task context 미로드 시 무시 */ }

  // Context 정리는 stop-handler.js에서 처리

  if (hints.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit unified-stop]\n${hints.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

/**
 * PDCA Skill stop handler
 * 현재 PDCA phase 상태를 context에 기록
 */
function handlePdcaSkillStop(hookData) {
  const hints = [];
  try {
    const { platform } = require(path.join(__dirname, '..', 'lib', 'core'));
    const projectRoot = platform.findProjectRoot(process.cwd());
    if (!projectRoot) return hints;

    const { status } = require(path.join(__dirname, '..', 'lib', 'pdca'));
    const features = status.listFeatures(projectRoot);
    if (features.length > 0) {
      const current = features[0];
      hints.push(`[PDCA] 현재 feature: ${current.feature} (${current.currentPhase})`);
    }
  } catch { /* ignore */ }
  return hints;
}

// 테스트를 위한 export
module.exports = { main, SKILL_HANDLERS, handlePdcaSkillStop };

if (require.main === module) {
  main().catch(err => {
    console.error(`[demokit] unified-stop 오류: ${err.message}`);
    console.log(JSON.stringify({}));
  });
}
