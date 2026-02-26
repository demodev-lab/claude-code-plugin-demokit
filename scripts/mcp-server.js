/**
 * demokit Memory MCP Server
 * 세션 메모리 검색/조회 도구를 MCP로 노출
 *
 * 프로토콜: stdio JSON-RPC 2.0 (Content-Length framing)
 * 외부 의존성 없음 (순수 Node.js)
 *
 * 등록: .claude/settings.local.json의 mcpServers에 추가
 * {
 *   "mcpServers": {
 *     "demokit-memory": {
 *       "command": "node",
 *       "args": ["<plugin-root>/scripts/mcp-server.js"]
 *     }
 *   }
 * }
 */
const path = require('path');

const SERVER_NAME = 'demokit-memory';
const SERVER_VERSION = '1.0.0';

// ── Tool 정의 ──────────────────────────────────────────────

const TOOLS = [
  {
    name: 'search_sessions',
    description: '이전 세션 요약을 검색합니다. 과거 작업 내용, 완료한 작업, 학습 내용 등을 찾을 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어 (공백 구분 AND 매칭)' },
        limit: { type: 'number', description: '최대 결과 수 (기본 5)', default: 5 },
      },
    },
  },
  {
    name: 'search_observations',
    description: '현재 세션의 도구 사용 관찰 기록을 검색합니다. 수정한 파일, 실행한 명령, 사용한 스킬 등을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['write', 'bash', 'skill'], description: '도구 타입 필터' },
        observation_type: { type: 'string', enum: ['entity-change', 'api-change', 'config-change', 'test-result', 'build-result', 'discovery', 'decision', 'refactor'], description: 'Spring Boot 관찰 타입 필터' },
        file: { type: 'string', description: '파일 경로 부분 매칭' },
        concept: { type: 'string', enum: ['spring-pattern', 'jpa-gotcha', 'security-concern', 'performance-issue', 'how-it-works', 'what-changed', 'test-failure', 'build-failure'], description: '개념 필터' },
        query: { type: 'string', description: '전체 텍스트 검색' },
        limit: { type: 'number', description: '최대 결과 수 (기본 20)', default: 20 },
      },
    },
  },
  {
    name: 'get_session',
    description: '특정 세션의 상세 요약을 조회합니다. session_id를 생략하면 가장 최근 세션을 반환합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: '세션 ID (생략 시 최신)' },
      },
    },
  },
  {
    name: 'list_sessions',
    description: '최근 세션 목록을 요약과 함께 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '최대 결과 수 (기본 5)', default: 5 },
      },
    },
  },
  {
    name: 'observation_stats',
    description: '현재 세션의 관찰 통계를 조회합니다. 도구 사용 횟수, 수정 파일 수, 관찰 타입 분포 등을 보여줍니다.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ── Tool 실행 ──────────────────────────────────────────────

function resolveProjectRoot() {
  try {
    const { platform } = require(path.join(__dirname, '..', 'lib', 'core'));
    return platform.findProjectRoot(process.cwd());
  } catch { return null; }
}

function executeTool(name, args) {
  const projectRoot = resolveProjectRoot();
  if (!projectRoot) {
    return { isError: true, content: [{ type: 'text', text: 'Spring Boot 프로젝트를 찾을 수 없습니다.' }] };
  }

  try {
    const search = require(path.join(__dirname, '..', 'lib', 'memory', 'search'));

    switch (name) {
      case 'search_sessions': {
        const results = search.searchSessions(projectRoot, args.query || '', { limit: args.limit || 5 });
        if (results.length === 0) return textResult('검색 결과가 없습니다.');
        return textResult(results.map(formatSession).join('\n\n---\n\n'));
      }

      case 'search_observations': {
        const results = search.searchObservations(projectRoot, {
          type: args.type,
          observationType: args.observation_type,
          file: args.file,
          concept: args.concept,
          query: args.query,
          limit: args.limit || 20,
        });
        if (results.length === 0) return textResult('관찰 기록이 없습니다.');
        return textResult(results.map(formatObservation).join('\n'));
      }

      case 'get_session': {
        const session = search.getSession(projectRoot, args.session_id);
        if (!session) return textResult('세션을 찾을 수 없습니다.');
        return textResult(formatSessionDetail(session));
      }

      case 'list_sessions': {
        const all = search.searchSessions(projectRoot, '', { limit: args.limit || 5 });
        if (all.length === 0) return textResult('저장된 세션이 없습니다.');
        return textResult(all.map(formatSessionBrief).join('\n'));
      }

      case 'observation_stats': {
        const stats = search.getObservationTypeStats(projectRoot);
        return textResult(formatStats(stats));
      }

      default:
        return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] };
  }
}

// ── 포맷터 ─────────────────────────────────────────────────

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

function formatSession(s) {
  const sm = s.summary;
  const lines = [`## ${sm.request || '(요약 없음)'}`];
  lines.push(`세션: ${s.sessionId} | ${s.completedAt || ''}`);
  if (sm.completed?.length) lines.push(`완료: ${sm.completed.join(', ')}`);
  if (sm.next_steps?.length) lines.push(`다음: ${sm.next_steps.join(', ')}`);
  if (s.stats?.filesModified?.length) lines.push(`파일: ${s.stats.filesModified.join(', ')}`);
  return lines.join('\n');
}

function formatSessionDetail(s) {
  const sm = s.summary;
  const lines = [`# 세션 상세: ${s.sessionId}`];
  lines.push(`완료: ${s.completedAt || ''} | 소스: ${s.source || ''}`);
  if (sm.request) lines.push(`\n## 요청\n${sm.request}`);
  if (sm.investigated?.length) lines.push(`\n## 조사\n${sm.investigated.map(i => `- ${i}`).join('\n')}`);
  if (sm.learned?.length) lines.push(`\n## 학습\n${sm.learned.map(l => `- ${l}`).join('\n')}`);
  if (sm.completed?.length) lines.push(`\n## 완료\n${sm.completed.map(c => `- ${c}`).join('\n')}`);
  if (sm.next_steps?.length) lines.push(`\n## 다음 단계\n${sm.next_steps.map(n => `- ${n}`).join('\n')}`);
  if (sm.notes) lines.push(`\n## 참고\n${sm.notes}`);
  if (s.stats) {
    const st = s.stats;
    lines.push(`\n## 통계`);
    if (st.toolUses) lines.push(`- 도구 사용: ${st.toolUses}회`);
    if (st.filesModified?.length) lines.push(`- 수정 파일: ${st.filesModified.join(', ')}`);
    if (st.skillsUsed?.length) lines.push(`- 스킬: ${st.skillsUsed.join(', ')}`);
  }
  return lines.join('\n');
}

function formatSessionBrief(s) {
  const sm = s.summary;
  return `[${s.completedAt?.substring(0, 16) || '?'}] ${sm.request || '(요약 없음)'} (${s.sessionId})`;
}

function formatObservation(o) {
  const parts = [`[${o.ts?.substring(11, 19) || '?'}]`];
  parts.push(o.observationType || o.type);
  if (o.file) parts.push(o.file);
  if (o.command) parts.push(o.command.substring(0, 80));
  if (o.skill) parts.push(`skill:${o.skill}`);
  if (o.concepts?.length) parts.push(`(${o.concepts.join(', ')})`);
  return parts.join(' ');
}

function formatStats(stats) {
  const lines = [`# 관찰 통계 (총 ${stats.total}건)`];
  if (Object.keys(stats.byType).length > 0) {
    lines.push('\n## 타입별');
    for (const [t, c] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${t}: ${c}건`);
    }
  }
  if (Object.keys(stats.byConcept).length > 0) {
    lines.push('\n## 개념별');
    for (const [t, c] of Object.entries(stats.byConcept).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${t}: ${c}건`);
    }
  }
  return lines.join('\n');
}

// ── MCP Protocol (stdio JSON-RPC 2.0 + Content-Length) ────

// Buffer 기반 처리: Content-Length는 바이트 단위이므로 string length 사용 불가
let rawBuffer = Buffer.alloc(0);

function send(message) {
  const json = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
  process.stdout.write(header + json);
}

function handleMessage(msg) {
  // Notification (no id)
  if (msg.id === undefined || msg.id === null) return;

  switch (msg.method) {
    case 'initialize':
      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        },
      });
      break;

    case 'tools/list':
      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: TOOLS },
      });
      break;

    case 'tools/call': {
      const params = msg.params || {};
      const name = params.name;
      const args = params.arguments;
      if (!name) {
        send({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'Missing tool name' } });
        break;
      }
      const result = executeTool(name, args || {});
      send({ jsonrpc: '2.0', id: msg.id, result });
      break;
    }

    case 'ping':
      send({ jsonrpc: '2.0', id: msg.id, result: {} });
      break;

    default:
      send({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `Method not found: ${msg.method}` },
      });
  }
}

const HEADER_DELIM = Buffer.from('\r\n\r\n');

function processBuffer() {
  while (true) {
    const headerEnd = rawBuffer.indexOf(HEADER_DELIM);
    if (headerEnd === -1) return;

    const header = rawBuffer.slice(0, headerEnd).toString('ascii');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      // 잘못된 헤더 — 스킵
      rawBuffer = rawBuffer.slice(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(match[1], 10);
    const bodyStart = headerEnd + 4;
    if (rawBuffer.length < bodyStart + contentLength) return;

    const body = rawBuffer.slice(bodyStart, bodyStart + contentLength).toString('utf-8');
    rawBuffer = rawBuffer.slice(bodyStart + contentLength);

    try {
      handleMessage(JSON.parse(body));
    } catch { /* malformed JSON 무시 */ }
  }
}

// ── 서버 시작 ──────────────────────────────────────────────

process.stdin.on('data', (chunk) => {
  rawBuffer = Buffer.concat([rawBuffer, chunk]);
  processBuffer();
});
process.stdin.on('end', () => {
  // stdin 종료 시 pending stdout 플러시 후 종료
  process.stdout.write('', () => process.exit(0));
});
