/**
 * Context State Snapshot
 * 여러 스크립트에서 공통으로 사용하는 상태 수집 로직 통합
 *
 * 사용처: context-compaction.js, stop-handler.js, task-completed.js
 */
const path = require('path');

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

  // Hook은 별도 프로세스로 실행되어 인메모리 cache가 비어있을 수 있음 → fallback
  if (!gradle || !project) {
    try {
      const fs = require('fs');
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
    } catch { /* spring 모듈 로드 실패 시 무시 */ }
  }

  // PDCA 상태
  let pdcaFeatures = [];
  try {
    const { status: pdcaStatus } = require(path.join(__dirname, '..', 'pdca'));
    pdcaFeatures = pdcaStatus.listFeatures(projectRoot);
  } catch { /* ignore */ }

  // Loop 상태
  let loopState = { active: false };
  try {
    const loopMod = require(path.join(__dirname, '..', 'loop', 'state'));
    loopState = loopMod.getState(projectRoot);
  } catch { /* ignore */ }

  // 도메인 목록 (project가 있으면 재사용, 없으면 별도 조회)
  let domains = [];
  if (project && project.domains) {
    domains = project.domains;
  } else {
    try {
      const { projectAnalyzer } = require(path.join(__dirname, '..', 'spring'));
      const projectInfo = projectAnalyzer.analyzeProject(projectRoot);
      domains = projectInfo.domains || [];
    } catch { /* ignore */ }
  }

  return { gradle, project, level, pdcaFeatures, loopState, domains };
}

module.exports = { collectState };
