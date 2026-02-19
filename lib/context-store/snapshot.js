/**
 * Context State Snapshot
 * 여러 스크립트에서 공통으로 사용하는 상태 수집 로직 통합
 *
 * 사용처: context-compaction.js, stop-handler.js, task-completed.js
 */
const fs = require('fs');
const path = require('path');

const STATIC_CACHE_REL_PATH = path.join('.demodev', 'cache', 'snapshot-static-v1.json');
const STATIC_CACHE_TTL_DEFAULT_MS = 30000;

function getStaticCachePath(projectRoot) {
  return path.join(projectRoot, STATIC_CACHE_REL_PATH);
}

function getStaticCacheTtlMs() {
  const raw = Number(process.env.DEMOKIT_SNAPSHOT_CACHE_TTL_MS);
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return STATIC_CACHE_TTL_DEFAULT_MS;
}

function loadStaticStateCache(projectRoot) {
  const cachePath = getStaticCachePath(projectRoot);
  try {
    const raw = fs.readFileSync(cachePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const ttlMs = getStaticCacheTtlMs();
    if (ttlMs === 0) return null;

    const cachedAtMs = Number(parsed.cachedAtMs);
    if (!Number.isFinite(cachedAtMs)) return null;
    if (Date.now() - cachedAtMs > ttlMs) return null;

    return parsed.state && typeof parsed.state === 'object' ? parsed.state : null;
  } catch {
    return null;
  }
}

function saveStaticStateCache(projectRoot, state) {
  if (getStaticCacheTtlMs() === 0) return;

  const cachePath = getStaticCachePath(projectRoot);
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({
      version: 1,
      cachedAtMs: Date.now(),
      state,
    }), 'utf-8');
  } catch {
    // cache write 실패는 무시 (핫패스 안정성 우선)
  }
}

/**
 * 프로젝트 상태 전체 수집
 * @param {string} projectRoot - 프로젝트 루트 경로
 * @param {object} cache - core.cache 모듈
 * @returns {{ gradle, project, level, pdcaFeatures, loopState, domains }}
 */
function collectState(projectRoot, cache) {
  let gradle = cache.get('gradle');
  let project = cache.get('project');
  let level = cache.get('level');

  // Hook은 별도 프로세스로 실행되어 인메모리 cache가 비어있을 수 있음 → 디스크 캐시 우선 활용
  const staticFromDisk = (!gradle || !project || !level)
    ? loadStaticStateCache(projectRoot)
    : null;

  if (staticFromDisk) {
    gradle = gradle || staticFromDisk.gradle;
    project = project || staticFromDisk.project;
    level = level || staticFromDisk.level;
  }

  let staticStateUpdated = false;

  // static 상태가 부족하면 실제 분석 수행
  if (!gradle || !project || !level) {
    try {
      const { gradleParser, projectAnalyzer } = require(path.join(__dirname, '..', 'spring'));

      if (!gradle) {
        const buildGradlePath = path.join(projectRoot, 'build.gradle');
        const buildGradleKtsPath = path.join(projectRoot, 'build.gradle.kts');
        const gradlePath = fs.existsSync(buildGradleKtsPath) ? buildGradleKtsPath : buildGradlePath;
        gradle = gradleParser.parseGradleBuild(gradlePath);
      }

      if (!project) {
        project = projectAnalyzer.analyzeProject(projectRoot);
      }

      if (!level && gradle) {
        const levelResult = projectAnalyzer.detectProjectLevel(projectRoot, gradle.dependencies || []);
        level = levelResult.level;
      }

      staticStateUpdated = true;
    } catch { /* spring 모듈 로드 실패 시 무시 */ }
  }

  // 도메인 목록 (project가 있으면 재사용, 없으면 디스크 캐시/별도 조회)
  let domains = [];
  if (project && project.domains) {
    domains = project.domains;
  } else if (staticFromDisk && Array.isArray(staticFromDisk.domains)) {
    domains = staticFromDisk.domains;
  } else {
    try {
      const { projectAnalyzer } = require(path.join(__dirname, '..', 'spring'));
      const projectInfo = projectAnalyzer.analyzeProject(projectRoot);
      domains = projectInfo.domains || [];
      staticStateUpdated = true;
    } catch { /* ignore */ }
  }

  // 디스크 캐시 갱신 (cross-process 핫패스 최적화)
  if (staticStateUpdated) {
    saveStaticStateCache(projectRoot, {
      gradle,
      project,
      level,
      domains,
    });
  }

  // PDCA 상태 (동적)
  let pdcaFeatures = [];
  try {
    const { status: pdcaStatus } = require(path.join(__dirname, '..', 'pdca'));
    pdcaFeatures = pdcaStatus.listFeatures(projectRoot);
  } catch { /* ignore */ }

  // Loop 상태 (동적)
  let loopState = { active: false };
  try {
    const loopMod = require(path.join(__dirname, '..', 'loop', 'state'));
    loopState = loopMod.getState(projectRoot);
  } catch { /* ignore */ }

  return { gradle, project, level, pdcaFeatures, loopState, domains };
}

module.exports = { collectState, loadStaticStateCache, saveStaticStateCache, getStaticCacheTtlMs };
