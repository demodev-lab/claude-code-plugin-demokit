/**
 * Session Context Preservation — Integration Test
 *
 * 전체 파이프라인 검증:
 *   세션A: PostToolUse → observations 기록 → Stop → 요약 생성/저장
 *   세션B: SessionStart → 이전 요약 로드 → UserPromptSubmit → 상세 컨텍스트 주입
 *
 * 실제 파일 시스템 사용 (임시 디렉토리, mock 없음)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

let tmpDir;

// 모듈 참조 (각 테스트마다 fresh require)
let io, sessionState, sessionLog, summarizer, summaryInjector, mode, search;

beforeEach(() => {
  jest.resetModules();

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-session-ctx-'));

  // .demodev/sessions 디렉토리 생성
  fs.mkdirSync(path.join(tmpDir, '.demodev', 'sessions', 'archive'), { recursive: true });

  // 모듈 로드 (실제 모듈 — mock 없음)
  io = require('../../lib/core/io');
  sessionState = require('../../lib/memory/state');
  sessionLog = require('../../lib/memory/session-log');
  summarizer = require('../../lib/memory/summarizer');
  summaryInjector = require('../../lib/context-store/summary-injector');
  mode = require('../../lib/memory/mode');
  search = require('../../lib/memory/search');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('세션 컨텍스트 보존 전체 흐름', () => {
  // ── Phase 1: 세션 상태 관리 ──

  it('initSession — 새 세션 생성 및 프롬프트 번호 증가', () => {
    const s1 = sessionState.initSession(tmpDir, 'sess-001');
    expect(s1.sessionId).toBe('sess-001');
    expect(s1.promptNumber).toBe(1);
    expect(s1.contextInjected).toBe(false);

    const s2 = sessionState.initSession(tmpDir, 'sess-001');
    expect(s2.promptNumber).toBe(2);

    // 다른 세션 ID → 리셋
    const s3 = sessionState.initSession(tmpDir, 'sess-002');
    expect(s3.promptNumber).toBe(1);
  });

  it('contextInjected — 1회 주입 후 중복 방지 플래그', () => {
    sessionState.initSession(tmpDir, 'sess-001');
    expect(sessionState.isContextInjected(tmpDir)).toBe(false);

    sessionState.markContextInjected(tmpDir);
    expect(sessionState.isContextInjected(tmpDir)).toBe(true);
  });

  // ── Phase 2: Observation 기록 ──

  it('appendObservation — write/bash/skill 기록 및 dedup', () => {
    const entry = { type: 'write', tool: 'Write', file: 'src/User.java' };
    expect(sessionLog.appendObservation(tmpDir, entry)).toBe(true);

    // 30초 내 동일 항목 → 중복 차단
    expect(sessionLog.appendObservation(tmpDir, entry)).toBe(false);

    // 다른 항목 → 추가
    expect(sessionLog.appendObservation(tmpDir, {
      type: 'bash', tool: 'Bash', command: 'gradlew test',
    })).toBe(true);

    const obs = sessionLog.readObservations(tmpDir);
    expect(obs).toHaveLength(2);
    expect(obs[0].type).toBe('write');
    expect(obs[1].type).toBe('bash');
  });

  it('getObservationStats — 통계 집계', () => {
    sessionLog.appendObservation(tmpDir, { type: 'write', tool: 'Write', file: 'A.java' });
    sessionLog.appendObservation(tmpDir, { type: 'write', tool: 'Write', file: 'B.java' });
    sessionLog.appendObservation(tmpDir, { type: 'bash', tool: 'Bash', command: 'gradlew build' });
    sessionLog.appendObservation(tmpDir, { type: 'skill', tool: 'Skill', skill: 'entity' });

    const stats = sessionLog.getObservationStats(tmpDir);
    expect(stats.total).toBe(4);
    expect(stats.filesModified).toEqual(expect.arrayContaining(['A.java', 'B.java']));
    expect(stats.commandsRun).toContain('gradlew build');
    expect(stats.skillsUsed).toContain('entity');
  });

  it('clearObservations — 새 세션 시작 시 초기화', () => {
    sessionLog.appendObservation(tmpDir, { type: 'write', tool: 'Write', file: 'X.java' });
    expect(sessionLog.readObservations(tmpDir)).toHaveLength(1);

    sessionLog.clearObservations(tmpDir);
    expect(sessionLog.readObservations(tmpDir)).toHaveLength(0);
  });

  // ── Phase 2: Mode classification ──

  it('mode.classifyFile — Spring Boot 파일 자동 분류', () => {
    const entity = mode.classifyFile('src/User.Entity.java');
    // .java$ 기본 fallback
    expect(entity.observationType).toBeDefined();

    const controller = mode.classifyFile('src/UserController.java');
    expect(controller.observationType).toBe('api-change');
    expect(controller.concepts).toContain('spring-pattern');

    const security = mode.classifyFile('src/SecurityConfig.java');
    expect(security.observationType).toBe('config-change');
    expect(security.concepts).toContain('security-concern');

    const sql = mode.classifyFile('schema.sql');
    expect(sql.observationType).toBe('entity-change');
  });

  it('mode.classifyCommand — 빌드/테스트 실패 분류', () => {
    const testPass = mode.classifyCommand('gradlew test', 0);
    expect(testPass.observationType).toBe('test-result');
    expect(testPass.concepts).not.toContain('test-failure');

    const testFail = mode.classifyCommand('gradlew test', 1);
    expect(testFail.observationType).toBe('test-result');
    expect(testFail.concepts).toContain('test-failure');

    const buildFail = mode.classifyCommand('gradlew build', 1);
    expect(buildFail.concepts).toContain('build-failure');
  });

  it('mode.classifySkill — skill 매핑', () => {
    expect(mode.classifySkill('entity').observationType).toBe('entity-change');
    expect(mode.classifySkill('security').concepts).toContain('security-concern');
    expect(mode.classifySkill('unknown-skill').observationType).toBe('discovery');
  });

  // ── Phase 1: 요약 생성/저장 ──

  it('buildTemplateSummary — template fallback 요약 생성', () => {
    // observations 데이터 활용
    sessionLog.appendObservation(tmpDir, { type: 'write', tool: 'Write', file: 'UserEntity.java' });
    sessionLog.appendObservation(tmpDir, { type: 'write', tool: 'Write', file: 'UserService.java' });

    const summary = summarizer.buildTemplateSummary(
      { transcript: 'User CRUD created 기능 구현' },
      tmpDir,
    );
    expect(summary.request).toBeTruthy();
    expect(summary.completed.length).toBeGreaterThan(0);
  });

  it('saveSummary — latest + archive 저장', () => {
    sessionLog.appendObservation(tmpDir, { type: 'write', tool: 'Write', file: 'A.java' });

    const sessionData = { sessionId: 'sess-A', project: 'test', promptNumber: 3 };
    const summaryResult = {
      source: 'template',
      summary: { request: '테스트 작업', completed: ['A.java 수정'], investigated: [], learned: [], next_steps: [], notes: null },
    };

    const doc = summarizer.saveSummary(tmpDir, sessionData, summaryResult);
    expect(doc.sessionId).toBe('sess-A');
    expect(doc.stats.promptCount).toBe(3);
    expect(doc.stats.filesModified).toContain('A.java');

    // latest-summary.json 존재 확인
    const loaded = summarizer.loadLatestSummary(tmpDir);
    expect(loaded.sessionId).toBe('sess-A');
  });

  it('saveSummary — 기존 latest → archive 이동', () => {
    const makeSummary = (id) => ({
      source: 'template',
      summary: { request: `작업 ${id}`, completed: [], investigated: [], learned: [], next_steps: [], notes: null },
    });

    summarizer.saveSummary(tmpDir, { sessionId: 'sess-1', project: 't', promptNumber: 1 }, makeSummary('1'));
    summarizer.saveSummary(tmpDir, { sessionId: 'sess-2', project: 't', promptNumber: 2 }, makeSummary('2'));

    // latest는 sess-2, archive에 sess-1
    const latest = summarizer.loadLatestSummary(tmpDir);
    expect(latest.sessionId).toBe('sess-2');

    const archiveDir = path.join(tmpDir, '.demodev', 'sessions', 'archive');
    const archived = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json'));
    expect(archived.length).toBe(1);
  });

  // ── Phase 1: 컨텍스트 복원 ──

  it('summaryInjector.buildSystemMessageLines — SessionStart용 간략 요약', () => {
    summarizer.saveSummary(
      tmpDir,
      { sessionId: 'sess-prev', project: 'myapp', promptNumber: 5 },
      {
        source: 'template',
        summary: { request: 'CRUD API 구현', completed: ['Entity 생성', 'Repository 생성'], investigated: [], learned: [], next_steps: ['Service 구현'], notes: null },
      },
    );

    const lines = summaryInjector.buildSystemMessageLines(tmpDir);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('\n')).toContain('CRUD API 구현');
    expect(lines.join('\n')).toContain('Entity 생성');
  });

  it('summaryInjector.buildHookSpecificOutput — UserPromptSubmit용 상세 마크다운', () => {
    summarizer.saveSummary(
      tmpDir,
      { sessionId: 'sess-prev', project: 'myapp', promptNumber: 3 },
      {
        source: 'template',
        summary: { request: 'JWT 인증 구현', completed: ['SecurityConfig 추가'], investigated: ['Spring Security 문서'], learned: ['BCrypt 해싱'], next_steps: ['테스트 작성'], notes: null },
      },
    );

    const output = summaryInjector.buildHookSpecificOutput(tmpDir);
    expect(output).not.toBeNull();
    expect(output).toContain('<demokit-context>');
    expect(output).toContain('JWT 인증 구현');
    expect(output).toContain('Spring Security 문서');
    expect(output).toContain('BCrypt 해싱');
    expect(output).toContain('테스트 작성');
  });

  it('요약 없으면 null 반환 — 첫 세션', () => {
    expect(summaryInjector.buildHookSpecificOutput(tmpDir)).toBeNull();
    expect(summaryInjector.buildSystemMessageLines(tmpDir)).toHaveLength(0);
  });

  // ── Phase 3: Search ──

  it('search.searchSessions — 키워드 검색', () => {
    summarizer.saveSummary(tmpDir, { sessionId: 's1', project: 'p', promptNumber: 1 }, {
      source: 'template',
      summary: { request: 'User Entity 생성', completed: ['Entity 추가'], investigated: [], learned: [], next_steps: [], notes: null },
    });
    summarizer.saveSummary(tmpDir, { sessionId: 's2', project: 'p', promptNumber: 2 }, {
      source: 'template',
      summary: { request: 'Order API 구현', completed: ['Controller 추가'], investigated: [], learned: [], next_steps: [], notes: null },
    });

    const all = search.searchSessions(tmpDir, '', { limit: 10 });
    expect(all).toHaveLength(2);

    const entityResults = search.searchSessions(tmpDir, 'Entity', { limit: 10 });
    expect(entityResults).toHaveLength(1);
    expect(entityResults[0].sessionId).toBe('s1');
  });

  it('search.searchObservations — 필터링', () => {
    sessionLog.appendObservation(tmpDir, {
      type: 'write', tool: 'Write', file: 'UserController.java',
      observationType: 'api-change', concepts: ['spring-pattern'],
    });
    sessionLog.appendObservation(tmpDir, {
      type: 'bash', tool: 'Bash', command: 'gradlew test', exitCode: 0,
      observationType: 'test-result', concepts: [],
    });
    sessionLog.appendObservation(tmpDir, {
      type: 'write', tool: 'Write', file: 'SecurityConfig.java',
      observationType: 'config-change', concepts: ['security-concern'],
    });

    const apiObs = search.searchObservations(tmpDir, { observationType: 'api-change' });
    expect(apiObs).toHaveLength(1);
    expect(apiObs[0].file).toBe('UserController.java');

    const secObs = search.searchObservations(tmpDir, { concept: 'security-concern' });
    expect(secObs).toHaveLength(1);

    const fileObs = search.searchObservations(tmpDir, { file: 'Security' });
    expect(fileObs).toHaveLength(1);
  });

  it('search.getObservationTypeStats — 타입/개념 분포', () => {
    sessionLog.appendObservation(tmpDir, { type: 'write', tool: 'Write', file: 'A.java', observationType: 'entity-change', concepts: ['spring-pattern'] });
    sessionLog.appendObservation(tmpDir, { type: 'write', tool: 'Write', file: 'B.java', observationType: 'api-change', concepts: ['spring-pattern'] });
    sessionLog.appendObservation(tmpDir, { type: 'bash', tool: 'Bash', command: 'test', observationType: 'test-result', concepts: ['test-failure'] });

    const stats = search.getObservationTypeStats(tmpDir);
    expect(stats.total).toBe(3);
    expect(stats.byType['entity-change']).toBe(1);
    expect(stats.byType['api-change']).toBe(1);
    expect(stats.byConcept['spring-pattern']).toBe(2);
  });

  // ── E2E: 세션 A → 세션 B 전체 흐름 ──

  it('E2E — 세션A 작업 → 종료 → 세션B 컨텍스트 복원', () => {
    // ─ 세션 A ─
    sessionState.initSession(tmpDir, 'session-A');

    // PostToolUse: observations 기록
    const writeClass = mode.classifyFile('src/UserEntity.java');
    sessionLog.appendObservation(tmpDir, {
      type: 'write', tool: 'Write', file: 'src/UserEntity.java',
      ...writeClass,
    });

    const writeCtrl = mode.classifyFile('src/UserController.java');
    sessionLog.appendObservation(tmpDir, {
      type: 'write', tool: 'Write', file: 'src/UserController.java',
      ...writeCtrl,
    });

    const bashResult = mode.classifyCommand('gradlew test', 0);
    sessionLog.appendObservation(tmpDir, {
      type: 'bash', tool: 'Bash', command: 'gradlew test', exitCode: 0,
      ...bashResult,
    });

    const skillResult = mode.classifySkill('entity');
    sessionLog.appendObservation(tmpDir, {
      type: 'skill', tool: 'Skill', skill: 'entity',
      ...skillResult,
    });

    // Stop: 요약 생성 (template — LLM 미사용)
    const sessionData = sessionState.loadCurrentSession(tmpDir);
    const summaryResult = {
      source: 'template',
      summary: summarizer.buildTemplateSummary(
        { transcript: 'User CRUD 구현 완료. Entity, Controller 생성함.' },
        tmpDir,
      ),
    };
    const savedDoc = summarizer.saveSummary(tmpDir, sessionData, summaryResult);
    sessionState.clearCurrentSession(tmpDir);

    // 검증: 세션A 요약 저장됨
    expect(savedDoc.sessionId).toBe('session-A');
    expect(savedDoc.stats.filesModified).toContain('src/UserEntity.java');
    expect(savedDoc.stats.filesModified).toContain('src/UserController.java');
    expect(savedDoc.stats.toolUses).toBe(4);

    // ─ 세션 B ─
    // SessionStart: systemMessage에 이전 요약 포함
    const systemLines = summaryInjector.buildSystemMessageLines(tmpDir);
    expect(systemLines.length).toBeGreaterThan(0);
    const systemMsg = systemLines.join('\n');
    expect(systemMsg).toContain('이전 세션 요약');

    // UserPromptSubmit: 상세 컨텍스트 주입
    sessionState.initSession(tmpDir, 'session-B');
    expect(sessionState.isContextInjected(tmpDir)).toBe(false);

    const hookOutput = summaryInjector.buildHookSpecificOutput(tmpDir);
    expect(hookOutput).not.toBeNull();
    expect(hookOutput).toContain('<demokit-context>');
    expect(hookOutput).toContain('src/UserEntity.java');

    sessionState.markContextInjected(tmpDir);
    expect(sessionState.isContextInjected(tmpDir)).toBe(true);

    // 2번째 프롬프트에서는 주입하지 않음
    sessionState.initSession(tmpDir, 'session-B');
    expect(sessionState.isContextInjected(tmpDir)).toBe(true);

    // 세션B의 observations는 초기화된 상태
    expect(sessionLog.readObservations(tmpDir)).toHaveLength(0);

    // Search: 세션A 검색 가능
    const found = search.searchSessions(tmpDir, 'User', { limit: 5 });
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].sessionId).toBe('session-A');
  });

  it('E2E — 다중 세션 archive 및 최근 3개 로드', () => {
    // archive 파일을 직접 구성 (saveSummary 동일 초 호출 시 파일명 충돌 방지)
    const archiveDir = path.join(tmpDir, '.demodev', 'sessions', 'archive');
    const makeDoc = (id, request, ts) => ({
      sessionId: id, completedAt: ts, project: 'test', source: 'template',
      summary: { request, completed: [`${id} 완료`], investigated: [], learned: [], next_steps: [], notes: null },
      stats: { promptCount: 1, toolUses: 0, filesModified: [], commandsRun: [], skillsUsed: [] },
    });

    // archive에 3개 세션 (시간순)
    io.writeJson(path.join(archiveDir, '2026-02-25T10-00-00.json'), makeDoc('s1', '첫 번째 작업', '2026-02-25T10:00:00Z'));
    io.writeJson(path.join(archiveDir, '2026-02-25T11-00-00.json'), makeDoc('s2', '두 번째 작업', '2026-02-25T11:00:00Z'));
    io.writeJson(path.join(archiveDir, '2026-02-25T12-00-00.json'), makeDoc('s3', '세 번째 작업', '2026-02-25T12:00:00Z'));

    // latest에 최신 세션
    io.writeJson(
      path.join(tmpDir, '.demodev', 'sessions', 'latest-summary.json'),
      makeDoc('s4', '네 번째 작업', '2026-02-26T09:00:00Z'),
    );

    const latest = summarizer.loadLatestSummary(tmpDir);
    expect(latest.sessionId).toBe('s4');

    // hookSpecificOutput은 최근 3개만 (latest + archive 역순 2개)
    const output = summaryInjector.buildHookSpecificOutput(tmpDir);
    expect(output).toContain('네 번째 작업');
    expect(output).toContain('세 번째 작업');
    expect(output).toContain('두 번째 작업');
    // s1은 MAX_SESSIONS=3 초과로 포함되지 않음
    expect(output).not.toContain('첫 번째 작업');
  });
});
