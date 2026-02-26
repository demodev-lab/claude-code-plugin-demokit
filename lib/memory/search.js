/**
 * Memory Search Engine
 * JSON/JSONL 기반 세션 데이터 검색
 *
 * - 세션 요약 full-text search
 * - Observation 필터링 (type, file, concept, date)
 * - MCP 서버 백엔드
 */
const fs = require('fs');
const path = require('path');
const { io } = require('../core');

const DEMODEV_DIR = '.demodev';
const SESSIONS_DIR = 'sessions';

/**
 * 모든 세션 요약 로드 (latest + archive, 시간 역순)
 */
function loadAllSummaries(projectRoot) {
  const summaries = [];
  const sessionsDir = path.join(projectRoot, DEMODEV_DIR, SESSIONS_DIR);

  // latest
  const latest = io.readJson(path.join(sessionsDir, 'latest-summary.json'));
  if (latest?.summary) summaries.push(latest);

  // archive
  const archiveDir = path.join(sessionsDir, 'archive');
  try {
    const files = fs.readdirSync(archiveDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    for (const file of files) {
      const data = io.readJson(path.join(archiveDir, file));
      if (data?.summary) summaries.push(data);
    }
  } catch { /* ignore */ }

  return summaries;
}

/**
 * 세션 요약 검색
 * @param {string} projectRoot
 * @param {string} query - 검색어 (공백 구분 AND)
 * @param {Object} options - { limit, dateFrom, dateTo }
 */
function searchSessions(projectRoot, query, options = {}) {
  const summaries = loadAllSummaries(projectRoot);
  const limit = options.limit || 10;

  return summaries
    .filter(s => matchesSummaryQuery(s, query, options))
    .slice(0, limit)
    .map(s => ({
      sessionId: s.sessionId,
      completedAt: s.completedAt,
      project: s.project,
      source: s.source,
      summary: s.summary,
      stats: s.stats,
    }));
}

function matchesSummaryQuery(summary, query, options) {
  // 날짜 필터
  if (options.dateFrom && summary.completedAt < options.dateFrom) return false;
  if (options.dateTo && summary.completedAt > options.dateTo) return false;

  // 텍스트 검색
  if (!query) return true;
  const text = JSON.stringify(summary.summary).toLowerCase();
  return query.toLowerCase().split(/\s+/).every(term => text.includes(term));
}

/**
 * Observation 검색
 * @param {string} projectRoot
 * @param {Object} options - { query, type, observationType, file, concept, limit }
 */
function searchObservations(projectRoot, options = {}) {
  const sessionLog = require('./session-log');
  const observations = sessionLog.readObservations(projectRoot);
  const limit = options.limit || 20;

  return observations
    .filter(o => matchesObservationQuery(o, options))
    .slice(-limit)
    .reverse();
}

function matchesObservationQuery(obs, options) {
  if (options.type && obs.type !== options.type) return false;
  if (options.observationType && obs.observationType !== options.observationType) return false;

  if (options.file) {
    if (!obs.file || !obs.file.toLowerCase().includes(options.file.toLowerCase())) return false;
  }

  if (options.concept) {
    if (!obs.concepts || !obs.concepts.includes(options.concept)) return false;
  }

  if (options.query) {
    const text = JSON.stringify(obs).toLowerCase();
    if (!options.query.toLowerCase().split(/\s+/).every(t => text.includes(t))) return false;
  }

  return true;
}

/**
 * 특정 세션 요약 조회
 * @param {string} projectRoot
 * @param {string} [sessionId] - 생략 시 최신
 */
function getSession(projectRoot, sessionId) {
  const summaries = loadAllSummaries(projectRoot);
  if (!sessionId) return summaries[0] || null;
  return summaries.find(s => s.sessionId === sessionId) || null;
}

/**
 * Observation 타입별 통계
 */
function getObservationTypeStats(projectRoot) {
  const sessionLog = require('./session-log');
  const observations = sessionLog.readObservations(projectRoot);
  const typeCount = {};
  const conceptCount = {};

  for (const obs of observations) {
    const ot = obs.observationType || obs.type || 'unknown';
    typeCount[ot] = (typeCount[ot] || 0) + 1;

    if (obs.concepts) {
      for (const c of obs.concepts) {
        conceptCount[c] = (conceptCount[c] || 0) + 1;
      }
    }
  }

  return { total: observations.length, byType: typeCount, byConcept: conceptCount };
}

module.exports = {
  searchSessions,
  searchObservations,
  getSession,
  loadAllSummaries,
  getObservationTypeStats,
};
