export interface ProjectMetadata {
  techStack: {
    framework: string;
    frameworkVersion: string;
    language: string;
    languageVersion: string;
    buildTool: string;
  };
  structure: {
    domains: string[];
    basePackage: string;
    level: string;
  };
  scannedAt: string;
}

export function scanProject(_projectRoot: string, gradle: any, project: any, level: string): ProjectMetadata {
  return {
    techStack: {
      framework: 'spring-boot',
      frameworkVersion: gradle.springBootVersion || '',
      language: 'java',
      languageVersion: gradle.javaVersion || '',
      buildTool: gradle.buildTool || 'gradle-groovy',
    },
    structure: {
      domains: project.domains || [],
      basePackage: project.basePackage || '',
      level,
    },
    scannedAt: new Date().toISOString(),
  };
}

export function shouldRescan(existing: ProjectMetadata | null, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  if (existing === null) return true;
  const parsed = Date.parse(existing.scannedAt);
  if (isNaN(parsed)) return true;
  return Date.now() - parsed > maxAgeMs;
}

export function mergeIntoMemory(memory: any, metadata: ProjectMetadata): any {
  return {
    ...memory,
    project: {
      ...(memory?.project || {}),
      metadata,
    },
  };
}
