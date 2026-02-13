/**
 * PDCA Archive & Cleanup
 * 완료된 feature를 아카이브하여 .pdca/ 정리
 */
const path = require('path');
const fs = require('fs');
const { io } = require('../core');

const PDCA_DIR = '.pdca';
const ARCHIVE_DIR = '_archive';

/**
 * 단일 feature 아카이브
 * status.json + 관련 문서를 .pdca/_archive/{feature}_{timestamp}/ 로 이동
 */
function archiveFeature(projectRoot, featureName) {
  const pdcaDir = path.join(projectRoot, PDCA_DIR);
  const statusFile = path.join(pdcaDir, `${featureName}.status.json`);
  const featureDocDir = path.join(pdcaDir, featureName);

  if (!io.fileExists(statusFile)) {
    return { success: false, message: `Feature '${featureName}' 상태 파일이 없습니다` };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archiveDir = path.join(pdcaDir, ARCHIVE_DIR, `${featureName}_${timestamp}`);
  io.ensureDir(archiveDir);

  // status.json 이동
  fs.renameSync(statusFile, path.join(archiveDir, `${featureName}.status.json`));

  // feature 문서 디렉토리 이동 (존재하면)
  if (io.fileExists(featureDocDir) && fs.statSync(featureDocDir).isDirectory()) {
    const destDocDir = path.join(archiveDir, featureName);
    fs.renameSync(featureDocDir, destDocDir);
  }

  return {
    success: true,
    message: `'${featureName}' 아카이브 완료 → ${PDCA_DIR}/${ARCHIVE_DIR}/${featureName}_${timestamp}/`,
    archivePath: archiveDir,
  };
}

/**
 * report 단계가 completed인 모든 feature 일괄 아카이브
 */
function cleanupCompleted(projectRoot) {
  const pdcaDir = path.join(projectRoot, PDCA_DIR);
  if (!io.fileExists(pdcaDir)) return { archived: [], message: 'PDCA 디렉토리 없음' };

  const files = io.listFiles(pdcaDir, /\.status\.json$/);
  const archived = [];

  for (const f of files) {
    // _archive 디렉토리 내 파일은 무시
    if (f.includes(ARCHIVE_DIR)) continue;

    const data = io.readJson(f);
    if (!data) continue;

    // report 단계가 completed이면 아카이브
    const isCompleted = data.phases?.report?.status === 'completed' ||
                        data.currentPhase === 'report' && data.phases?.report?.status === 'completed';

    if (isCompleted) {
      const result = archiveFeature(projectRoot, data.feature);
      if (result.success) {
        archived.push(data.feature);
      }
    }
  }

  return {
    archived,
    message: archived.length > 0
      ? `${archived.length}개 feature 아카이브 완료: ${archived.join(', ')}`
      : '아카이브할 완료된 feature가 없습니다',
  };
}

/**
 * 아카이브된 feature 목록 조회
 */
function listArchived(projectRoot) {
  const archiveDir = path.join(projectRoot, PDCA_DIR, ARCHIVE_DIR);
  if (!io.fileExists(archiveDir)) return [];

  try {
    const entries = fs.readdirSync(archiveDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => {
        const parts = e.name.match(/^(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})$/);
        return {
          dirName: e.name,
          feature: parts ? parts[1] : e.name,
          archivedAt: parts ? parts[2].replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3') : null,
        };
      });
  } catch {
    return [];
  }
}

module.exports = { archiveFeature, cleanupCompleted, listArchived };
