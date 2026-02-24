import * as fs from 'fs';
import * as path from 'path';

export type ContextSourceName = 'config' | 'memory' | 'pdca' | 'team' | 'lsp' | 'snapshot';

export interface ContextSource {
  name: ContextSourceName;
  priority: number; // 1(highest) ~ 6(lowest)
  data: Record<string, unknown>;
}

export interface MergedContext {
  sources: ContextSource[];
  merged: Record<string, unknown>;
  systemMessageLines: string[];
}

export function buildContextSources(projectRoot: string): ContextSource[] {
  const sources: ContextSource[] = [];

  // 1. config (priority 1)
  try {
    const raw = fs.readFileSync(path.join(projectRoot, 'demodev.config.json'), 'utf8');
    const json = JSON.parse(raw);
    const data: Record<string, unknown> = {};
    if (json.project) data.project = json.project;
    if (json.spring) data.spring = json.spring;
    sources.push({ name: 'config', priority: 1, data });
  } catch { /* skip */ }

  // 2. memory (priority 2)
  try {
    const raw = fs.readFileSync(path.join(projectRoot, '.demodev-memory.json'), 'utf8');
    sources.push({ name: 'memory', priority: 2, data: JSON.parse(raw) });
  } catch { /* skip */ }

  // 3. pdca (priority 3)
  try {
    const pdcaDir = path.join(projectRoot, '.pdca');
    const entries = fs.readdirSync(pdcaDir, { withFileTypes: true });
    const features: Record<string, unknown> = {};
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const statusPath = path.join(pdcaDir, entry.name, 'status.json');
        if (fs.existsSync(statusPath)) {
          const raw = fs.readFileSync(statusPath, 'utf8');
          features[entry.name] = JSON.parse(raw);
        }
      } catch { /* 개별 feature 실패 시 skip */ }
    }
    if (Object.keys(features).length > 0) {
      sources.push({ name: 'pdca', priority: 3, data: { features } });
    }
  } catch { /* skip */ }

  // 4. team (priority 4)
  try {
    const raw = fs.readFileSync(path.join(projectRoot, '.demodev', 'team-state.json'), 'utf8');
    sources.push({ name: 'team', priority: 4, data: JSON.parse(raw) });
  } catch { /* skip */ }

  // 5. lsp (priority 5)
  try {
    const raw = fs.readFileSync(path.join(projectRoot, '.demodev', 'lsp', 'bean-graph.json'), 'utf8');
    const graph = JSON.parse(raw);
    const beanCount = Array.isArray(graph.beans) ? graph.beans.length : 0;
    const edgeCount = Array.isArray(graph.edges) ? graph.edges.length : 0;
    sources.push({ name: 'lsp', priority: 5, data: { beanCount, edgeCount } });
  } catch { /* skip */ }

  // 6. snapshot (priority 6)
  try {
    const snapshotPath = path.join(projectRoot, '.demodev', 'snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      const raw = fs.readFileSync(snapshotPath, 'utf8');
      sources.push({ name: 'snapshot', priority: 6, data: JSON.parse(raw) });
    } else {
      sources.push({
        name: 'snapshot',
        priority: 6,
        data: { projectRoot, capturedAt: new Date().toISOString() },
      });
    }
  } catch { /* skip */ }

  return sources;
}

export function mergeContexts(sources: ContextSource[]): Record<string, unknown> {
  const sorted = [...sources].sort((a, b) => b.priority - a.priority);
  const merged: Record<string, unknown> = {};
  for (const source of sorted) {
    Object.assign(merged, source.data);
  }
  return merged;
}

export function buildSystemMessageLines(
  merged: Record<string, unknown>,
  maxLines = 20
): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(merged)) {
    if (lines.length >= maxLines) break;
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') {
      const keys = Object.keys(value as object);
      lines.push(`- ${key}: {${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`);
    } else {
      lines.push(`- ${key}: ${value}`);
    }
  }
  return lines;
}

export function injectContext(projectRoot: string): MergedContext {
  const sources = buildContextSources(projectRoot);
  const merged = mergeContexts(sources);
  const systemMessageLines = buildSystemMessageLines(merged);
  return { sources, merged, systemMessageLines };
}
