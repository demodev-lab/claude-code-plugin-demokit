/**
 * PDCA 템플릿 시스템
 * templates/ 디렉토리의 phase별 템플릿 로드 및 변수 치환
 */
const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'templates');
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * 기본 변수 생성
 */
function getDefaultVariables(feature, phase, options = {}) {
  return {
    feature,
    featureName: feature,
    phase,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    status: 'in-progress',
    project: options.project || '',
    version: options.version || '',
  };
}

/**
 * 템플릿 파일 로드 (level별 fallback)
 * 1. templates/{phase}-{level}.template.md 시도
 * 2. templates/{phase}.template.md fallback
 * 3. PHASE_INFO[phase].template 이름 사용
 */
function loadTemplate(phase, level) {
  // 1. level 지정 시 level-specific 템플릿 시도
  if (level) {
    const levelPath = path.join(TEMPLATE_DIR, `${phase}-${level.toLowerCase()}.template.md`);
    if (fs.existsSync(levelPath)) {
      return fs.readFileSync(levelPath, 'utf-8');
    }
  }

  // 2. 기본 phase 템플릿
  const basePath = path.join(TEMPLATE_DIR, `${phase}.template.md`);
  if (fs.existsSync(basePath)) {
    return fs.readFileSync(basePath, 'utf-8');
  }

  // 3. PHASE_INFO.template 이름으로 시도
  try {
    const { PHASE_INFO } = require('./phase');
    const info = PHASE_INFO[phase];
    if (info && info.template) {
      const infoPath = path.join(TEMPLATE_DIR, info.template);
      if (fs.existsSync(infoPath)) {
        return fs.readFileSync(infoPath, 'utf-8');
      }
    }
  } catch { /* phase 모듈 로드 실패 시 무시 */ }

  return null;
}

/**
 * 변수 치환 ({{variable}} → value)
 */
function fillTemplate(templateContent, variables = {}) {
  if (!templateContent || typeof templateContent !== 'string') return '';
  return templateContent.replace(VARIABLE_PATTERN, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

/**
 * 한 번에 로드 + 치환
 */
function getPhaseTemplate(phase, feature, options = {}) {
  const content = loadTemplate(phase, options.level);
  if (!content) return null;

  // options에서 문자열/숫자/불리언만 템플릿 변수로 사용
  const safeOptions = {};
  for (const [k, v] of Object.entries(options)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      safeOptions[k] = v;
    }
  }
  const variables = {
    ...getDefaultVariables(feature, phase, options),
    ...safeOptions,
  };
  // options에서 내부 키 제거
  delete variables.level;

  const filled = fillTemplate(content, variables);
  const templatePath = resolveTemplatePath(phase, options.level);

  return { content: filled, templatePath, variables };
}

/**
 * 템플릿 파일 경로 해석
 */
function resolveTemplatePath(phase, level) {
  if (level) {
    const levelPath = path.join(TEMPLATE_DIR, `${phase}-${level.toLowerCase()}.template.md`);
    if (fs.existsSync(levelPath)) return levelPath;
  }
  const basePath = path.join(TEMPLATE_DIR, `${phase}.template.md`);
  if (fs.existsSync(basePath)) return basePath;

  // PHASE_INFO.template fallback
  try {
    const { PHASE_INFO } = require('./phase');
    const info = PHASE_INFO[phase];
    if (info && info.template) {
      const infoPath = path.join(TEMPLATE_DIR, info.template);
      if (fs.existsSync(infoPath)) return infoPath;
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * PHASE_INFO.template → phase 역매핑 빌드
 */
function buildTemplateToPhaseMap() {
  try {
    const { PHASE_INFO } = require('./phase');
    const map = {};
    for (const [phase, info] of Object.entries(PHASE_INFO)) {
      if (info.template) {
        map[info.template] = phase;
      }
    }
    return map;
  } catch { return {}; }
}

/**
 * 사용 가능한 템플릿 목록
 */
function listAvailableTemplates() {
  if (!fs.existsSync(TEMPLATE_DIR)) return [];

  const templateToPhase = buildTemplateToPhaseMap();
  const files = fs.readdirSync(TEMPLATE_DIR).filter(f => f.endsWith('.template.md'));

  return files.map(f => {
    // PHASE_INFO에서 정확한 phase 매핑 시도
    const mappedPhase = templateToPhase[f];
    if (mappedPhase) {
      return { phase: mappedPhase, level: null, path: path.join(TEMPLATE_DIR, f) };
    }

    // fallback: 파일명에서 파싱
    const name = f.replace('.template.md', '');
    const parts = name.split('-');
    const phase = parts[0];
    const level = parts.length > 1 ? parts.slice(1).join('-') : null;
    return { phase, level, path: path.join(TEMPLATE_DIR, f) };
  });
}

module.exports = {
  getDefaultVariables,
  loadTemplate,
  fillTemplate,
  getPhaseTemplate,
  listAvailableTemplates,
  TEMPLATE_DIR,
  VARIABLE_PATTERN,
};
