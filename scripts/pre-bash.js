/**
 * PreToolUse Hook (Bash)
 * 위험한 Bash 명령 실행 전 경고
 *
 * 검증 항목:
 * - 위험 명령 감지 (rm -rf, drop table, git push --force 등)
 * - gradlew 권한 확인
 * - 프로덕션 환경 명령 차단
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

  const warnings = [];

  // 위험 명령 패턴
  const dangerousPatterns = [
    { pattern: /rm\s+-rf\s+[/\\]/, message: '루트 경로 삭제 명령 감지' },
    { pattern: /drop\s+(table|database)/i, message: 'DB 삭제 명령 감지' },
    { pattern: /git\s+push\s+.*--force/, message: 'git force push 감지' },
    { pattern: /git\s+reset\s+--hard/, message: 'git reset --hard 감지 (작업 손실 위험)' },
    { pattern: /git\s+clean\s+-fd/, message: 'git clean 감지 (추적되지 않은 파일 삭제)' },
    { pattern: /truncate\s+table/i, message: 'DB 테이블 비우기 명령 감지' },
    { pattern: /:(){ :\|:& };:/, message: '포크 폭탄 감지' },
    { pattern: /chmod\s+777/, message: 'chmod 777 감지 (보안 위험 - 최소 권한 원칙 위반)' },
    { pattern: /curl\s+.*\|\s*(bash|sh)/, message: 'curl pipe to shell 감지 (원격 코드 실행 위험)' },
    { pattern: /wget\s+.*\|\s*(bash|sh)/, message: 'wget pipe to shell 감지 (원격 코드 실행 위험)' },
    { pattern: /docker\s+run\s+.*--privileged/, message: 'docker --privileged 감지 (호스트 권한 노출 위험)' },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(command)) {
      warnings.push(`[경고] ${message}`);
    }
  }

  // 프로덕션 환경 관련 명령
  if (/--spring\.profiles\.active=prod/i.test(command) || /SPRING_PROFILES_ACTIVE=prod/i.test(command)) {
    warnings.push('[주의] 프로덕션 프로파일로 실행하려는 명령입니다');
  }

  // gradlew 실행 시 팁
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
