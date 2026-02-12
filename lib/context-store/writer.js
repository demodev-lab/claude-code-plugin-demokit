/**
 * Context Store - MD 파일 기반 컨텍스트 영구 저장
 *
 * 저장 파일:
 * - .demodev/context.md       : 현재 작업 컨텍스트 (매 작업마다 갱신)
 * - .demodev/loop-log.md      : 루프 반복 결과 누적 (append)
 */
const fs = require('fs');
const path = require('path');

const DEMODEV_DIR = '.demodev';
const CONTEXT_FILE = 'context.md';
const LOOP_LOG_FILE = 'loop-log.md';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getContextPath(projectRoot) {
  return path.join(projectRoot, DEMODEV_DIR, CONTEXT_FILE);
}

function getLoopLogPath(projectRoot) {
  return path.join(projectRoot, DEMODEV_DIR, LOOP_LOG_FILE);
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * 현재 컨텍스트 MD 저장 (덮어쓰기)
 * 매 작업 완료, 중단, 컨텍스트 압축 시 호출
 */
function saveContext(projectRoot, { gradle, project, level, pdcaFeatures, loopState, recentChanges, currentTask, domains }) {
  const filePath = getContextPath(projectRoot);
  ensureDir(path.dirname(filePath));

  const lines = [
    `# demokit 작업 컨텍스트`,
    `> 최종 업데이트: ${timestamp()}`,
    '',
  ];

  // 프로젝트 정보
  lines.push('## 프로젝트');
  lines.push(`- Spring Boot: ${gradle?.springBootVersion || '?'}`);
  lines.push(`- Java: ${gradle?.javaVersion || '?'}`);
  lines.push(`- Base Package: ${project?.basePackage || '?'}`);
  lines.push(`- 레벨: ${level || '?'}`);
  if (gradle?.dependencies?.length) {
    lines.push(`- 의존성: ${gradle.dependencies.length}개`);
  }
  lines.push('');

  // 도메인 목록
  if (domains && domains.length > 0) {
    lines.push('## 도메인');
    lines.push(`- ${domains.join(', ')}`);
    lines.push('');
  }

  // PDCA 상태
  if (pdcaFeatures && pdcaFeatures.length > 0) {
    lines.push('## PDCA 상태');
    lines.push('| Feature | Phase | Match Rate |');
    lines.push('|---------|-------|------------|');
    pdcaFeatures.forEach(f => {
      lines.push(`| ${f.feature} | ${f.currentPhase || '-'} | ${f.matchRate || '-'} |`);
    });
    lines.push('');
  }

  // 현재 작업
  if (currentTask) {
    lines.push('## 현재 작업');
    lines.push(`- 설명: ${currentTask.description || '-'}`);
    lines.push(`- 상태: ${currentTask.status || '-'}`);
    if (currentTask.files && currentTask.files.length > 0) {
      lines.push(`- 변경 파일: ${currentTask.files.join(', ')}`);
    }
    lines.push('');
  }

  // Loop 상태
  if (loopState && loopState.active) {
    lines.push('## Loop 상태');
    lines.push(`- 활성: true`);
    lines.push(`- 반복: ${loopState.currentIteration}/${loopState.maxIterations}`);
    lines.push(`- 프롬프트: ${loopState.prompt}`);
    lines.push(`- 완료 신호: ${loopState.completionPromise}`);
    lines.push(`- 시작: ${loopState.startedAt || '-'}`);
    lines.push('');
  }

  // 최근 변경 이력 (기존 이력 보존 + 새 항목 추가)
  const existingHistory = readRecentHistory(projectRoot);
  const allHistory = [...existingHistory];
  if (recentChanges && recentChanges.length > 0) {
    recentChanges.forEach(change => {
      allHistory.push(`- [${timestamp()}] ${change}`);
    });
  }
  // 최근 50건만 유지
  const trimmedHistory = allHistory.slice(-50);
  if (trimmedHistory.length > 0) {
    lines.push('## 최근 변경 이력');
    trimmedHistory.forEach(h => lines.push(h));
    lines.push('');
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return filePath;
}

/**
 * 기존 context.md에서 최근 변경 이력 섹션 읽기
 */
function readRecentHistory(projectRoot) {
  const filePath = getContextPath(projectRoot);
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const historyMatch = content.match(/## 최근 변경 이력\n([\s\S]*?)(?=\n## |\n$|$)/);
    if (!historyMatch) return [];
    return historyMatch[1]
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('- ['));
  } catch { return []; }
}

/**
 * 현재 context.md 읽기
 */
function readContext(projectRoot) {
  const filePath = getContextPath(projectRoot);
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * 루프 반복 결과를 loop-log.md에 append
 */
function appendLoopLog(projectRoot, { iteration, maxIterations, prompt, result, nextAction }) {
  const filePath = getLoopLogPath(projectRoot);
  ensureDir(path.dirname(filePath));

  let content = '';

  // 파일이 없으면 헤더 생성
  if (!fs.existsSync(filePath)) {
    content += `# Loop 실행 로그\n`;
    content += `> 프롬프트: ${prompt}\n`;
    content += `> 시작: ${timestamp()}\n`;
    content += '\n';
  }

  // 반복 결과 append
  const entry = [
    `## 반복 ${iteration}/${maxIterations} (${timestamp()})`,
    '',
  ];

  if (result) {
    entry.push('### 결과');
    entry.push(result);
    entry.push('');
  }

  if (nextAction) {
    entry.push(`### 다음 액션`);
    entry.push(nextAction);
    entry.push('');
  }

  entry.push('---');
  entry.push('');

  fs.appendFileSync(filePath, entry.join('\n'), 'utf-8');
  return filePath;
}

/**
 * 루프 완료 시 loop-log.md에 요약 추가
 */
function finalizeLoopLog(projectRoot, { totalIterations, completionReason }) {
  const filePath = getLoopLogPath(projectRoot);
  if (!fs.existsSync(filePath)) return;

  const summary = [
    '',
    `## 루프 완료`,
    `- 종료 시각: ${timestamp()}`,
    `- 총 반복: ${totalIterations}회`,
    `- 종료 사유: ${completionReason}`,
    '',
  ];

  fs.appendFileSync(filePath, summary.join('\n'), 'utf-8');
  return filePath;
}

/**
 * 새 루프 시작 시 이전 loop-log.md 아카이브
 */
function archiveLoopLog(projectRoot) {
  const filePath = getLoopLogPath(projectRoot);
  if (!fs.existsSync(filePath)) return;

  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const archivePath = path.join(projectRoot, DEMODEV_DIR, `loop-log-${ts}.md`);
  fs.renameSync(filePath, archivePath);
  return archivePath;
}

/**
 * 변경 이력만 빠르게 추가 (context.md의 이력 섹션에 append)
 */
function appendChange(projectRoot, changeDescription) {
  const filePath = getContextPath(projectRoot);
  ensureDir(path.dirname(filePath));

  if (!fs.existsSync(filePath)) {
    // context.md가 없으면 최소한의 파일 생성
    const minimal = [
      `# demokit 작업 컨텍스트`,
      `> 최종 업데이트: ${timestamp()}`,
      '',
      '## 최근 변경 이력',
      `- [${timestamp()}] ${changeDescription}`,
      '',
    ];
    fs.writeFileSync(filePath, minimal.join('\n'), 'utf-8');
    return filePath;
  }

  // 기존 파일의 타임스탬프 갱신
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /> 최종 업데이트: .*/,
    `> 최종 업데이트: ${timestamp()}`
  );

  // 이력 섹션에 추가
  const historyEntry = `- [${timestamp()}] ${changeDescription}`;
  if (content.includes('## 최근 변경 이력')) {
    content = content.replace(
      '## 최근 변경 이력\n',
      `## 최근 변경 이력\n${historyEntry}\n`
    );
  } else {
    content += `\n## 최근 변경 이력\n${historyEntry}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

module.exports = {
  saveContext,
  readContext,
  appendLoopLog,
  finalizeLoopLog,
  archiveLoopLog,
  appendChange,
  getContextPath,
  getLoopLogPath,
  DEMODEV_DIR,
};
