import * as fs from 'fs';
import * as path from 'path';

export interface TraceEvent {
  timestamp: string;
  event: 'start' | 'stop';
  agentId: string;
  taskDescription: string | null;
  worktreePath: string | null;
  exitCode: number | null;
  durationMs: number | null;
}

export interface TraceSummary {
  totalAgents: number;
  successCount: number;
  failCount: number;
  avgDurationMs: number | null;
}

export function tracePath(projectRoot: string, sessionId: string): string {
  return path.join(projectRoot, '.demodev', 'traces', `agent-trace-${sessionId}.jsonl`);
}

export function appendTrace(projectRoot: string, sessionId: string, event: TraceEvent): void {
  const filePath = tracePath(projectRoot, sessionId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(event) + '\n');
}

export function loadTrace(projectRoot: string, sessionId: string): TraceEvent[] {
  const filePath = tracePath(projectRoot, sessionId);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as TraceEvent);
  } catch {
    return [];
  }
}

export function findLastStart(projectRoot: string, sessionId: string, agentId: string): TraceEvent | null {
  const filePath = tracePath(projectRoot, sessionId);
  try {
    const fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    const chunkSize = Math.min(4096, stat.size);
    if (chunkSize === 0) { fs.closeSync(fd); return null; }
    const buf = Buffer.alloc(chunkSize);
    fs.readSync(fd, buf, 0, chunkSize, stat.size - chunkSize);
    fs.closeSync(fd);
    const lines = buf.toString('utf-8').split('\n').filter(l => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const ev = JSON.parse(lines[i]) as TraceEvent;
        if (ev.event === 'start' && ev.agentId === agentId) return ev;
      } catch { /* 잘린 줄 무시 */ }
    }
  } catch { /* ignore */ }
  return null;
}

export function summarizeTrace(events: TraceEvent[]): TraceSummary {
  const stopEvents = events.filter(e => e.event === 'stop');
  const agentIds = new Set(stopEvents.map(e => e.agentId));

  let successCount = 0;
  let failCount = 0;
  const durations: number[] = [];

  for (const agentId of agentIds) {
    const stops = stopEvents.filter(e => e.agentId === agentId);
    for (const stop of stops) {
      if (stop.exitCode === 0 || stop.exitCode === null) {
        successCount++;
      } else {
        failCount++;
      }
      if (stop.durationMs !== null) {
        durations.push(stop.durationMs);
      }
    }
  }

  const avgDurationMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  return {
    totalAgents: agentIds.size,
    successCount,
    failCount,
    avgDurationMs,
  };
}

const FALLBACK_SESSION_ID = 'default';

export function resolveSessionId(hookData: any): string {
  return hookData.session_id || FALLBACK_SESSION_ID;
}
