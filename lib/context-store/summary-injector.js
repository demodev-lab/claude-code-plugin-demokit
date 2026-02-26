/**
 * Summary Injector
 * 이전 세션 요약을 마크다운으로 렌더링
 *
 * - SessionStart: systemMessage용 간략 요약 (buildSystemMessageLines)
 * - UserPromptSubmit: hookSpecificOutput용 상세 마크다운 (buildHookSpecificOutput)
 * - Token budget: 최근 3세션만 로딩
 */
const path = require('path');
const fs = require('fs');
const { io } = require('../core');

const DEMODEV_DIR = '.demodev';
const SESSIONS_DIR = 'sessions';
const MAX_SESSIONS = 3;

/**
 * hookSpecificOutput용 마크다운 (UserPromptSubmit 전용)
 * XML 태그로 감싸 Claude가 컨텍스트로 인식
 */
function buildHookSpecificOutput(projectRoot) {
  const summaries = loadRecentSummaries(projectRoot, MAX_SESSIONS);
  if (summaries.length === 0) return null;

  const sections = summaries.map(renderSummaryMarkdown);
  return `<demokit-context>\n${sections.join('\n\n---\n\n')}\n</demokit-context>`;
}

/**
 * systemMessage용 요약 라인 (SessionStart 전용)
 * 최신 1건만 간략 표시
 */
function buildSystemMessageLines(projectRoot) {
  const summaries = loadRecentSummaries(projectRoot, 1);
  if (summaries.length === 0) return [];

  const latest = summaries[0];
  const s = latest.summary;
  const lines = ['[Session] 이전 세션 요약:'];

  if (s.request) lines.push(`  요청: ${s.request}`);
  if (Array.isArray(s.completed) && s.completed.length > 0) lines.push(`  완료: ${s.completed.slice(0, 3).join(', ')}`);
  if (Array.isArray(s.next_steps) && s.next_steps.length > 0) lines.push(`  다음: ${s.next_steps.slice(0, 3).join(', ')}`);
  const st = latest.stats;
  if (st?.toolUses > 0) {
    const parts = [`도구 ${st.toolUses}회`];
    if (st.filesModified?.length > 0) parts.push(`파일 ${st.filesModified.length}개 수정`);
    if (st.skillsUsed?.length > 0) parts.push(`스킬: ${st.skillsUsed.join(', ')}`);
    lines.push(`  활동: ${parts.join(', ')}`);
  }
  if (latest.completedAt) lines.push(`  시간: ${latest.completedAt}`);

  return lines;
}

/**
 * 최근 N개 세션 요약 로드 (latest + archive, 시간 역순)
 */
function loadRecentSummaries(projectRoot, maxCount) {
  const summaries = [];

  // 1. latest-summary.json
  const latestPath = path.join(projectRoot, DEMODEV_DIR, SESSIONS_DIR, 'latest-summary.json');
  const latest = io.readJson(latestPath);
  if (latest?.summary) {
    summaries.push(latest);
  }

  if (summaries.length >= maxCount) return summaries;

  // 2. archive (역순)
  const archiveDir = path.join(projectRoot, DEMODEV_DIR, SESSIONS_DIR, 'archive');
  try {
    const files = fs.readdirSync(archiveDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    for (const file of files) {
      if (summaries.length >= maxCount) break;
      const data = io.readJson(path.join(archiveDir, file));
      if (data?.summary) summaries.push(data);
    }
  } catch { /* archive 없으면 무시 */ }

  return summaries;
}

/**
 * 단일 요약 → 마크다운 렌더링
 */
function renderSummaryMarkdown(doc) {
  const s = doc.summary;
  const date = doc.completedAt ? doc.completedAt.substring(0, 10) : '날짜 없음';
  const lines = [`## 이전 작업 컨텍스트 (${date})`];

  if (s.request) {
    lines.push('', '### 요청', s.request);
  }
  if (Array.isArray(s.investigated) && s.investigated.length > 0) {
    lines.push('', '### 조사/분석');
    for (const item of s.investigated) lines.push(`- ${item}`);
  }
  if (Array.isArray(s.learned) && s.learned.length > 0) {
    lines.push('', '### 학습');
    for (const item of s.learned) lines.push(`- ${item}`);
  }
  if (Array.isArray(s.completed) && s.completed.length > 0) {
    lines.push('', '### 완료한 작업');
    for (const item of s.completed) lines.push(`- ${item}`);
  }
  if (Array.isArray(s.next_steps) && s.next_steps.length > 0) {
    lines.push('', '### 다음 단계');
    for (const item of s.next_steps) lines.push(`- ${item}`);
  }
  if (s.notes) {
    lines.push('', '### 참고', s.notes);
  }

  // stats 섹션 (Phase 2: 관찰 데이터)
  const st = doc.stats;
  if (st?.filesModified?.length > 0) {
    lines.push('', '### 수정한 파일');
    for (const f of st.filesModified.slice(0, 10)) lines.push(`- ${f}`);
  }

  return lines.join('\n');
}

module.exports = {
  buildHookSpecificOutput,
  buildSystemMessageLines,
  loadRecentSummaries,
  renderSummaryMarkdown,
};
