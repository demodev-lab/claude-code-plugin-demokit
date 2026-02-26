/**
 * demokit Web UI Server
 * 세션/관찰 데이터를 실시간으로 조회하는 웹 대시보드
 *
 * - SSE (Server-Sent Events)로 observations.jsonl 변경 즉시 push
 * - fs.watchFile 기반 파일 감시, 외부 의존성 없음
 * - 프로젝트별 동적 포트 (projectRoot 해시 기반, 2415~2514)
 *
 * 사용: node scripts/web-ui.js [projectRoot]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// ── 프로젝트 루트 탐색 ──────────────────────────────────────
let projectRoot = process.argv[2] || null;
if (!projectRoot) {
  try {
    const { platform } = require(path.join(__dirname, '..', 'lib', 'core'));
    projectRoot = platform.findProjectRoot(process.cwd());
  } catch { /* ignore */ }
}
if (!projectRoot) projectRoot = process.cwd();

// ── 동적 포트 (projectRoot 해시 기반) ────────────────────────
function getProjectPort(root) {
  const hash = crypto.createHash('md5').update(root).digest();
  return 2415 + (hash[0] % 100);
}
const PORT = getProjectPort(projectRoot);
const DEMODEV_DIR = path.join(projectRoot, '.demodev');
const PORT_FILE = path.join(DEMODEV_DIR, 'web-ui.port');

const search = require(path.join(__dirname, '..', 'lib', 'memory', 'search'));
const sessionLog = require(path.join(__dirname, '..', 'lib', 'memory', 'session-log'));
const state = require(path.join(__dirname, '..', 'lib', 'memory', 'state'));

// ── SSE 클라이언트 관리 ──────────────────────────────────────
const sseClients = new Set();

function broadcastSSE(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}

// ── 파일 감시 (observations.jsonl + current.json) ────────────
const obsPath = sessionLog.getObservationsPath(projectRoot);
const sessionsDir = state.getSessionsDir(projectRoot);
let lastObsSize = 0;

try { lastObsSize = fs.statSync(obsPath).size; } catch { /* ignore */ }

const watchedFiles = [];

function watchFile(filePath, eventName, transform) {
  const dir = path.dirname(filePath);
  try {
    fs.mkdirSync(dir, { recursive: true });
    watchedFiles.push(filePath);
    fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
      if (curr.mtime <= prev.mtime) return;
      try {
        const data = transform();
        if (data) broadcastSSE(eventName, data);
      } catch { /* ignore */ }
    });
  } catch { /* ignore */ }
}

// observations.jsonl — 새로 추가된 줄만 push
watchFile(obsPath, 'observation', () => {
  try {
    const currSize = fs.statSync(obsPath).size;
    if (currSize <= lastObsSize) { lastObsSize = currSize; return null; }
    const fd = fs.openSync(obsPath, 'r');
    try {
      const buf = Buffer.alloc(currSize - lastObsSize);
      fs.readSync(fd, buf, 0, buf.length, lastObsSize);
      lastObsSize = currSize;
      const lines = buf.toString('utf-8').split('\n').filter(Boolean);
      const entries = [];
      for (const line of lines) {
        try { entries.push(JSON.parse(line)); } catch { /* skip */ }
      }
      return entries.length > 0 ? entries : null;
    } finally { fs.closeSync(fd); }
  } catch { return null; }
});

// current.json — 세션 상태 변경
const currentPath = path.join(sessionsDir, 'current.json');
watchFile(currentPath, 'session', () => {
  return state.loadCurrentSession(projectRoot);
});

// latest-summary.json — 세션 요약 완료
const summaryPath = path.join(sessionsDir, 'latest-summary.json');
watchFile(summaryPath, 'summary', () => {
  try { return JSON.parse(fs.readFileSync(summaryPath, 'utf-8')); } catch { return null; }
});

// ── API 라우팅 ───────────────────────────────────────────────

function jsonResponse(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function handleAPI(pathname, query, res) {
  switch (pathname) {
    case '/api/sessions':
      return jsonResponse(res, search.searchSessions(projectRoot, query.q || '', {
        limit: parseInt(query.limit) || 10,
      }));

    case '/api/observations':
      return jsonResponse(res, search.searchObservations(projectRoot, {
        type: query.type,
        observationType: query.observation_type,
        file: query.file,
        concept: query.concept,
        query: query.q,
        limit: parseInt(query.limit) || 50,
      }));

    case '/api/stats':
      return jsonResponse(res, search.getObservationTypeStats(projectRoot));

    case '/api/current':
      return jsonResponse(res, state.loadCurrentSession(projectRoot) || {});

    case '/api/info':
      return jsonResponse(res, { projectRoot, pid: process.pid, port: PORT });

    default:
      return jsonResponse(res, { error: 'Not found' }, 404);
  }
}

// ── HTTP 서버 ────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // SSE endpoint
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // API endpoints
  if (pathname.startsWith('/api/')) {
    return handleAPI(pathname, parsed.query || {}, res);
  }

  // Static HTML
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// ── Port 파일 관리 ──────────────────────────────────────────
function writePortFile() {
  try {
    fs.mkdirSync(DEMODEV_DIR, { recursive: true });
    fs.writeFileSync(PORT_FILE, JSON.stringify({ port: PORT, pid: process.pid, projectRoot }));
  } catch { /* ignore */ }
}

function removePortFile() {
  try { fs.unlinkSync(PORT_FILE); } catch { /* ignore */ }
}

// ── Cleanup ──────────────────────────────────────────────────
function stopWatchers() {
  for (const fp of watchedFiles) {
    try { fs.unwatchFile(fp); } catch { /* ignore */ }
  }
  removePortFile();
}
process.on('SIGINT', () => { stopWatchers(); process.exit(0); });
process.on('SIGTERM', () => { stopWatchers(); process.exit(0); });
server.on('close', stopWatchers);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, () => {
  writePortFile();
  const name = path.basename(projectRoot);
  console.log(`\n  demokit 웹 대시보드`);
  console.log(`  프로젝트: ${name}`);
  console.log(`  주소:     http://localhost:${PORT}`);
  console.log(`  SSE:      http://localhost:${PORT}/api/events`);
  console.log(`\n  Ctrl+C 로 종료\n`);
});

// ── HTML ─────────────────────────────────────────────────────
const HTML_PAGE = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>demokit — 세션 대시보드</title>
<style>
:root {
  --bg: #0d1117; --surface: #161b22; --border: #30363d;
  --text: #e6edf3; --text2: #8b949e; --accent: #58a6ff;
  --green: #3fb950; --yellow: #d29922; --red: #f85149;
  --purple: #bc8cff; --orange: #f0883e;
}
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
  background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.5; }

.header { background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
.header h1 { font-size: 16px; font-weight: 600; }
.header .project { color: var(--accent); font-size: 13px; }
.header .status { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green);
  animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.status-text { color: var(--text2); font-size: 12px; }

.layout { display: grid; grid-template-columns: 340px 1fr; height: calc(100vh - 49px); }

/* Left Panel */
.left { border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.panel-title { padding: 12px 16px; font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px; color: var(--text2);
  border-bottom: 1px solid var(--border); background: var(--surface); }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  padding: 12px 16px; border-bottom: 1px solid var(--border); }
.stat-card { background: var(--surface); border: 1px solid var(--border);
  border-radius: 6px; padding: 10px 12px; }
.stat-value { font-size: 20px; font-weight: 700; color: var(--accent); }
.stat-label { font-size: 11px; color: var(--text2); margin-top: 2px; }

.session-list { flex: 1; overflow-y: auto; }
.session-item { padding: 12px 16px; border-bottom: 1px solid var(--border);
  cursor: pointer; transition: background 0.15s; }
.session-item:hover { background: var(--surface); }
.session-item.active { background: var(--surface); border-left: 3px solid var(--accent); }
.session-request { font-size: 13px; font-weight: 500; margin-bottom: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.session-meta { font-size: 11px; color: var(--text2); display: flex; gap: 12px; }

/* Right Panel */
.right { display: flex; flex-direction: column; overflow: hidden; }
.toolbar { padding: 8px 16px; display: flex; gap: 8px; align-items: center;
  border-bottom: 1px solid var(--border); background: var(--surface); flex-wrap: wrap; }
.filter-btn { padding: 4px 10px; border-radius: 12px; border: 1px solid var(--border);
  background: transparent; color: var(--text2); font-size: 11px; cursor: pointer;
  transition: all 0.15s; }
.filter-btn:hover { border-color: var(--accent); color: var(--accent); }
.filter-btn.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.filter-sep { width: 1px; height: 20px; background: var(--border); }

.timeline { flex: 1; overflow-y: auto; padding: 0; }
.obs-item { display: flex; gap: 12px; padding: 8px 16px; border-bottom: 1px solid var(--border);
  font-size: 13px; transition: background 0.15s; animation: fadeIn 0.3s ease; }
.obs-item:hover { background: rgba(88,166,255,0.05); }
.obs-item.new { animation: slideIn 0.4s ease; }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }

.obs-time { color: var(--text2); font-size: 12px; min-width: 60px; flex-shrink: 0; }
.obs-badge { display: inline-block; padding: 1px 8px; border-radius: 10px;
  font-size: 11px; font-weight: 500; min-width: 72px; text-align: center; flex-shrink: 0; }
.obs-detail { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.obs-concepts { display: flex; gap: 4px; flex-shrink: 0; }
.concept-tag { font-size: 10px; padding: 1px 6px; border-radius: 8px;
  background: rgba(188,140,255,0.15); color: var(--purple); }

/* Badge colors by type */
.badge-write { background: rgba(63,185,80,0.15); color: var(--green); }
.badge-bash { background: rgba(210,153,34,0.15); color: var(--yellow); }
.badge-skill { background: rgba(188,140,255,0.15); color: var(--purple); }

/* ObservationType badges */
.ot-entity-change { border-left: 3px solid var(--green); }
.ot-api-change { border-left: 3px solid var(--accent); }
.ot-config-change { border-left: 3px solid var(--yellow); }
.ot-test-result { border-left: 3px solid var(--purple); }
.ot-build-result { border-left: 3px solid var(--orange); }
.ot-discovery { border-left: 3px solid var(--text2); }
.ot-refactor { border-left: 3px solid #f778ba; }

/* Session detail overlay */
.detail-overlay { display: none; position: absolute; top: 0; right: 0;
  width: 50%; height: 100%; background: var(--surface); border-left: 1px solid var(--border);
  overflow-y: auto; padding: 20px 24px; z-index: 10; }
.detail-overlay.open { display: block; }
.detail-close { position: absolute; top: 12px; right: 16px; background: none;
  border: none; color: var(--text2); cursor: pointer; font-size: 18px; }
.detail-section { margin-bottom: 16px; }
.detail-section h3 { font-size: 12px; text-transform: uppercase;
  letter-spacing: 0.5px; color: var(--text2); margin-bottom: 6px; }
.detail-section ul { list-style: none; padding-left: 12px; }
.detail-section li { position: relative; padding: 2px 0; font-size: 13px; }
.detail-section li::before { content: ''; position: absolute; left: -10px; top: 10px;
  width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }

.empty-state { padding: 40px; text-align: center; color: var(--text2); }
.empty-state p { font-size: 13px; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text2); }
</style>
</head>
<body>

<div class="header">
  <h1>demokit</h1>
  <span class="project" id="projectName">\u2014</span>
  <div class="status">
    <div class="dot" id="sseDot"></div>
    <span class="status-text" id="sseStatus">\uc5f0\uacb0 \uc911...</span>
  </div>
</div>

<div class="layout">
  <!-- Left: Stats + Sessions -->
  <div class="left">
    <div class="panel-title">\ud1b5\uacc4</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" id="statTotal">\u2014</div>
        <div class="stat-label">\uad00\ucc30</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statFiles">\u2014</div>
        <div class="stat-label">\uc218\uc815\ub41c \ud30c\uc77c</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statPrompt">\u2014</div>
        <div class="stat-label">\ud504\ub86c\ud504\ud2b8</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statSession">\u2014</div>
        <div class="stat-label">\uc138\uc158</div>
      </div>
    </div>

    <div class="panel-title">\uc138\uc158 \ubaa9\ub85d</div>
    <div class="session-list" id="sessionList">
      <div class="empty-state"><p>\uc138\uc158 \uc5c6\uc74c</p></div>
    </div>
  </div>

  <!-- Right: Observation Timeline -->
  <div class="right" style="position:relative;">
    <div class="toolbar">
      <button class="filter-btn active" data-filter="all">\uc804\uccb4</button>
      <div class="filter-sep"></div>
      <button class="filter-btn" data-filter="write">\uc4f0\uae30</button>
      <button class="filter-btn" data-filter="bash">\uba85\ub839</button>
      <button class="filter-btn" data-filter="skill">\uc2a4\ud0ac</button>
      <div class="filter-sep"></div>
      <button class="filter-btn" data-filter="entity-change">\uc5d4\ud2f0\ud2f0</button>
      <button class="filter-btn" data-filter="api-change">API</button>
      <button class="filter-btn" data-filter="config-change">\uc124\uc815</button>
      <button class="filter-btn" data-filter="test-result">\ud14c\uc2a4\ud2b8</button>
      <button class="filter-btn" data-filter="build-result">\ube4c\ub4dc</button>
    </div>
    <div class="timeline" id="timeline">
      <div class="empty-state"><p>\uad00\ucc30 \ub300\uae30 \uc911...</p></div>
    </div>

    <div class="detail-overlay" id="detailOverlay">
      <button class="detail-close" onclick="closeDetail()">&times;</button>
      <div id="detailContent"></div>
    </div>
  </div>
</div>

<script>
const API = '';
let activeFilter = 'all';
let allObservations = [];

// ── Init ──
async function init() {
  const [stats, sessions, observations, current] = await Promise.all([
    fetchJSON('/api/stats'),
    fetchJSON('/api/sessions?limit=20'),
    fetchJSON('/api/observations?limit=100'),
    fetchJSON('/api/current'),
  ]);

  if (current?.project) document.getElementById('projectName').textContent = current.project;
  if (current?.promptNumber) document.getElementById('statPrompt').textContent = current.promptNumber;

  updateStats(stats);
  renderSessions(sessions);
  allObservations = observations || [];
  renderTimeline();
  connectSSE();
}

async function fetchJSON(url) {
  try { const r = await fetch(API + url); return await r.json(); } catch { return null; }
}

// ── Stats ──
function updateStats(stats) {
  if (!stats) return;
  document.getElementById('statTotal').textContent = stats.total || 0;
  const byType = stats.byType || {};
  const fileCount = (byType['entity-change'] || 0) + (byType['api-change'] || 0) + (byType['config-change'] || 0);
  document.getElementById('statFiles').textContent = fileCount || stats.total || 0;
}

// ── Sessions ──
function renderSessions(sessions) {
  const el = document.getElementById('sessionList');
  if (!sessions?.length) { el.innerHTML = '<div class="empty-state"><p>\uc138\uc158 \uc5c6\uc74c</p></div>'; return; }
  document.getElementById('statSession').textContent = sessions.length;
  el.innerHTML = sessions.map((s, i) => {
    const req = s.summary?.request || '(\uc694\uc57d \uc5c6\uc74c)';
    const date = s.completedAt ? new Date(s.completedAt).toLocaleString('ko-KR', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '\u2014';
    const src = s.source === 'llm' ? 'LLM' : 'TPL';
    return '<div class="session-item" onclick="showSessionDetail('+i+')" data-idx="'+i+'">' +
      '<div class="session-request">' + escHtml(req) + '</div>' +
      '<div class="session-meta"><span>' + date + '</span><span>' + src + '</span>' +
      (s.stats?.toolUses ? '<span>\ub3c4\uad6c: ' + s.stats.toolUses + '\ud68c</span>' : '') +
      '</div></div>';
  }).join('');
  window._sessions = sessions;
}

function showSessionDetail(idx) {
  const s = window._sessions?.[idx];
  if (!s) return;
  const el = document.getElementById('detailContent');
  const sm = s.summary || {};
  let html = '<h2 style="font-size:15px;margin-bottom:16px;">' + escHtml(sm.request || '\u2014') + '</h2>';
  html += '<div style="font-size:11px;color:var(--text2);margin-bottom:16px;">\uc138\uc158: ' + s.sessionId + ' | ' + (s.completedAt || '') + '</div>';
  if (sm.completed?.length) html += section('\uc644\ub8cc', sm.completed);
  if (sm.investigated?.length) html += section('\uc870\uc0ac/\ubd84\uc11d', sm.investigated);
  if (sm.learned?.length) html += section('\ud559\uc2b5', sm.learned);
  if (sm.next_steps?.length) html += section('\ub2e4\uc74c \ub2e8\uacc4', sm.next_steps);
  if (sm.notes) html += '<div class="detail-section"><h3>\ucc38\uace0</h3><p style="font-size:13px;">' + escHtml(sm.notes) + '</p></div>';
  if (s.stats?.filesModified?.length) {
    html += '<div class="detail-section"><h3>\uc218\uc815\ub41c \ud30c\uc77c</h3><ul>' +
      s.stats.filesModified.map(f => '<li>' + escHtml(f) + '</li>').join('') + '</ul></div>';
  }
  el.innerHTML = html;
  document.getElementById('detailOverlay').classList.add('open');
}

function closeDetail() { document.getElementById('detailOverlay').classList.remove('open'); }

function section(title, items) {
  return '<div class="detail-section"><h3>' + title + '</h3><ul>' +
    items.map(i => '<li>' + escHtml(i) + '</li>').join('') + '</ul></div>';
}

// ── Timeline ──
function renderTimeline() {
  const el = document.getElementById('timeline');
  const filtered = allObservations.filter(o => matchFilter(o));
  if (!filtered.length) { el.innerHTML = '<div class="empty-state"><p>\uad00\ucc30 \uc5c6\uc74c</p></div>'; return; }
  el.innerHTML = filtered.map(o => renderObs(o, false)).join('');
}

function safeCls(s) { return String(s).replace(/[^a-zA-Z0-9\\-]/g, ''); }

function renderObs(o, isNew) {
  const time = o.ts ? o.ts.substring(11, 19) : '\u2014';
  const type = safeCls(o.type || '?');
  const ot = safeCls(o.observationType || o.type || '');
  const detail = o.file || o.command?.substring(0, 80) || (o.skill ? 'skill:' + o.skill : '') || '';
  const concepts = (o.concepts || []).map(c => '<span class="concept-tag">' + escHtml(c) + '</span>').join('');
  return '<div class="obs-item ot-' + ot + (isNew ? ' new' : '') + '">' +
    '<span class="obs-time">' + time + '</span>' +
    '<span class="obs-badge badge-' + type + '">' + escHtml(o.type || '?') + '</span>' +
    '<span class="obs-detail" title="' + escAttr(detail) + '">' + escHtml(detail) + '</span>' +
    '<div class="obs-concepts">' + concepts + '</div>' +
    '</div>';
}

function matchFilter(o) {
  if (activeFilter === 'all') return true;
  if (['write', 'bash', 'skill'].includes(activeFilter)) return o.type === activeFilter;
  return o.observationType === activeFilter;
}

// ── Filters ──
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderTimeline();
  });
});

// ── SSE ──
function connectSSE() {
  const es = new EventSource(API + '/api/events');
  const dot = document.getElementById('sseDot');
  const statusEl = document.getElementById('sseStatus');

  es.addEventListener('connected', () => {
    dot.style.background = 'var(--green)';
    statusEl.textContent = '\uc5f0\uacb0\ub428';
  });

  es.addEventListener('observation', (e) => {
    try {
      const entries = JSON.parse(e.data);
      if (!Array.isArray(entries)) return;
      allObservations = [...entries.reverse(), ...allObservations];
      document.getElementById('statTotal').textContent = allObservations.length;
      const timeline = document.getElementById('timeline');
      const emptyState = timeline.querySelector('.empty-state');
      if (emptyState) emptyState.remove();
      for (const obs of entries) {
        if (!matchFilter(obs)) continue;
        const temp = document.createElement('div');
        temp.innerHTML = renderObs(obs, true);
        timeline.prepend(temp.firstChild);
      }
    } catch { /* ignore */ }
  });

  es.addEventListener('session', (e) => {
    try {
      const session = JSON.parse(e.data);
      if (session?.promptNumber) {
        document.getElementById('statPrompt').textContent = session.promptNumber;
      }
      if (session?.project) {
        document.getElementById('projectName').textContent = session.project;
      }
    } catch { /* ignore */ }
  });

  es.addEventListener('summary', async () => {
    const sessions = await fetchJSON('/api/sessions?limit=20');
    renderSessions(sessions);
  });

  es.onerror = () => {
    dot.style.background = 'var(--red)';
    statusEl.textContent = '\uc5f0\uacb0 \ub04a\uae40';
  };
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

init();
</script>
</body>
</html>`;
