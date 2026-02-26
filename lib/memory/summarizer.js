/**
 * Session Summarizer
 * Stop hook에서 구조화 요약 생성
 *
 * 1. Anthropic API (Haiku) 10초 타임아웃
 * 2. 실패 시 template 기반 fallback
 *
 * 저장 위치: {projectRoot}/.demodev/sessions/latest-summary.json
 */
const path = require('path');
const fs = require('fs');
const { io } = require('../core');

const DEMODEV_DIR = '.demodev';
const SESSIONS_DIR = 'sessions';
const LATEST_SUMMARY_FILE = 'latest-summary.json';
const ARCHIVE_DIR = 'archive';
const MAX_ARCHIVE = 10;
const SUMMARY_TIMEOUT_MS = 10000;

function getSummaryPath(projectRoot) {
  return path.join(projectRoot, DEMODEV_DIR, SESSIONS_DIR, LATEST_SUMMARY_FILE);
}

function getArchiveDir(projectRoot) {
  return path.join(projectRoot, DEMODEV_DIR, SESSIONS_DIR, ARCHIVE_DIR);
}

/**
 * LLM 기반 요약 생성 (Haiku, 10초 타임아웃)
 */
async function tryLlmSummary(transcript, timeoutMs = SUMMARY_TIMEOUT_MS) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const truncated = typeof transcript === 'string'
      ? transcript.substring(0, 8000)
      : JSON.stringify(transcript).substring(0, 8000);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Summarize this coding session into structured JSON. Return ONLY valid JSON.

Format:
{
  "request": "user's main request (1 sentence, Korean preferred)",
  "investigated": ["files/topics analyzed"],
  "learned": ["key findings"],
  "completed": ["tasks done"],
  "next_steps": ["remaining work"],
  "notes": null
}

Transcript:
${truncated}`,
        }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Template 기반 요약 (fallback) — observations 데이터 활용
 */
function buildTemplateSummary(hookData, projectRoot) {
  const transcript = hookData?.transcript || hookData?.content || '';
  const text = typeof transcript === 'string' ? transcript : '';

  let contextTask = null;
  try {
    const contextPath = path.join(projectRoot, DEMODEV_DIR, 'context.md');
    const content = fs.readFileSync(contextPath, 'utf-8');
    const taskMatch = content.match(/##\s*현재 작업[^\n]*\n([^\n]+)/);
    if (taskMatch) contextTask = taskMatch[1].trim();
  } catch { /* ignore */ }

  // observations에서 completed 항목 보강
  let obsCompleted = [];
  try {
    const sessionLog = require('./session-log');
    const stats = sessionLog.getObservationStats(projectRoot);
    if (stats.filesModified.length > 0) {
      obsCompleted = stats.filesModified.slice(0, 5).map(f => path.basename(f) + ' 수정');
    }
  } catch { /* ignore */ }

  const textCompleted = extractCompleted(text);
  const completed = [...new Set([...obsCompleted, ...textCompleted])].slice(0, 5);

  return {
    request: contextTask || extractFirstMeaningful(text) || '(요약 없음)',
    investigated: [],
    learned: [],
    completed,
    next_steps: [],
    notes: null,
  };
}

function extractFirstMeaningful(text) {
  if (!text) return null;
  const line = text.split('\n').find(l => l.trim().length > 10);
  return line ? line.trim().substring(0, 200) : null;
}

function extractCompleted(text) {
  if (!text) return ['(세션 작업 완료)'];
  const completed = [];
  const patterns = [
    /(?:created?|생성|추가)\s+([^\n]{5,80})/gi,
    /(?:modified?|수정|변경)\s+([^\n]{5,80})/gi,
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(text)) !== null && completed.length < 5) {
      completed.push(m[0].trim());
    }
  }
  return completed.length > 0 ? completed : ['(세션 작업 완료)'];
}

/**
 * 요약 생성 (LLM 시도 → template fallback)
 */
async function generateSummary(projectRoot, hookData) {
  const transcript = hookData?.transcript || hookData?.content || '';

  const llmSummary = await tryLlmSummary(transcript);
  if (llmSummary) {
    return { source: 'llm', summary: llmSummary };
  }

  return { source: 'template', summary: buildTemplateSummary(hookData, projectRoot) };
}

/**
 * 요약 저장 (latest + archive)
 */
function saveSummary(projectRoot, sessionData, summaryResult) {
  const sessionsDir = path.join(projectRoot, DEMODEV_DIR, SESSIONS_DIR);
  io.ensureDir(sessionsDir);

  const latestPath = getSummaryPath(projectRoot);

  // observations 기반 리치 stats
  let obsStats = { total: 0, filesModified: [], commandsRun: [], skillsUsed: [] };
  try {
    const sessionLog = require('./session-log');
    obsStats = sessionLog.getObservationStats(projectRoot);
  } catch { /* ignore */ }

  const doc = {
    sessionId: sessionData?.sessionId || `session-${Date.now()}`,
    completedAt: new Date().toISOString(),
    project: sessionData?.project || path.basename(projectRoot),
    source: summaryResult.source,
    summary: summaryResult.summary,
    stats: {
      promptCount: sessionData?.promptNumber || 0,
      toolUses: obsStats.total,
      filesModified: obsStats.filesModified,
      commandsRun: obsStats.commandsRun,
      skillsUsed: obsStats.skillsUsed,
    },
    prompts: sessionData?.prompts || [],
  };

  // read-archive-write를 withFileLock으로 원자적 처리
  // 같은 세션이면 덮어쓰기, 다른 세션이면 archive 후 저장
  io.withFileLock(latestPath, () => {
    const existing = io.readJson(latestPath);
    if (existing && existing.sessionId && existing.sessionId !== doc.sessionId) {
      archiveSummary(projectRoot, existing);
    }
    io.writeJson(latestPath, doc);
  });

  return doc;
}

function archiveSummary(projectRoot, summaryDoc) {
  const archiveDir = getArchiveDir(projectRoot);
  io.ensureDir(archiveDir);

  const ts = (summaryDoc.completedAt || new Date().toISOString())
    .replace(/[:.]/g, '-').substring(0, 19);
  const suffix = summaryDoc.sessionId ? `-${summaryDoc.sessionId.substring(0, 8)}` : '';
  io.writeJson(path.join(archiveDir, `${ts}${suffix}.json`), summaryDoc);

  // archive 최대 유지
  try {
    const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json')).sort();
    if (files.length > MAX_ARCHIVE) {
      for (const f of files.slice(0, files.length - MAX_ARCHIVE)) {
        fs.unlinkSync(path.join(archiveDir, f));
      }
    }
  } catch { /* ignore */ }
}

function loadLatestSummary(projectRoot) {
  return io.readJson(getSummaryPath(projectRoot));
}

module.exports = {
  generateSummary,
  saveSummary,
  loadLatestSummary,
  getSummaryPath,
  buildTemplateSummary,
};
