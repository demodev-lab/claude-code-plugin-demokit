/**
 * PreToolUse Hook (Bash)
 * Permission Hierarchy 기반 위험 명령 차단/경고
 *
 * 1. permission.js로 deny/ask/allow 판정
 * 2. deny → block (실행 차단)
 * 3. ask → systemMessage (경고 후 허용)
 * 4. 추가: 프로덕션 환경 경고, gradlew 팁
 */

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
  const command = hookData.tool_input?.command || '';

  if (!command.trim()) {
    console.log(JSON.stringify({}));
    return;
  }

  // 1. Permission Hierarchy 체크
  const { checkPermission } = require('../lib/core/permission');
  const perm = checkPermission('Bash', { command });

  if (perm.action === 'deny') {
    console.log(JSON.stringify({
      decision: 'block',
      reason: perm.message,
    }));
    return;
  }

  const warnings = [];

  if (perm.action === 'ask') {
    warnings.push(perm.message);
  }

  // 2. 추가 휴리스틱 경고 (permission에 없는 패턴)
  const additionalPatterns = [
    { pattern: /:(){ :\|:& };:/, message: '[경고] 포크 폭탄 감지' },
    { pattern: /curl\s+.*\|\s*(bash|sh)/, message: '[경고] curl pipe to shell 감지 (원격 코드 실행 위험)' },
    { pattern: /wget\s+.*\|\s*(bash|sh)/, message: '[경고] wget pipe to shell 감지 (원격 코드 실행 위험)' },
    { pattern: /docker\s+run\s+.*--privileged/, message: '[경고] docker --privileged 감지 (호스트 권한 노출 위험)' },
  ];

  for (const { pattern, message } of additionalPatterns) {
    if (pattern.test(command)) {
      warnings.push(message);
    }
  }

  // 3. 프로덕션 환경 관련 명령
  if (/--spring\.profiles\.active=prod/i.test(command) || /SPRING_PROFILES_ACTIVE=prod/i.test(command)) {
    warnings.push('[주의] 프로덕션 프로파일로 실행하려는 명령입니다');
  }

  // 4. gradlew 실행 시 팁
  if (command.includes('gradlew') && !command.includes('./gradlew') && !command.includes('.\\gradlew')) {
    warnings.push('[팁] gradlew는 ./gradlew (Unix) 또는 .\\gradlew (Windows) 로 실행하세요');
  }

  if (warnings.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit Bash 검증]\n${warnings.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(err => {
  console.error(`[demokit] pre-bash 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
