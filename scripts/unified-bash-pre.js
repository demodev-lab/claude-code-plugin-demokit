/**
 * Unified PreToolUse Hook (Bash)
 * 기존 pre-bash.js 로직 통합 + agent/skill별 추가 차단 패턴
 *
 * 1. Permission Hierarchy 체크 (기존 로직)
 * 2. 추가 휴리스틱 경고
 * 3. activeAgent 기반 추가 차단 패턴
 * 4. activeSkill 기반 추가 차단 패턴
 */
const path = require('path');

const AGENT_BASH_GUARDS = {
  'code-analyzer': {
    block: ['Write', 'Edit'],
    patterns: [],
  },
  'qa-monitor': {
    block: [],
    patterns: [
      { pattern: /rm\s+-rf/, message: '[차단] QA Monitor는 rm -rf 실행 불가' },
      { pattern: /DROP\s+TABLE/i, message: '[차단] QA Monitor는 DROP TABLE 실행 불가' },
    ],
  },
};

const SKILL_BASH_GUARDS = {
  deploy: {
    patterns: [
      { pattern: /kubectl\s+delete/, message: '[차단] deploy skill에서 kubectl delete 실행 불가' },
      { pattern: /terraform\s+destroy/, message: '[차단] deploy skill에서 terraform destroy 실행 불가' },
    ],
  },
};

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
  const warnings = [];
  try {
    const { checkPermission } = require('../lib/core/permission');
    const perm = checkPermission('Bash', { command });

    if (perm.action === 'deny') {
      console.log(JSON.stringify({ decision: 'block', reason: perm.message }));
      return;
    }

    if (perm.action === 'ask') {
      warnings.push(perm.message);
    }
  } catch { /* permission 로드 실패 시 계속 진행 */ }

  // 2. 추가 휴리스틱 경고 (기존 pre-bash.js 로직)
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

  // 3. Agent 기반 추가 차단 패턴
  try {
    const { context } = require(path.join(__dirname, '..', 'lib', 'task'));
    const activeAgent = context.getActiveAgent();

    if (activeAgent) {
      // 등록된 agent guard 체크
      if (AGENT_BASH_GUARDS[activeAgent]) {
        const guard = AGENT_BASH_GUARDS[activeAgent];
        for (const { pattern, message } of (guard.patterns || [])) {
          if (pattern.test(command)) {
            console.log(JSON.stringify({ decision: 'block', reason: message }));
            return;
          }
        }
      }

      // QA 계열 agent 공통 차단 (기존 pre-bash.js 호환)
      if (/qa|test|quality|gap-detector/i.test(activeAgent)) {
        const qaPatterns = [
          { pattern: /docker\s+.*--privileged/, message: `[차단] ${activeAgent} agent는 docker --privileged 실행 불가` },
          { pattern: /kubectl\s+delete/, message: `[차단] ${activeAgent} agent는 kubectl delete 실행 불가` },
          { pattern: /terraform\s+destroy/, message: `[차단] ${activeAgent} agent는 terraform destroy 실행 불가` },
        ];
        for (const { pattern, message } of qaPatterns) {
          if (pattern.test(command)) {
            console.log(JSON.stringify({ decision: 'block', reason: message }));
            return;
          }
        }
      }
    }
  } catch { /* task context 미로드 시 무시 */ }

  // 4. Skill 기반 추가 차단 패턴
  try {
    const { context } = require(path.join(__dirname, '..', 'lib', 'task'));
    const activeSkill = context.getActiveSkill();

    if (activeSkill && SKILL_BASH_GUARDS[activeSkill]) {
      const guard = SKILL_BASH_GUARDS[activeSkill];
      for (const { pattern, message } of (guard.patterns || [])) {
        if (pattern.test(command)) {
          console.log(JSON.stringify({ decision: 'block', reason: message }));
          return;
        }
      }
    }
  } catch { /* task context 미로드 시 무시 */ }

  // 5. 프로덕션 환경 경고
  if (/--spring\.profiles\.active=prod/i.test(command) || /SPRING_PROFILES_ACTIVE=prod/i.test(command)) {
    warnings.push('[주의] 프로덕션 프로파일로 실행하려는 명령입니다');
  }

  // 6. gradlew 팁
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

// 테스트를 위한 export
module.exports = { main, AGENT_BASH_GUARDS, SKILL_BASH_GUARDS };

if (require.main === module) {
  main().catch(err => {
    console.error(`[demokit] unified-bash-pre 오류: ${err.message}`);
    console.log(JSON.stringify({}));
  });
}
