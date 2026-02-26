/**
 * Skill PostToolUse Hook
 * Skill 실행 후 context 업데이트 및 다음 skill/agent 제안
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

  const skillName = hookData.tool_input?.skill
    || hookData.tool_input?.name
    || hookData.tool_name
    || '';

  if (!skillName) {
    console.log(JSON.stringify({}));
    return;
  }

  // Observation logging + Mode 분류 (즉시 반환 — LLM 호출 금지)
  try {
    const { platform } = require('../lib/core');
    const projRoot = platform.findProjectRoot(process.cwd());
    if (projRoot) {
      const { sessionLog, mode } = require('../lib/memory');
      const classification = mode.classifySkill(skillName);
      sessionLog.appendObservation(projRoot, {
        type: 'skill',
        tool: 'Skill',
        skill: skillName,
        ...classification,
      });
    }
  } catch { /* observation 실패 시 무시 */ }

  const hints = [];

  // 1. Active skill 등록
  try {
    const { context } = require(path.join(__dirname, '..', 'lib', 'task'));
    context.setActiveSkill(skillName);
  } catch { /* ignore */ }

  // 2. Skill post orchestration
  try {
    const { skillLoader } = require(path.join(__dirname, '..', 'lib', 'core'));
    const result = skillLoader.orchestrateSkillPost(skillName, {}, {});

    if (result.suggestions) {
      if (result.suggestions.nextSkill) {
        const nextHint = result.suggestions.nextSkillHint || `다음 단계: /${result.suggestions.nextSkill}`;
        hints.push(`[Skill] ${nextHint}`);
      }
      if (result.suggestions.suggestedAgent) {
        hints.push(`[Skill] 추천 Agent: ${result.suggestions.suggestedAgent}`);
      }
    }
  } catch { /* ignore */ }

  if (hints.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit]\n${hints.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(err => {
  console.error(`[demokit] skill-post 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
