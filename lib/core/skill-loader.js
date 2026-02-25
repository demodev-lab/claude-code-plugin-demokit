/**
 * Skill Metadata Loader
 * skills/{name}/skill.yaml 파싱 및 조회
 */
const path = require('path');
const { getPluginRoot } = require('./config');
const io = require('./io');

const FALLBACK_METADATA = {
  help: { 'argument-hint': '도움말 조회, 원하는 명령 지정', 'next-skill': 'init' },
  init: { 'argument-hint': '[path]', 'next-skill': 'crud' },
  crud: { 'argument-hint': '도메인명 (PascalCase)', 'next-skill': 'test' },
  entity: { 'argument-hint': '도메인명 (PascalCase)' },
  repository: { 'argument-hint': '도메인명 (PascalCase)' },
  service: { 'argument-hint': '도메인명 (PascalCase)' },
  controller: { 'argument-hint': '도메인명 (PascalCase)' },
  dto: { 'argument-hint': '도메인명 (PascalCase)' },
  'api-docs': { 'argument-hint': '출력 형식 (springdoc/swagger)' },
  cache: { 'argument-hint': '캐시 타입 (caffeine|redis)' },
  'cancel-loop': { 'argument-hint': '루프 취소 사유(선택)' },
  changelog: { 'argument-hint': '범위 또는 태그 (예: v1.0.0..v1.1.0)' },
  commit: { 'argument-hint': '[message]', 'next-skill': 'commit-push' },
  'commit-push': { 'argument-hint': '[message]', 'next-skill': 'push' },
  docker: { 'argument-hint': '서비스 구성 (예: mysql, redis, full)' },
  erd: { 'argument-hint': '도메인명 또는 엔티티 목록' },
  gradle: { 'argument-hint': '작업 (add|remove|check|update) dependency' },
  loop: { 'argument-hint': '반복 실행할 프롬프트', 'next-skill': 'cancel-loop' },
  migration: { 'argument-hint': '마이그레이션 설명 (예: create_users_table)' },
  optimize: { 'argument-hint': '도메인명, 파일경로, all [--fix] (예: User, all --fix)' },
  pdca: { 'argument-hint': 'pdca 하위 명령 및 기능명 (예: plan 회원관리)' },
  pr: { 'argument-hint': 'PR 제목' },
  properties: { 'argument-hint': '동작 (analyze|generate|split) [profile]' },
  push: { 'argument-hint': '원격 브랜치(선택)' },
  'plan-plus': { 'argument-hint': '기능명 [--deep] (예: user-management, order-payment --deep)' },
};

/**
 * 간단한 YAML 파서 (의존성 없이 key: value 파싱)
 * 지원: 단순 key: value, 문자열 값, YAML 배열 (- item), agents 섹션 (key-value 맵)
 */
function parseSimpleYaml(content) {
  const result = {};
  if (!content) return result;

  const lines = content.split('\n');
  let currentArrayKey = null;
  let currentMapKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // YAML 배열 항목 (- value)
    if (currentArrayKey && trimmed.startsWith('- ')) {
      let item = trimmed.substring(2).trim();
      if ((item.startsWith('"') && item.endsWith('"')) ||
          (item.startsWith("'") && item.endsWith("'"))) {
        item = item.slice(1, -1);
      }
      result[currentArrayKey].push(item);
      continue;
    }

    // Map 섹션 내 key: value 항목 (들여쓰기된 항목, 배열 항목 제외)
    if (currentMapKey && /^\s+/.test(line) && !trimmed.startsWith('- ')) {
      const mapColonIdx = trimmed.indexOf(':');
      if (mapColonIdx !== -1) {
        const mapItemKey = trimmed.substring(0, mapColonIdx).trim();
        let mapItemValue = trimmed.substring(mapColonIdx + 1).trim();
        if ((mapItemValue.startsWith('"') && mapItemValue.endsWith('"')) ||
            (mapItemValue.startsWith("'") && mapItemValue.endsWith("'"))) {
          mapItemValue = mapItemValue.slice(1, -1);
        }
        if (mapItemKey && mapItemValue) {
          result[currentMapKey][mapItemKey] = mapItemValue;
        }
      }
      continue;
    }

    // 배열/맵 항목이 아니면 수집 종료
    if (currentArrayKey && !trimmed.startsWith('- ')) {
      currentArrayKey = null;
    }
    if (currentMapKey) {
      currentMapKey = null;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.substring(0, colonIdx).trim();
    let value = trimmed.substring(colonIdx + 1).trim();

    // 값이 비어있으면 다음 줄부터 배열 또는 맵 수집 시작
    if (!value) {
      // agents 키는 맵으로 처리
      if (key === 'agents') {
        currentMapKey = key;
        result[key] = {};
      } else {
        currentArrayKey = key;
        result[key] = [];
      }
      continue;
    }

    // 따옴표 제거
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }
  return result;
}

// 메타데이터 캐시
const _metaCache = {};

/**
 * skill.yaml 로드
 */
function loadSkillMeta(skillName) {
  if (_metaCache[skillName] !== undefined) return _metaCache[skillName];

  const pluginRoot = getPluginRoot();
  const yamlPath = path.join(pluginRoot, 'skills', skillName, 'skill.yaml');
  const content = io.readFile(yamlPath);

  if (!content) {
    const fallback = Object.assign({ name: skillName }, FALLBACK_METADATA[skillName] || {});
    _metaCache[skillName] = fallback;
    return fallback;
  }

  const meta = parseSimpleYaml(content);
  const withFallback = Object.assign({ name: skillName }, FALLBACK_METADATA[skillName] || {}, meta);
  _metaCache[skillName] = withFallback;
  return withFallback;
}

/**
 * argument 힌트 반환
 */
function getArgumentHint(skillName) {
  const meta = loadSkillMeta(skillName);
  return meta?.['argument-hint'] || null;
}

/**
 * 다음 스킬 이름 반환
 */
function getNextSkill(skillName) {
  const meta = loadSkillMeta(skillName);
  return meta?.['next-skill'] || meta?.nextSkill || null;
}

/**
 * PDCA phase 반환
 */
function getPdcaPhase(skillName) {
  const meta = loadSkillMeta(skillName);
  return meta?.['pdca-phase'] || null;
}

/**
 * task template 반환
 */
function getTaskTemplate(skillName) {
  const meta = loadSkillMeta(skillName);
  return meta?.['task-template'] || null;
}

/**
 * imports 경로 배열 반환
 */
function getImports(skillName) {
  const meta = loadSkillMeta(skillName);
  if (!meta?.imports) return [];
  // 단일 문자열이면 배열로 변환
  if (typeof meta.imports === 'string') return [meta.imports];
  if (Array.isArray(meta.imports)) return meta.imports;
  return [];
}

/**
 * 캐시 초기화 (테스트용)
 */
function resetCache() {
  Object.keys(_metaCache).forEach(k => delete _metaCache[k]);
}

// ── Multi-binding agents 지원 ──

/**
 * agents 필드 파싱 (단일/멀티 바인딩)
 * @param {Object} meta - 파싱된 메타데이터
 * @returns {{ [action]: agentName, _isMultiBinding: boolean }}
 */
function parseAgentsField(meta) {
  const agentsField = meta?.agents;
  const agentField = meta?.agent;

  // Multi-binding: agents: { action: agent } (배열은 제외)
  if (agentsField && typeof agentsField === 'object' && !Array.isArray(agentsField)) {
    return { ...agentsField, _isMultiBinding: true };
  }

  // Single binding: agent: "agentName"
  if (agentField && typeof agentField === 'string') {
    return { default: agentField, _isMultiBinding: false };
  }

  return { default: null, _isMultiBinding: false };
}

/**
 * 특정 action에 대한 agent 이름 반환
 */
function getAgentForAction(skillName, action) {
  const meta = loadSkillMeta(skillName);
  const agents = parseAgentsField(meta);
  return agents[action] || agents.default || null;
}

/**
 * skill에 연결된 모든 agent 반환
 */
function getLinkedAgents(skillName) {
  const meta = loadSkillMeta(skillName);
  const agents = parseAgentsField(meta);
  const names = Object.entries(agents)
    .filter(([key, value]) => key !== '_isMultiBinding' && value && typeof value === 'string')
    .map(([, value]) => value);
  return [...new Set(names)];
}

/**
 * multi-binding skill 여부
 */
function isMultiBindingSkill(skillName) {
  const meta = loadSkillMeta(skillName);
  const agents = parseAgentsField(meta);
  return agents._isMultiBinding === true;
}

// ── Pre/Post orchestration hooks ──

/**
 * skill 실행 전 orchestration
 * @param {string} skillName
 * @param {Object} args - { feature, action 등 }
 * @param {Object} context
 * @returns {{ config, imports, taskInfo, body }}
 */
function orchestrateSkillPre(skillName, args, context) {
  // 1. config 로드
  const config = loadSkillMeta(skillName);
  if (!config) return { error: `Skill not found: ${skillName}` };

  // 2. imports 수집
  const imports = getImports(skillName);

  // 3. phase 확인
  const pdcaPhase = getPdcaPhase(skillName);

  // 4. task 정보 수집
  let taskInfo = null;
  const taskTemplate = getTaskTemplate(skillName);
  if (taskTemplate && args?.feature) {
    taskInfo = {
      subject: taskTemplate.replace('{feature}', args.feature),
      description: `PDCA ${pdcaPhase || 'task'} for ${args.feature}`,
      pdcaPhase,
    };
  }

  return { config, imports, taskInfo, body: config.body || null };
}

/**
 * skill 실행 후 orchestration
 * @param {string} skillName
 * @param {Object} result
 * @param {Object} context
 * @returns {{ ...result, suggestions }}
 */
function orchestrateSkillPost(skillName, result, context) {
  const suggestions = {};

  // 1. 다음 skill 조회
  const nextSkillName = getNextSkill(skillName);
  if (nextSkillName) {
    suggestions.nextSkill = nextSkillName;
    suggestions.nextSkillHint = getNextStepMessage(nextSkillName);
  }

  // 2. agent 매핑
  const suggestedAgent = getAgentForAction(skillName, 'default');
  if (suggestedAgent) {
    suggestions.suggestedAgent = suggestedAgent;
  }

  return { ...result, suggestions };
}

/**
 * 다음 단계 안내 메시지
 */
function getNextStepMessage(nextSkillName) {
  return `다음 단계: /${nextSkillName}`;
}

module.exports = {
  loadSkillMeta, getArgumentHint, getNextSkill, getPdcaPhase, getTaskTemplate, getImports, resetCache,
  parseSimpleYaml,
  // Multi-binding agents
  parseAgentsField, getAgentForAction, getLinkedAgents, isMultiBindingSkill,
  // Orchestration hooks
  orchestrateSkillPre, orchestrateSkillPost, getNextStepMessage,
};
