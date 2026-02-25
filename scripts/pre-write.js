/**
 * PreToolUse Hook (Write/Edit)
 * Java 파일 작성/편집 전 Spring Boot 컨벤션 검증
 *
 * convention-checker.js를 사용하여 중복 제거
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
  const toolName = hookData.tool_name === 'Edit' ? 'Edit' : 'Write';
  const filePath = hookData.tool_input?.file_path || hookData.tool_input?.filePath || '';

  // Permission Hierarchy 체크 (모든 파일 대상)
  const { checkPermission } = require('../lib/core/permission');
  const perm = checkPermission(toolName, { file_path: filePath });

  if (perm.action === 'deny') {
    console.log(JSON.stringify({
      decision: 'block',
      reason: perm.message,
    }));
    return;
  }

  const permWarnings = [];
  if (perm.action === 'ask') {
    permWarnings.push(perm.message);
  }

  if (!filePath.endsWith('.java')) {
    // Java 파일이 아니면 permission 경고만 전달 (config 로드 불필요)
    if (permWarnings.length > 0) {
      console.log(JSON.stringify({
        systemMessage: `[demokit 권한 검증]\n${permWarnings.join('\n')}`,
      }));
    } else {
      console.log(JSON.stringify({}));
    }
    return;
  }

  // Java 파일에서만 config + convention checker 로드
  const { config, file: fileUtil } = require('../lib/core');
  const checker = require('../lib/spring/convention-checker');
  const cfg = config.loadConfig();
  const requiredAnnotations = cfg.spring.requiredAnnotations;

  const className = fileUtil.extractClassName(filePath);
  const layerType = fileUtil.detectLayerType(filePath);

  const hints = [];

  if (layerType) {
    // 네이밍 컨벤션 검사
    const naming = checker.checkNaming(className, layerType);
    if (!naming.valid && layerType !== 'entity') {
      hints.push(`[컨벤션] ${naming.message}`);
    }

    // 필수 어노테이션 힌트
    const annotations = requiredAnnotations[layerType];
    if (annotations && annotations.length > 0) {
      hints.push(`[어노테이션] ${layerType} 필수: ${annotations.join(', ')}`);
    }

    // 패키지 위치 검사
    const pkgViolations = checker.checkPackageLocation(filePath, layerType);
    pkgViolations.forEach(v => hints.push(`[패키지] ${v}`));

    // DTO record 힌트
    if (layerType === 'dto') {
      hints.push('[모던 패턴] DTO는 반드시 Java record로 작성하세요 (class 사용 금지)');
    }
  }

  // 파일 내용 기반 검사
  const content = hookData.tool_input?.content || hookData.tool_input?.new_string || '';
  if (content && filePath.endsWith('.java')) {
    // 금지 패턴 검사
    const forbidden = checker.checkForbiddenPatterns(content, layerType);
    forbidden.forEach(v => hints.push(`[금지] ${v}`));

    // DRY 위반 검사
    const dry = checker.checkDryViolations(content, layerType);
    dry.forEach(v => hints.push(`[DRY] ${v}`));

    // QueryDSL 컨벤션 검사
    const qdsl = checker.checkQueryDslPatterns(content, className, layerType);
    qdsl.forEach(v => hints.push(`[QueryDSL] ${v}`));

    // 고급 패턴 검사 (N+1, Transaction, Validation, SQL Injection)
    const advanced = checker.checkAdvancedPatterns(content, layerType);
    advanced.forEach(v => hints.push(`[검증] ${v}`));
  }

  // permission 경고 + 컨벤션 힌트 통합
  const allHints = [...permWarnings, ...hints];

  if (allHints.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit 컨벤션 힌트]\n${allHints.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(err => {
  console.error(`[demokit] pre-write 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
