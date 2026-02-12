/**
 * build.gradle / build.gradle.kts 파싱 유틸리티
 * Groovy DSL 및 Kotlin DSL 모두 지원
 */
const { io, debug: log } = require('../core');

/**
 * build.gradle 전체 파싱
 * @param {string} filePath - build.gradle 또는 build.gradle.kts 경로
 * @returns {object} { group, version, sourceCompatibility, plugins, dependencies, springBootVersion, javaVersion, isKotlinDsl }
 */
function parseGradleBuild(filePath) {
  const content = io.readFile(filePath);
  if (!content) {
    log.warn('gradle-parser', `build.gradle을 찾을 수 없습니다: ${filePath}`);
    return null;
  }

  const isKotlinDsl = filePath.endsWith('.kts');

  return {
    group: extractGroup(content),
    version: extractVersion(content),
    sourceCompatibility: extractSourceCompatibility(content),
    plugins: extractPlugins(content),
    dependencies: extractDependencies(content),
    springBootVersion: detectSpringBootVersion(content),
    javaVersion: detectJavaVersion(content),
    repositories: extractRepositories(content),
    isKotlinDsl,
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
 * plugins 블록 추출 (Groovy DSL + Kotlin DSL)
 */
function extractPlugins(content) {
  const plugins = [];
  const blockMatch = content.match(/plugins\s*\{([\s\S]*?)\}/);
  if (!blockMatch) return plugins;

  const block = blockMatch[1];

  // Groovy: id 'plugin-name' version 'x.y.z'
  // Kotlin: id("plugin-name") version "x.y.z"
  const idPattern = /id\s*[( ]\s*["'](.+?)["']\s*\)?\s*(?:version\s*[( ]?\s*["'](.+?)["']\s*\)?)?/g;
  let m;
  while ((m = idPattern.exec(block)) !== null) {
    plugins.push({ id: m[1], version: m[2] || null });
  }

  // Kotlin DSL: kotlin("jvm") version "x.y.z"
  const kotlinPattern = /kotlin\s*\(\s*["'](.+?)["']\s*\)\s*(?:version\s*[( ]?\s*["'](.+?)["']\s*\)?)?/g;
  while ((m = kotlinPattern.exec(block)) !== null) {
    plugins.push({ id: `org.jetbrains.kotlin.${m[1]}`, version: m[2] || null });
  }

  // Groovy: java, 'java-library' 등 단독 플러그인
  const simplePattern = /^\s+(java|groovy|application|war)\s*$/gm;
  while ((m = simplePattern.exec(block)) !== null) {
    plugins.push({ id: m[1], version: null });
  }

  // Kotlin DSL: java, application 등 백틱 없는 플러그인
  const kotlinSimplePattern = /^\s+`?(java|application|war)`?\s*$/gm;
  while ((m = kotlinSimplePattern.exec(block)) !== null) {
    if (!plugins.some(p => p.id === m[1])) {
      plugins.push({ id: m[1], version: null });
    }
  }

  return plugins;
}

/**
 * dependencies 블록 추출 (Groovy DSL + Kotlin DSL)
 */
function extractDependencies(content) {
  const deps = [];
  const blockMatch = content.match(/dependencies\s*\{([\s\S]*?)^\}/m);
  if (!blockMatch) return deps;

  const block = blockMatch[1];
  const scopes = 'implementation|compileOnly|runtimeOnly|testImplementation|annotationProcessor|developmentOnly|testRuntimeOnly|kapt';

  // Groovy: implementation 'group:artifact:version'
  // Kotlin: implementation("group:artifact:version")
  const pattern = new RegExp(`(${scopes})\\s*[( ]\\s*["'](.+?)["']\\s*\\)?`, 'g');
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
  // Groovy: implementation platform('group:artifact:version')
  // Kotlin: implementation(platform("group:artifact:version"))
  const platformPattern = new RegExp(`(${scopes})\\s*\\(?\\s*platform\\s*\\(\\s*["'](.+?)["']\\s*\\)\\s*\\)?`, 'g');
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
  // Groovy: id 'org.springframework.boot' version '3.x.x'
  // Kotlin: id("org.springframework.boot") version "3.x.x"
  const pluginMatch = content.match(/id\s*[( ]\s*["']org\.springframework\.boot["']\s*\)?\s*version\s*[( ]?\s*["'](.+?)["']/);
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
  // Kotlin DSL에서도 동일 패턴
  const toolchainMatch = content.match(/JavaLanguageVersion\.of\((\d+)\)/);
  if (toolchainMatch) return toolchainMatch[1];

  // sourceCompatibility = '17' 또는 sourceCompatibility = JavaVersion.VERSION_17
  const srcMatch = content.match(/sourceCompatibility\s*=\s*['"]?(\d+)['"]?/);
  if (srcMatch) return srcMatch[1];

  const javaVersionMatch = content.match(/sourceCompatibility\s*=\s*JavaVersion\.VERSION_(\d+)/);
  if (javaVersionMatch) return javaVersionMatch[1];

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
  const urlMatch = block.match(/url\s*[= (]\s*["'](.+?)["']/g);
  if (urlMatch) {
    urlMatch.forEach(u => {
      const url = u.match(/["'](.+?)["']/)[1];
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
