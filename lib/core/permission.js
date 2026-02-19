/**
 * Permission Hierarchy
 * deny/ask/allow 3단계 권한 체계
 * config의 permissions 섹션 기반 패턴 매칭
 */
const { loadConfig } = require('./config');

/**
 * 간단한 glob 패턴 매칭 (minimatch 스타일, 의존성 없이 구현)
 * 지원: *, **, ?
 */
function globMatch(pattern, str) {
  // Bash 패턴: "Bash(패턴)" → command 매칭
  // Write/Edit 패턴: "Write(패턴)" / "Edit(패턴)" → filePath 매칭
  const regex = globToRegex(pattern);
  return regex.test(str);
}

function globToRegex(glob) {
  let result = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '\\') {
      const next = glob[i + 1];
      // \*, \? 처럼 이스케이프된 와일드카드는 리터럴로 처리
      if (next === '*' || next === '?') {
        result += '\\' + next;
        i += 2;
        continue;
      }
      // 그 외 백슬래시는 리터럴 백슬래시
      result += '\\\\';
      i++;
      continue;
    }
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i += 2;
        if (glob[i] === '/') {
          // **/ → 임의 경로/ 또는 루트 (빈 문자열)
          result += '(?:.*\\/)?';
          i++;
        } else {
          // ** 단독 → 모든 문자 (경로 구분자 포함)
          result += '.*';
        }
        continue;
      }
      // * → 경로 구분자 외 모든 문자
      result += '[^/\\\\]*';
    } else if (c === '?') {
      result += '[^/\\\\]';
    } else if (c === '.' || c === '\\' || c === '(' || c === ')' || c === '{' || c === '}' || c === '[' || c === ']' || c === '+' || c === '^' || c === '$' || c === '|') {
      result += '\\' + c;
    } else {
      result += c;
    }
    i++;
  }
  return new RegExp(`^${result}$`, 'i');
}

/**
 * permission 키 파싱
 * "Bash(rm -rf*)" → { tool: 'Bash', pattern: 'rm -rf*' }
 * "Write(**\/.env*)" → { tool: 'Write', pattern: '**\/.env*' }
 */
function parsePermissionKey(key) {
  const match = key.match(/^(Bash|Write|Edit)\((.+)\)$/);
  if (!match) return null;
  return { tool: match[1], pattern: match[2] };
}

/**
 * 권한 체크
 * @param {string} toolName - 'Bash', 'Write', 'Edit'
 * @param {object} input - tool_input (command, file_path 등)
 * @returns {{ action: 'allow'|'ask'|'deny', message?: string }}
 */
function checkPermission(toolName, input) {
  let permissions;
  try {
    const config = loadConfig();
    permissions = config.permissions;
  } catch {
    return { action: 'allow' };
  }

  if (!permissions) return { action: 'allow' };

  // 매칭 대상 추출
  let target = '';
  if (toolName === 'Bash') {
    target = input.command || '';
  } else if (toolName === 'Write' || toolName === 'Edit') {
    target = input.file_path || input.filePath || '';
    // 경로 정규화 (Windows 백슬래시 → 슬래시)
    target = target.replace(/\\/g, '/');
  }

  if (!target) return { action: 'allow' };

  // 모든 permission 규칙 검사 (deny > ask > allow 우선순위)
  let result = { action: 'allow' };

  for (const [key, action] of Object.entries(permissions)) {
    const parsed = parsePermissionKey(key);
    if (!parsed) continue;
    if (parsed.tool !== toolName) continue;

    if (globMatch(parsed.pattern, target)) {
      if (action === 'deny') {
        return {
          action: 'deny',
          message: `[차단] '${target}' 실행이 권한 정책에 의해 차단됨 (규칙: ${key})`,
        };
      }
      if (action === 'ask' && result.action !== 'deny') {
        result = {
          action: 'ask',
          message: `[주의] '${target}' 실행 시 주의가 필요합니다 (규칙: ${key})`,
        };
      }
    }
  }

  return result;
}

// Permission 레벨
const PERMISSION_LEVELS = { deny: 0, ask: 1, allow: 2 };

/**
 * 도구 실행이 차단되어야 하는지 확인
 * @param {string} toolName
 * @param {object} toolInput
 * @returns {{ blocked: boolean, permission: string, reason: string|null }}
 */
function shouldBlock(toolName, toolInput) {
  const result = checkPermission(toolName, toolInput || {});
  if (result.action === 'deny') {
    return { blocked: true, permission: 'deny', reason: result.message || `${toolName} action is denied by permission policy` };
  }
  return { blocked: false, permission: result.action, reason: null };
}

/**
 * 도구 실행 시 확인이 필요한지 확인
 * @param {string} toolName
 * @param {object} toolInput
 * @returns {{ requiresConfirmation: boolean, permission: string }}
 */
function requiresConfirmation(toolName, toolInput) {
  const result = checkPermission(toolName, toolInput || {});
  return { requiresConfirmation: result.action === 'ask', permission: result.action };
}

/**
 * permission 레벨 숫자 반환
 * @param {string} permission - 'deny' | 'ask' | 'allow'
 * @returns {number}
 */
function getPermissionLevel(permission) {
  return PERMISSION_LEVELS[permission] ?? PERMISSION_LEVELS.allow;
}

/**
 * permA가 permB보다 더 제한적인지 비교
 */
function isMoreRestrictive(permA, permB) {
  return getPermissionLevel(permA) < getPermissionLevel(permB);
}

/**
 * 모든 permission 반환
 */
function getAllPermissions() {
  try {
    const config = loadConfig();
    return config.permissions || {};
  } catch {
    return {};
  }
}

module.exports = {
  checkPermission, globMatch, parsePermissionKey,
  PERMISSION_LEVELS, shouldBlock, requiresConfirmation,
  getPermissionLevel, isMoreRestrictive, getAllPermissions,
};
