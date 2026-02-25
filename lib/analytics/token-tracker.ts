import * as fs from 'fs';
import * as path from 'path';

export interface TurnRecord {
  turnIndex: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  timestamp: string;
}

export interface SessionMetrics {
  sessionId: string;
  startedAt: string;
  turns: TurnRecord[];
  totalEstimatedInputTokens: number;
  totalEstimatedOutputTokens: number;
}

const CHARS_PER_TOKEN = 3.5;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function createSession(sessionId: string): SessionMetrics {
  return {
    sessionId,
    startedAt: new Date().toISOString(),
    turns: [],
    totalEstimatedInputTokens: 0,
    totalEstimatedOutputTokens: 0,
  };
}

export function recordTurn(metrics: SessionMetrics, inputText: string, outputText: string): SessionMetrics {
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);
  const turn: TurnRecord = {
    turnIndex: metrics.turns.length,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    timestamp: new Date().toISOString(),
  };
  return {
    ...metrics,
    turns: [...metrics.turns, turn],
    totalEstimatedInputTokens: metrics.totalEstimatedInputTokens + inputTokens,
    totalEstimatedOutputTokens: metrics.totalEstimatedOutputTokens + outputTokens,
  };
}

export function summarizeSession(metrics: SessionMetrics): string {
  const inTokens = metrics.totalEstimatedInputTokens.toLocaleString();
  const outTokens = metrics.totalEstimatedOutputTokens.toLocaleString();
  const turns = metrics.turns.length;
  return `Tokens: ~${inTokens} in / ~${outTokens} out (${turns} turns)`;
}

export function metricsPath(projectRoot: string): string {
  return path.join(projectRoot, '.demodev', 'analytics', 'session-metrics.json');
}

export function saveMetrics(projectRoot: string, metrics: SessionMetrics): void {
  try {
    const filePath = metricsPath(projectRoot);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2));
  } catch { /* 저장 실패 시 무시 */ }
}

export function loadMetrics(projectRoot: string): SessionMetrics | null {
  const filePath = metricsPath(projectRoot);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SessionMetrics;
  } catch {
    return null;
  }
}
