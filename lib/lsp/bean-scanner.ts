import * as fs from 'fs';
import * as path from 'path';

export interface SpringBean {
  className: string;
  beanType: 'Service' | 'Component' | 'Repository' | 'Controller' | 'Configuration';
  packageName: string;
  filePath: string;
  constructorDeps: string[];
}

export interface BeanGraph {
  beans: SpringBean[];
  edges: Array<{ from: string; to: string }>;
  scannedAt: string;
  skipped?: boolean;
}

function findJavaFiles(dir: string, results: string[] = [], limit = Infinity): string[] {
  if (!fs.existsSync(dir) || results.length > limit) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (results.length > limit) break;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJavaFiles(full, results, limit);
    } else if (entry.isFile() && entry.name.endsWith('.java')) {
      results.push(full);
    }
  }
  return results;
}

export function parseJavaFile(filePath: string, content: string): SpringBean | null {
  const annotationMatch = content.match(/@(Service|Component|Repository|RestController|Controller|Configuration)\b/);
  if (!annotationMatch) return null;

  const rawType = annotationMatch[1];
  const beanType = rawType === 'RestController' ? 'Controller' : rawType as SpringBean['beanType'];

  const classMatch = content.match(/class\s+(\w+)/);
  if (!classMatch) return null;
  const className = classMatch[1];

  const packageMatch = content.match(/package\s+([\w.]+)/);
  const packageName = packageMatch ? packageMatch[1] : '';

  const constructorDeps: string[] = [];
  const ctorRegex = new RegExp(`(?:public|protected|private)\\s+${className}\\s*\\(([^)]+)\\)`);
  const ctorMatch = content.match(ctorRegex);
  if (ctorMatch && ctorMatch[1].trim()) {
    for (const param of ctorMatch[1].split(',')) {
      const parts = param.trim().split(/\s+/);
      if (parts.length >= 2) {
        constructorDeps.push(parts[parts.length - 2]);
      }
    }
  }

  return { className, beanType, packageName, filePath, constructorDeps };
}

export function buildEdges(beans: SpringBean[]): BeanGraph['edges'] {
  const classNames = new Set(beans.map(b => b.className));
  const edges: BeanGraph['edges'] = [];
  for (const bean of beans) {
    for (const dep of bean.constructorDeps) {
      if (classNames.has(dep)) {
        edges.push({ from: bean.className, to: dep });
      }
    }
  }
  return edges;
}

export function scanBeans(projectRoot: string, maxFiles = 500): BeanGraph {
  const srcMain = path.join(projectRoot, 'src', 'main', 'java');
  const javaFiles = findJavaFiles(srcMain, [], maxFiles);

  if (javaFiles.length > maxFiles) {
    return { beans: [], edges: [], scannedAt: new Date().toISOString(), skipped: true } as BeanGraph;
  }

  const beans: SpringBean[] = [];
  for (const filePath of javaFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const bean = parseJavaFile(filePath, content);
    if (bean) beans.push(bean);
  }

  const edges = buildEdges(beans);
  return { beans, edges, scannedAt: new Date().toISOString() };
}

export function saveBeanGraph(projectRoot: string, graph: BeanGraph): void {
  const outDir = path.join(projectRoot, '.demodev', 'lsp');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'bean-graph.json'), JSON.stringify(graph, null, 2), 'utf-8');
}

export function loadBeanGraph(projectRoot: string): BeanGraph | null {
  const filePath = path.join(projectRoot, '.demodev', 'lsp', 'bean-graph.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as BeanGraph;
  } catch {
    return null;
  }
}

export function shouldRescan(existing: BeanGraph | null, maxAgeMs = 300000): boolean {
  if (!existing || existing.skipped) return true;
  return Date.now() - new Date(existing.scannedAt).getTime() > maxAgeMs;
}
