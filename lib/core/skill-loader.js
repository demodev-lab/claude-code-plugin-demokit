/**
 * Skill Metadata Loader
 * skills/{name}/skill.yaml 파싱 및 조회
 */
const path = require('path');
const { getPluginRoot } = require('./config');
const io = require('./io');

/**
 * 간단한 YAML 파서 (의존성 없이 key: value 파싱)
 * 지원: 단순 key: value, 문자열 값, YAML 배열 (- item)
 */
function parseSimpleYaml(content) {
  const result = {};
  if (!content) return result;

  const lines = content.split('\n');
  let currentArrayKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // YAML 배열 항목 (- value)
    if (currentArrayKey && trimmed.startsWith('- ')) {
      let item = trimmed.substring(2).trim();
      // 따옴표 제거
      if ((item.startsWith('"') && item.endsWith('"')) ||
          (item.startsWith("'") && item.endsWith("'"))) {
        item = item.slice(1, -1);
      }
      result[currentArrayKey].push(item);
      continue;
    }

    // 배열 항목이 아니면 배열 수집 종료
    if (currentArrayKey && !trimmed.startsWith('- ')) {
      currentArrayKey = null;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.substring(0, colonIdx).trim();
    let value = trimmed.substring(colonIdx + 1).trim();

    // 값이 비어있으면 다음 줄부터 배열 수집 시작
    if (!value) {
      currentArrayKey = key;
      result[key] = [];
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
    _metaCache[skillName] = null;
    return null;
  }

  const meta = parseSimpleYaml(content);
  _metaCache[skillName] = meta;
  return meta;
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
  return meta?.['next-skill'] || null;
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

module.exports = { loadSkillMeta, getArgumentHint, getNextSkill, getPdcaPhase, getTaskTemplate, getImports, resetCache };
