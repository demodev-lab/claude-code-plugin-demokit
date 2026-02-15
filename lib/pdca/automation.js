/**
 * PDCA 자동화
 * Match Rate 계산 및 자동 반복 개선 로직
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_WEIGHTS = {
  apiEndpoints: 30,
  dbSchema: 25,
  dtoFields: 15,
  errorHandling: 15,
  businessRules: 15,
};

/**
 * 설계 문서와 구현 코드 간 Match Rate 산출
 * @param {Object} designSpec - 설계 스펙 (파싱된 design.md)
 * @param {Object} implementation - 구현 분석 결과
 * @param {Object} weights - 가중치 (기본값: DEFAULT_WEIGHTS)
 * @returns {Object} { totalRate, details }
 */
function calculateMatchRate(designSpec, implementation, weights = DEFAULT_WEIGHTS) {
  const safeDesignSpec = (designSpec && typeof designSpec === 'object') ? designSpec : {};
  const safeImplementation = (implementation && typeof implementation === 'object') ? implementation : {};
  const safeWeights = normalizeWeights(weights);

  const details = {};

  // API 엔드포인트 매칭
  details.apiEndpoints = matchApiEndpoints(
    normalizeList(safeDesignSpec.apis),
    normalizeList(safeImplementation.apis)
  );

  // DB 스키마 매칭
  details.dbSchema = matchDbSchema(
    normalizeList(safeDesignSpec.tables),
    normalizeList(safeImplementation.entities)
  );

  // DTO 필드 매칭
  details.dtoFields = matchDtoFields(
    normalizeList(safeDesignSpec.dtos),
    normalizeList(safeImplementation.dtos)
  );

  // 에러 처리 매칭
  details.errorHandling = matchErrorHandling(
    normalizeList(safeDesignSpec.errors),
    normalizeList(safeImplementation.exceptions)
  );

  // 비즈니스 규칙 매칭
  details.businessRules = matchBusinessRules(
    normalizeList(safeDesignSpec.rules),
    normalizeList(safeImplementation.rules)
  );

  // 가중 평균 계산
  let totalRate = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(safeWeights)) {
    const rate = details[key]?.rate || 0;
    totalRate += rate * weight;
    totalWeight += weight;
  }

  totalRate = totalWeight > 0 ? Math.round(totalRate / totalWeight) : 0;

  return { totalRate, details, weights: safeWeights };
}

function normalizeWeights(weights) {
  if (!weights || typeof weights !== 'object') {
    return { ...DEFAULT_WEIGHTS };
  }

  const normalized = { ...DEFAULT_WEIGHTS };
  for (const [key, value] of Object.entries(weights)) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      normalized[key] = numeric;
    }
  }
  return normalized;
}

function matchApiEndpoints(designed, implemented) {
  const safeDesigned = normalizeList(designed)
    .map(toApiEndpoint)
    .filter(Boolean);
  const safeImplemented = normalizeList(implemented)
    .map(toApiEndpoint)
    .filter(Boolean);

  if (safeDesigned.length === 0) return { rate: 100, matched: 0, total: 0 };
  const matched = safeDesigned.filter(api =>
    safeImplemented.some(impl =>
      impl.method === api.method &&
      impl.path === api.path
    )
  ).length;
  return { rate: Math.round((matched / safeDesigned.length) * 100), matched, total: safeDesigned.length };
}

function matchDbSchema(designed, implemented) {
  const safeDesigned = normalizeList(designed)
    .map(toNameItem)
    .filter(Boolean);
  const safeImplemented = normalizeList(implemented)
    .map(toNameItem)
    .filter(Boolean);

  if (safeDesigned.length === 0) return { rate: 100, matched: 0, total: 0 };
  const matched = safeDesigned.filter(table =>
    safeImplemented.some(entity => entity === table)
  ).length;
  return { rate: Math.round((matched / safeDesigned.length) * 100), matched, total: safeDesigned.length };
}

function matchDtoFields(designed, implemented) {
  const safeDesigned = normalizeList(designed)
    .map(toNameItem)
    .filter(Boolean);
  const safeImplemented = normalizeList(implemented)
    .map(toNameItem)
    .filter(Boolean);

  if (safeDesigned.length === 0) return { rate: 100, matched: 0, total: 0 };
  const matched = safeDesigned.filter(dto =>
    safeImplemented.some(impl => impl === dto)
  ).length;
  return { rate: Math.round((matched / safeDesigned.length) * 100), matched, total: safeDesigned.length };
}

function matchErrorHandling(designed, implemented) {
  const safeDesigned = normalizeList(designed)
    .map(toErrorItem)
    .filter(Boolean);
  const safeImplemented = normalizeList(implemented)
    .map(toErrorItem)
    .filter(Boolean);

  if (safeDesigned.length === 0) return { rate: 100, matched: 0, total: 0 };
  const matched = safeDesigned.filter(err =>
    safeImplemented.some(impl =>
      (impl.status && impl.status === err.status) ||
      (impl.name && impl.name === err.name)
    )
  ).length;
  return { rate: Math.round((matched / safeDesigned.length) * 100), matched, total: safeDesigned.length };
}

function matchBusinessRules(designed, implemented) {
  const safeDesigned = normalizeList(designed);
  const safeImplemented = normalizeList(implemented);

  if (safeDesigned.length === 0) return { rate: 100, matched: 0, total: 0 };
  const implementedRules = safeImplemented;

  const extractRuleKeys = (rule) => {
    if (!rule) return [];

    if (typeof rule === 'string') {
      const normalized = rule.trim().toLowerCase();
      return normalized ? [normalized] : [];
    }

    if (typeof rule !== 'object') return [];

    const keys = [
      rule.name,
      rule.id,
      rule.code,
      rule.title,
      rule.key,
      rule.summary,
      rule.description,
      rule.type,
    ];

    return keys
      .map(v => (typeof v === 'string' ? v.trim().toLowerCase() : ''))
      .filter(Boolean);
  };

  const implementedKeySets = implementedRules.map(extractRuleKeys);

  const matched = safeDesigned.filter((rule) => {
    const ruleKeys = extractRuleKeys(rule);
    if (ruleKeys.length > 0) {
      return implementedKeySets.some((implKeys) => {
        const implText = implKeys.join(' ');
        return ruleKeys.some(ruleKey =>
          implKeys.some(implKey => implKey.includes(ruleKey) || ruleKey.includes(implKey) || implKey === ruleKey)
            || implText.includes(ruleKey)
        );
      });
    }

    // object metadata가 없는 규칙은 문자열 비교 fallback
    const fallback = (typeof rule === 'string')
      ? rule.trim().toLowerCase()
      : safeToJsonText(rule);
    if (!fallback) return false;

    return implementedRules.some((implRule) => {
      const implText = (typeof implRule === 'string' || typeof implRule === 'number' || typeof implRule === 'boolean')
        ? String(implRule).toLowerCase()
        : safeToJsonText(implRule);
      return implText.includes(fallback) || fallback.includes(implText);
    });
  }).length;

  return { rate: Math.round((matched / safeDesigned.length) * 100), matched, total: safeDesigned.length };
}

function safeToJsonText(value) {
  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return '';
  }
}

function toApiEndpoint(value) {
  if (!value || typeof value !== 'object') return null;
  const method = normalizeString(value.method).toUpperCase();
  const pathValue = normalizeString(value.path);
  if (!method || !pathValue) return null;
  return { method, path: pathValue };
}

function toNameItem(value) {
  const normalized = typeof value === 'string'
    ? normalizeString(value)
    : normalizeString(value && value.name);
  return normalized || null;
}

function toErrorItem(value) {
  if (!value || typeof value !== 'object') {
    const normalized = normalizeString(value);
    return normalized ? { status: null, name: normalized } : null;
  }

  const status = normalizeString(value.status);
  const name = normalizeString(value.name);
  if (!status && !name) return null;
  return { status, name };
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim().toLowerCase();
  return '';
}

/**
 * Match Rate가 임계값 미만인지 확인
 */
function needsIteration(matchRate, threshold = 90) {
  const rate = (matchRate && typeof matchRate === 'object' && Number.isFinite(matchRate.totalRate))
    ? matchRate.totalRate
    : 0;
  return rate < threshold;
}

/**
 * Gap 목록 생성 (설계 대비 누락된 항목)
 */
function identifyGaps(matchRate) {
  if (!matchRate || typeof matchRate !== 'object' || !matchRate.details || typeof matchRate.details !== 'object') {
    return [];
  }

  const gaps = [];
  for (const [category, detail] of Object.entries(matchRate.details)) {
    const total = detail?.total || 0;
    const matched = detail?.matched || 0;
    const rate = detail?.rate || 0;
    if (rate < 100) {
      gaps.push({
        category,
        rate,
        missing: Math.max(0, total - matched),
        total,
      });
    }
  }
  return gaps.sort((a, b) => a.rate - b.rate);
}

/**
 * 자동 전환 레벨 조회
 * @param {string} projectRoot
 * @returns {'manual' | 'semi-auto' | 'full-auto'}
 */
function getAutomationLevel(projectRoot) {
  try {
    const configPath = path.join(projectRoot, 'demodev.config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const level = config?.pdca?.automationLevel;
      if (['manual', 'semi-auto', 'full-auto'].includes(level)) return level;
    }
  } catch { /* ignore */ }

  // 플러그인 config fallback
  try {
    const pluginConfig = path.resolve(__dirname, '..', '..', 'demodev.config.json');
    if (fs.existsSync(pluginConfig)) {
      const config = JSON.parse(fs.readFileSync(pluginConfig, 'utf-8'));
      const level = config?.pdca?.automationLevel;
      if (['manual', 'semi-auto', 'full-auto'].includes(level)) return level;
    }
  } catch { /* ignore */ }

  return 'manual';
}

/**
 * 자동 전환 여부 판단
 * @param {string} projectRoot
 * @param {string} feature
 * @param {string} currentPhase
 * @returns {boolean}
 */
function shouldAutoTransition(projectRoot, feature, currentPhase) {
  const level = getAutomationLevel(projectRoot);
  if (level === 'manual') return false;

  // full-auto: reviewCheckpoints에 포함된 phase는 자동 전환 안 함
  if (level === 'full-auto') {
    const checkpoints = getReviewCheckpoints(projectRoot);
    return !checkpoints.includes(currentPhase);
  }

  // semi-auto: deliverables 완료 여부 확인
  try {
    const { checkPhaseDeliverables } = require('./phase');
    const result = checkPhaseDeliverables(projectRoot, feature, currentPhase);
    if (!result.complete) return false;

    // analyze phase는 matchRate >= 90% 추가 검증
    if (currentPhase === 'analyze') {
      const { status: pdcaStatus } = require('./index');
      const statusData = pdcaStatus.loadStatus(projectRoot, feature);
      const matchRate = statusData?.phases?.analyze?.matchRate;
      if (matchRate) {
        return matchRate.totalRate >= 90;
      }
      return false;
    }

    return true;
  } catch { /* ignore */ }

  return false;
}

/**
 * full-auto 모드에서 리뷰 체크포인트 조회
 */
function getReviewCheckpoints(projectRoot) {
  try {
    const configPath = path.join(projectRoot, 'demodev.config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const checkpoints = config?.pdca?.fullAuto?.reviewCheckpoints;
      if (Array.isArray(checkpoints)) return checkpoints;
    }
  } catch { /* ignore */ }
  return ['design'];
}

/**
 * 자동 전환 여부 (phase 단위 판단)
 * manual → false
 * semi-auto → phase === 'analyze' && matchRate >= 90
 * full-auto → !reviewCheckpoints.includes(phase)
 */
function shouldAutoAdvance(projectRoot, phase) {
  const level = getAutomationLevel(projectRoot);
  if (level === 'manual') return false;

  if (level === 'semi-auto') {
    // semi-auto에서는 analyze phase만 matchRate 조건으로 자동 전환
    return phase === 'analyze';
  }

  // full-auto: reviewCheckpoints에 포함된 phase는 수동 리뷰
  const checkpoints = getReviewCheckpoints(projectRoot);
  return !checkpoints.includes(phase);
}

/**
 * 다음 자동 실행 trigger 생성
 */
function generateAutoTrigger(projectRoot, currentPhase, context = {}) {
  const level = getAutomationLevel(projectRoot);
  if (level === 'manual') return null;

  const { PHASE_INFO } = require('./phase');
  const info = PHASE_INFO[currentPhase];
  if (!info || !info.next) return null;

  const nextPhase = info.next;
  const feature = context.feature || '';

  // semi-auto: analyze에서 matchRate >= 90이면 iterate 자동 진행
  if (level === 'semi-auto') {
    if (currentPhase !== 'analyze') return null;
    const matchRate = context.matchRate || 0;
    if (matchRate < 90) return null;
  }

  // full-auto: reviewCheckpoints에 걸리면 자동 실행 안 함
  if (level === 'full-auto') {
    const checkpoints = getReviewCheckpoints(projectRoot);
    if (checkpoints.includes(currentPhase)) return null;
  }

  return {
    nextPhase,
    command: `/pdca ${nextPhase} ${feature}`.trim(),
    autoExecute: level === 'full-auto',
  };
}

/**
 * full-auto 모드 여부
 */
function isFullAutoMode(projectRoot) {
  return getAutomationLevel(projectRoot) === 'full-auto';
}

/**
 * manual 모드 여부
 */
function isManualMode(projectRoot) {
  return getAutomationLevel(projectRoot) === 'manual';
}

module.exports = {
  calculateMatchRate, needsIteration, identifyGaps, getAutomationLevel, shouldAutoTransition, DEFAULT_WEIGHTS,
  getReviewCheckpoints, shouldAutoAdvance, generateAutoTrigger, isFullAutoMode, isManualMode,
};
