/**
 * UserPromptSubmit Hook
 * 사용자 프롬프트에서 의도를 감지하고 적절한 Skill/Agent를 트리거
 *
 * lib/intent/trigger.js의 matchIntent()를 사용하여 중복 제거
 */
const { matchIntent } = require('../lib/intent/trigger');
const { classifyBySize } = require('../lib/task/classification');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData = {};
  try {
    if (input && input.trim()) hookData = JSON.parse(input);
  } catch (err) {
    process.stderr.write(`[demokit] stdin 파싱 실패: ${err.message}\n`);
    console.log(JSON.stringify({}));
    return;
  }
  const userPrompt = hookData.user_prompt || hookData.prompt || '';

  if (!userPrompt.trim()) {
    console.log(JSON.stringify({}));
    return;
  }

  const messages = [];

  // 1. 의도 감지
  const detected = matchIntent(userPrompt);
  if (detected) {
    messages.push(`의도 감지: ${detected.description}\n추천 명령: ${detected.command}`);
  }

  // 2. 작업 규모 분류 → PDCA 제안
  const sizeResult = classifyBySize(userPrompt);
  if (sizeResult.suggestPdca) {
    messages.push(`작업 규모: ${sizeResult.label} — /pdca 워크플로우를 권장합니다`);
  }

  if (messages.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit] ${messages.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(err => {
  console.error(`[demokit] user-prompt-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
