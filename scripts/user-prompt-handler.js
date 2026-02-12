/**
 * UserPromptSubmit Hook
 * 사용자 프롬프트에서 의도를 감지하고 적절한 Skill/Agent를 트리거
 *
 * lib/intent/trigger.js의 matchIntent()를 사용하여 중복 제거
 */
const { matchIntent } = require('../lib/intent/trigger');

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

  const detected = matchIntent(userPrompt);

  if (detected) {
    console.log(JSON.stringify({
      systemMessage: `[demokit] 의도 감지: ${detected.description}\n추천 명령: ${detected.command}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(err => {
  console.error(`[demokit] user-prompt-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
