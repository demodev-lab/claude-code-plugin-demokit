/**
 * build.gradle 파싱 유틸리티
 * Groovy DSL build.gradle에서 프로젝트 메타정보 추출
 */
const { io, debug: log } = require('../core');

/**
 * build.gradle 전체 파싱
 * @param {string} filePath - build.gradle 경로
 * @returns {object} { group, version, sourceCompatibility, plugins, dependencies, springBootVersion, javaVersion }
 */
function parseGradleBuild(filePath) {
  const content = io.readFile(filePath);
  if (!content) {
    log.warn('gradle-parser', `build.gradle을 찾을 수 없습니다: ${filePath}`);
    return null;
  }

  return {
    group: extractGroup(content),
    version: extractVersion(content),
    sourceCompatibility: extractSourceCompatibility(content),
    plugins: extractPlugins(content),
    dependencies: extractDependencies(content),
    springBootVersion: detectSpringBootVersion(content),
    javaVersion: detectJavaVersion(content),
    repositories: extractRepositories(content),
  };
}

/**
 * group 추출
 */
function extractGroup(content) {
  const match = content.match(/group\s*=\s*['"](.+?)['"]/);
  return match ? match[1] : null;
}

/**
 * version 추출
 */
function extractVersion(content) {
  const match = content.match(/version\s*=\s*['"](.+?)['"]/);
  return match ? match[1] : null;
}

/**
 * sourceCompatibility 추출
 */
function extractSourceCompatibility(content) {
  const match = content.match(/sourceCompatibility\s*=\s*['"]?(\S+?)['"]?\s/);
  return match ? match[1] : null;
}

/**
 * plugins 블록 추출
 */
function extractPlugins(content) {
  const plugins = [];
  const blockMatch = content.match(/plugins\s*\{([\s\S]*?)\}/);
  if (!blockMatch) return plugins;

  const block = blockMatch[1];
  // id 'plugin-name' version 'x.y.z'
  const idPattern = /id\s+['"](.+?)['"]\s*(?:version\s+['"](.+?)['"])?/g;
  let m;
  while ((m = idPattern.exec(block)) !== null) {
    plugins.push({ id: m[1], version: m[2] || null });
  }
  // java, 'java-library' 등 단독 플러그인
  const simplePattern = /^\s+(java|groovy|application|war)\s*$/gm;
  while ((m = simplePattern.exec(block)) !== null) {
    plugins.push({ id: m[1], version: null });
  }
  return plugins;
}

/**
 * dependencies 블록 추출
 */
function extractDependencies(content) {
  const deps = [];
  const blockMatch = content.match(/dependencies\s*\{([\s\S]*?)^\}/m);
  if (!blockMatch) return deps;

  const block = blockMatch[1];
  // implementation 'group:artifact:version'
  const pattern = /(implementation|compileOnly|runtimeOnly|testImplementation|annotationProcessor|developmentOnly)\s+['"](.+?)['"]/g;
  let m;
  while ((m = pattern.exec(block)) !== null) {
    const parts = m[2].split(':');
    deps.push({
      scope: m[1],
      group: parts[0] || null,
      artifact: parts[1] || parts[0],
      version: parts[2] || null,
      raw: m[2],
    });
  }

  // platform/BOM 의존성
  const platformPattern = /(implementation)\s+platform\(['"](.+?)['"]\)/g;
  while ((m = platformPattern.exec(block)) !== null) {
    const parts = m[2].split(':');
    deps.push({
      scope: 'platform',
      group: parts[0] || null,
      artifact: parts[1] || parts[0],
      version: parts[2] || null,
      raw: m[2],
    });
  }

  return deps;
}

/**
 * Spring Boot 버전 감지
 */
function detectSpringBootVersion(content) {
  // plugins { id 'org.springframework.boot' version '3.x.x' }
  const pluginMatch = content.match(/id\s+['"]org\.springframework\.boot['"]\s+version\s+['"](.+?)['"]/);
  if (pluginMatch) return pluginMatch[1];

  // ext { springBootVersion = '3.x.x' }
  const extMatch = content.match(/springBootVersion\s*=\s*['"](.+?)['"]/);
  if (extMatch) return extMatch[1];

  return null;
}

/**
 * Java 버전 감지
 */
function detectJavaVersion(content) {
  // java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }
  const toolchainMatch = content.match(/JavaLanguageVersion\.of\((\d+)\)/);
  if (toolchainMatch) return toolchainMatch[1];

  // sourceCompatibility = '17'
  const srcMatch = content.match(/sourceCompatibility\s*=\s*['"]?(\d+)['"]?/);
  if (srcMatch) return srcMatch[1];

  return null;
}

/**
 * repositories 추출
 */
function extractRepositories(content) {
  const repos = [];
  const blockMatch = content.match(/repositories\s*\{([\s\S]*?)\}/);
  if (!blockMatch) return repos;

  const block = blockMatch[1];
  if (block.includes('mavenCentral()')) repos.push('mavenCentral');
  if (block.includes('mavenLocal()')) repos.push('mavenLocal');
  if (block.includes('jcenter()')) repos.push('jcenter');
  const urlMatch = block.match(/url\s+['"](.+?)['"]/g);
  if (urlMatch) {
    urlMatch.forEach(u => {
      const url = u.match(/['"](.+?)['"]/)[1];
      repos.push(url);
    });
  }
  return repos;
}

/**
 * 특정 의존성 존재 여부 확인
 * @param {Array} dependencies - extractDependencies 결과
 * @param {string} artifactName - 아티팩트명 (부분 매칭)
 */
function hasDependency(dependencies, artifactName) {
  return dependencies.some(d =>
    d.artifact && d.artifact.includes(artifactName)
  );
}

module.exports = {
  parseGradleBuild,
  extractGroup,
  extractVersion,
  extractPlugins,
  extractDependencies,
  detectSpringBootVersion,
  detectJavaVersion,
  hasDependency,
};
