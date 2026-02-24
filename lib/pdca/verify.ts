import fs from 'fs';
import path from 'path';

export type BuildTool = 'gradle' | 'maven' | 'npm';

export interface VerificationResult {
  buildTool: BuildTool;
  command: string;
  exitCode: number;
  passed: boolean;
  summary: string;
  executedAt: string;
}

export function detectBuildTool(projectRoot: string): BuildTool | null {
  if (
    fs.existsSync(path.join(projectRoot, 'build.gradle')) ||
    fs.existsSync(path.join(projectRoot, 'build.gradle.kts'))
  ) {
    return 'gradle';
  }
  if (fs.existsSync(path.join(projectRoot, 'pom.xml'))) {
    return 'maven';
  }
  if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
    return 'npm';
  }
  return null;
}

export function getVerifyCommand(projectRoot: string): string | null {
  const tool = detectBuildTool(projectRoot);
  if (tool === 'gradle') return './gradlew test --console=plain';
  if (tool === 'maven') return './mvnw test';
  if (tool === 'npm') {
    if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm test';
    if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) return 'yarn test';
    return 'npm test';
  }
  return null;
}

export function verificationPath(projectRoot: string, feature: string): string {
  return path.join(projectRoot, '.pdca', feature, 'verification.json');
}

export function saveVerification(
  projectRoot: string,
  feature: string,
  result: VerificationResult
): void {
  const filePath = verificationPath(projectRoot, feature);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
}

export function loadVerification(
  projectRoot: string,
  feature: string
): VerificationResult | null {
  const filePath = verificationPath(projectRoot, feature);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as VerificationResult;
  } catch {
    return null;
  }
}
