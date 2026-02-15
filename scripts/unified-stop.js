/**
 * Unified Stop Handler (보조)
 * stop-handler.js와 함께 실행. Skill dispatch + context 정리만 담당.
 * Agent dispatch / context.md / team / loop는 stop-handler.js에서 처리.
 */
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
