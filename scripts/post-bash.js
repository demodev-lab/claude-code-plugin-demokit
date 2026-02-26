/**
 * PostToolUse Hook (Bash)
 * 빌드/테스트 명령 실행 후 결과 파싱
 *
 * - gradlew build 실패 시 에러 요약
 * - gradlew test 실패 시 실패한 테스트 목록
 * - 컴파일 에러 시 파일/라인 정보 추출
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
  const output = hookData.tool_result?.stdout || hookData.tool_result?.output || '';
  const exitCode = hookData.tool_result?.exit_code ?? hookData.tool_result?.exitCode ?? 0;

  // Observation logging + Mode 분류 (즉시 반환 — LLM 호출 금지)
  try {
    const { platform } = require('../lib/core');
    const projRoot = platform.findProjectRoot(process.cwd());
    if (projRoot && command) {
      const { sessionLog, mode } = require('../lib/memory');
      const classification = mode.classifyCommand(command, exitCode);
      sessionLog.appendObservation(projRoot, {
        type: 'bash',
        tool: 'Bash',
        command: command.substring(0, 200),
        exitCode,
        ...classification,
      });
    }
  } catch { /* observation 실패 시 무시 */ }

  // Gradle 명령이 아니면 무시
  if (!command.includes('gradlew') && !command.includes('gradle')) {
    console.log(JSON.stringify({}));
    return;
  }

  // 성공 시 무시
  if (exitCode === 0) {
    console.log(JSON.stringify({}));
    return;
  }

  const hints = [];

  // 컴파일 에러 추출
  const compileErrors = output.match(/\S+\.java:\d+:\s*error:[^\n]*/g);
  if (compileErrors && compileErrors.length > 0) {
    hints.push(`[빌드 실패] 컴파일 에러 ${compileErrors.length}건:`);
    const MAX_DISPLAY = 5;
    compileErrors.slice(0, MAX_DISPLAY).forEach(err => {
      hints.push(`  ${err.trim()}`);
    });
    if (compileErrors.length > MAX_DISPLAY) {
      hints.push(`  ... 외 ${compileErrors.length - MAX_DISPLAY}건`);
    }
  }

  // 테스트 실패 추출
  const testFailures = output.match(/FAILED.*Test/g);
  if (testFailures && testFailures.length > 0) {
    hints.push(`[테스트 실패] ${testFailures.length}건:`);
    testFailures.slice(0, 5).forEach(fail => {
      hints.push(`  ${fail.trim()}`);
    });
  }

  // 의존성 해결 실패
  if (output.includes('Could not resolve') || output.includes('dependency resolution')) {
    hints.push('[의존성 오류] 의존성 해결 실패. build.gradle 의존성을 확인하세요.');
  }

  if (hints.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit 빌드 분석]\n${hints.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(err => {
  console.error(`[demokit] post-bash 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
