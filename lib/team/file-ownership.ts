export type OwnershipType = 'exclusive' | 'shared' | 'unowned';

export interface FileOwnership {
  filePath: string;
  owner: string | null;
  ownershipType: OwnershipType;
  matchedPattern: string | null;
}

export interface OwnershipMap {
  files: FileOwnership[];
  byLayer: Record<string, string[]>;  // layer → exclusive file paths
  shared: string[];
  unowned: string[];
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLESTAR>>>/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/**
 * 프로젝트 파일들을 layer 패턴에 매칭하여 분류
 */
export function classifyFiles(
  projectFiles: string[],
  layerPatterns: Record<string, string[]>
): OwnershipMap {
  const files: FileOwnership[] = [];
  const byLayer: Record<string, string[]> = {};
  const shared: string[] = [];
  const unowned: string[] = [];

  const layerEntries = Object.entries(layerPatterns);
  const layerRegexes: [string, RegExp[]][] = layerEntries.map(([layer, patterns]) => [
    layer,
    patterns.map(globToRegex),
  ]);

  for (const filePath of projectFiles) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const matchedLayers: string[] = [];
    const matchedPatternByLayer: Record<string, string> = {};

    for (const [layer, regexes] of layerRegexes) {
      const idx = regexes.findIndex(re => re.test(normalizedPath));
      if (idx >= 0) {
        matchedLayers.push(layer);
        matchedPatternByLayer[layer] = layerPatterns[layer][idx];
      }
    }

    let ownershipType: OwnershipType;
    let owner: string | null = null;
    let matchedPattern: string | null = null;

    if (matchedLayers.length === 0) {
      ownershipType = 'unowned';
      unowned.push(filePath);
    } else if (matchedLayers.length === 1) {
      ownershipType = 'exclusive';
      owner = matchedLayers[0];
      matchedPattern = matchedPatternByLayer[owner];
      if (!byLayer[owner]) byLayer[owner] = [];
      byLayer[owner].push(filePath);
    } else {
      ownershipType = 'shared';
      shared.push(filePath);
    }

    files.push({ filePath, owner, ownershipType, matchedPattern });
  }

  return { files, byLayer, shared, unowned };
}

export function getExclusiveFiles(map: OwnershipMap, layer: string): string[] {
  return map.byLayer[layer] || [];
}

export function getDoNotTouchFiles(map: OwnershipMap, layer: string): string[] {
  return Object.entries(map.byLayer)
    .filter(([l]) => l !== layer)
    .flatMap(([, files]) => files);
}
