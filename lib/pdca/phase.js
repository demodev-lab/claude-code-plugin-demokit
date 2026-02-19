/**
 * PDCA Phase 정의 및 전이 규칙
 */

const PHASES = ['plan', 'design', 'do', 'analyze', 'iterate', 'report'];

const PHASE_INFO = {
  plan: {
    name: 'Plan',
    description: '요구사항 정의 + API 초안 + 데이터 모델 초안',
    agent: 'spring-architect',
    template: 'plan.template.md',
    next: 'design',
    prev: null,
  },
  design: {
    name: 'Design',
    description: 'DB 스키마 상세 + API 상세 + 패키지 구조',
    agent: 'spring-architect',
    template: 'design.template.md',
    next: 'do',
    prev: 'plan',
  },
  do: {
    name: 'Do',
    description: 'Entity → Repo → Service → Controller → DTO → Test 구현',
    agent: 'domain-expert',
    template: 'do.template.md',
    next: 'analyze',
    prev: 'design',
  },
  analyze: {
    name: 'Analyze',
    description: '설계 vs 구현 Gap 분석, Match Rate 산출',
    agent: 'gap-detector',
    template: 'analysis.template.md',
    next: 'iterate',
    prev: 'do',
  },
  iterate: {
    name: 'Iterate',
    description: 'Match Rate < 90% 시 자동 수정 반복',
    agent: 'pdca-iterator',
    template: 'iteration-report.template.md',
    next: 'report',
    prev: 'analyze',
  },
  report: {
    name: 'Report',
    description: '완료 보고서 생성',
    agent: 'report-generator',
    template: 'report.template.md',
    next: null,
    prev: 'iterate',
  },
};

/**
 * phase 유효성 검사
 */
function isValidPhase(phase) {
  return PHASES.includes(phase);
}

/**
 * 다음 phase 반환
 */
function getNextPhase(currentPhase) {
  const info = PHASE_INFO[currentPhase];
  return info ? info.next : null;
}

/**
 * 이전 phase 반환
 */
function getPrevPhase(currentPhase) {
  const info = PHASE_INFO[currentPhase];
  return info ? info.prev : null;
}

/**
 * phase 정보 반환
 */
function getPhaseInfo(phase) {
  return PHASE_INFO[phase] || null;
}

/**
 * phase 전이 가능 여부 (이전 phase가 완료되었는지)
 */
function canTransition(currentPhase, targetPhase, phases) {
  if (!isValidPhase(targetPhase)) return false;
  if (targetPhase === 'plan') return !currentPhase || currentPhase === 'plan'; // 초기 시작 또는 plan 유지

  const prevPhase = getPrevPhase(targetPhase);
  if (!prevPhase) return false;
  return phases?.[prevPhase]?.status === 'completed';
}

const fs = require('fs');
const path = require('path');
const { debug: log } = require('../core');

const PHASE_DELIVERABLES = {
  plan:    [{ name: 'plan.md', pattern: '.pdca/{feature}/**/plan*.md' }],
  design:  [{ name: 'design.md', pattern: '.pdca/{feature}/**/design*.md' }],
  do:      [{ name: 'Java files', pattern: 'src/**/entity/*.java' }],
  analyze: [{ name: 'analysis.md', pattern: '.pdca/{feature}/**/analysis*.md' }],
  iterate: [{ name: 'iteration report', pattern: '.pdca/{feature}/**/iteration*.md' }],
  report:  [{ name: 'report.md', pattern: '.pdca/{feature}/**/report*.md' }],
};

const deliverableCache = new Map();

function resolveDeliverablesKey(projectRoot, feature, phase) {
  return `${projectRoot}||${feature || ''}||${phase || ''}`;
}

function collectDirSignature(targetPath) {
  try {
    const stat = fs.statSync(targetPath);
    return `${stat.mtimeMs}`;
  } catch {
    return 'missing';
  }
}

function buildDeliverablesSignature(projectRoot, feature, phase) {
  const deliverables = PHASE_DELIVERABLES[phase] || [];
  const parts = ['v1'];
  for (const item of deliverables) {
    const resolved = item.pattern.replace(/\{feature\}/g, feature);
    const basePath = path.join(projectRoot, resolved.split('**/')[0] || '.');
    parts.push(`${resolved}:${collectDirSignature(basePath)}`);
  }
  return parts.join('|');
}

function cloneDeliverableResult(result) {
  return {
    complete: result.complete,
    missing: [...result.missing],
    items: result.items.map((item) => ({ ...item, files: [...item.files] })),
  };
}

/**
 * Phase deliverables 완료 여부 확인
 * @param {string} projectRoot
 * @param {string} feature
 * @param {string} phase
 * @returns {{ complete: boolean, missing: string[], items: Array }}
 */
function checkPhaseDeliverables(projectRoot, feature, phase) {
  const deliverables = PHASE_DELIVERABLES[phase];
  if (!deliverables || deliverables.length === 0) {
    return { complete: true, missing: [], items: [] };
  }

  const cacheKey = resolveDeliverablesKey(projectRoot, feature, phase);
  const signature = buildDeliverablesSignature(projectRoot, feature, phase);
  const cached = deliverableCache.get(cacheKey);
  if (cached && cached.signature === signature) {
    log.debug('pdca-phase', `deliverables cache hit: ${phase}`, { feature, signature });
    return cloneDeliverableResult(cached.result);
  }

  const missing = [];
  const items = [];

  const shouldShortCircuit = phase === 'do';
  for (const d of deliverables) {
    const resolvedPattern = d.pattern.replace(/\{feature\}/g, feature);
    const searchOptions = shouldShortCircuit ? { limit: 1 } : {};
    const found = findMatchingFiles(projectRoot, resolvedPattern, searchOptions);
    items.push({ name: d.name, pattern: resolvedPattern, found: found.length > 0, files: found });
    if (found.length === 0) {
      missing.push(d.name);
    }
  }
  const result = { complete: missing.length === 0, missing, items };
  deliverableCache.set(cacheKey, { signature, result: cloneDeliverableResult(result) });
  log.debug('pdca-phase', `deliverables cache update: ${phase}`, {
    feature,
    complete: result.complete,
    missingCount: result.missing.length,
  });
  return result;
}

/**
 * 간단한 glob 패턴 매칭 (** 지원)
 */
function findMatchingFiles(projectRoot, pattern, options = {}) {
  const results = [];
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.floor(options.limit)) : null;
  try {
    const parts = pattern.split('**/');
    const baseDir = path.join(projectRoot, parts[0]);
    const lastSegment = parts.length > 1 ? parts[parts.length - 1] : '';

    // "entity/*.java" → dirSegment="entity", filePattern="*.java"
    const slashIdx = lastSegment.lastIndexOf('/');
    const dirSegment = slashIdx >= 0 ? lastSegment.substring(0, slashIdx) : '';
    const filePattern = slashIdx >= 0 ? lastSegment.substring(slashIdx + 1) : lastSegment;
    const terminalDir = dirSegment ? path.basename(dirSegment) : '';

    if (!fs.existsSync(baseDir)) return results;

    const walkDir = (dir, scanOnlyCurrentDirectory) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (limit !== null && results.length >= limit) return true;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (scanOnlyCurrentDirectory) {
              continue;
            }
            if (!terminalDir || entry.name === terminalDir) {
              if (walkDir(fullPath, Boolean(terminalDir))) return true;
            } else {
              if (walkDir(fullPath, false)) return true;
            }
          } else if (matchSimplePattern(entry.name, filePattern)) {
            // 디렉토리 세그먼트 검증
            if (!terminalDir || path.basename(path.dirname(fullPath)) === terminalDir) {
              results.push(fullPath);
              if (limit !== null && results.length >= limit) return true;
            }
          }
        }
      } catch { /* ignore */ }
      return false;
    };

    walkDir(baseDir, false);
  } catch { /* ignore */ }
  return results;
}

function matchSimplePattern(filename, pattern) {
  if (!pattern) return true;
  // pattern: "plan*.md" → startsWith "plan" && endsWith ".md"
  if (pattern.includes('*')) {
    const parts = pattern.split('*');
    const prefix = parts[0] || '';
    const suffix = parts[parts.length - 1] || '';
    return filename.startsWith(prefix) && filename.endsWith(suffix);
  }
  return filename === pattern;
}

/**
 * Phase 진행 상태 시각적 요약
 * @param {Object} status - PDCA status 객체
 * @returns {string}
 */
function generatePhaseSummary(status) {
  if (!status || !status.phases) return '';

  const icons = {
    completed: '\u2705',
    'in-progress': '\uD83D\uDD04',
    pending: '\u2B1C',
  };

  return PHASES.map(phase => {
    const phaseStatus = status.phases[phase]?.status || 'pending';
    const icon = icons[phaseStatus] || '\u2B1C';
    const isCurrent = status.currentPhase === phase;
    const label = PHASE_INFO[phase].name;
    return `${icon} ${label}${isCurrent ? ' (현재)' : ''}`;
  }).join('  ');
}

module.exports = {
  PHASES, PHASE_INFO, isValidPhase, getNextPhase, getPrevPhase, getPhaseInfo, canTransition,
  PHASE_DELIVERABLES, checkPhaseDeliverables, generatePhaseSummary,
};
