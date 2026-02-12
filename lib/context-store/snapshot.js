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
  const gradle = cache.get('gradle');
  const project = cache.get('project');
  const level = cache.get('level');

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

  // 도메인 목록
  let domains = [];
  try {
    const { projectAnalyzer } = require(path.join(__dirname, '..', 'spring'));
    const projectInfo = projectAnalyzer.analyzeProject(projectRoot);
    domains = projectInfo.domains || [];
  } catch { /* ignore */ }

  return { gradle, project, level, pdcaFeatures, loopState, domains };
}

module.exports = { collectState };
