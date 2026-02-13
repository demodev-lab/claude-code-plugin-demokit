/**
 * Spring Boot 프로젝트 구조 분석
 * 도메인 기반 패키지 구조 (domain-based package structure)
 *
 * 구조:
 *   {basePackage}/common/   - 공통 모듈
 *   {basePackage}/domain/   - 비즈니스 도메인 (도메인별 하위 패키지)
 */
const path = require('path');
const fs = require('fs');
const { io, file: fileUtil, debug: log, platform } = require('../core');

/**
 * 프로젝트 구조 전체 분석
 */
function analyzeProject(projectRoot) {
  const srcMainJava = path.join(projectRoot, 'src', 'main', 'java');
  const srcMainResources = path.join(projectRoot, 'src', 'main', 'resources');
  const srcTestJava = path.join(projectRoot, 'src', 'test', 'java');

  const basePackage = detectBasePackage(srcMainJava);
  const structure = detectStructure(srcMainJava, basePackage);
  const configFiles = detectConfigFiles(srcMainResources);

  return {
    projectRoot: platform.normalizePath(projectRoot),
    srcMainJava: platform.normalizePath(srcMainJava),
    srcMainResources: platform.normalizePath(srcMainResources),
    srcTestJava: platform.normalizePath(srcTestJava),
    basePackage,
    basePackagePath: basePackage ? path.join(srcMainJava, fileUtil.packageToPath(basePackage)) : null,
    structure,
    configFiles,
    domains: detectDomains(srcMainJava, basePackage),
  };
}

/**
 * base package 감지 (@SpringBootApplication 클래스의 패키지)
 */
function detectBasePackage(srcMainJava) {
  if (!io.fileExists(srcMainJava)) return null;

  const javaFiles = io.listFiles(srcMainJava, /\.java$/);

  for (const filePath of javaFiles) {
    const content = io.readFile(filePath);
    if (content && content.includes('@SpringBootApplication')) {
      const pkgMatch = content.match(/package\s+([\w.]+)\s*;/);
      if (pkgMatch) {
        log.debug('project-analyzer', `base package 감지: ${pkgMatch[1]}`);
        return pkgMatch[1];
      }
    }
  }

  if (javaFiles.length > 0) {
    let shortest = null;
    for (const filePath of javaFiles) {
      const pkg = fileUtil.pathToPackage(filePath);
      if (pkg && (!shortest || pkg.length < shortest.length)) {
        shortest = pkg;
      }
    }
    return shortest;
  }

  return null;
}

/**
 * 프로젝트 구조 감지 (common + domain 기반)
 */
function detectStructure(srcMainJava, basePackage) {
  if (!basePackage) return { common: {}, domains: {} };
  const basePath = path.join(srcMainJava, fileUtil.packageToPath(basePackage));

  // common 패키지 감지
  const commonPath = path.join(basePath, 'common');
  const commonSubDirs = ['config', 'exception', 'security', 'domain'];
  const common = {};
  for (const sub of commonSubDirs) {
    const subPath = path.join(commonPath, sub);
    common[sub] = {
      exists: io.fileExists(subPath),
      path: platform.normalizePath(subPath),
    };
  }

  // domain 패키지 하위 도메인별 구조 감지
  const domainPath = path.join(basePath, 'domain');
  const domains = {};
  if (io.fileExists(domainPath)) {
    try {
      const entries = fs.readdirSync(domainPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const domainDir = path.join(domainPath, entry.name);
        const layerDirs = ['entity', 'repository', 'service', 'controller', 'dto'];
        const layers = {};
        for (const layer of layerDirs) {
          const layerPath = path.join(domainDir, layer);
          layers[layer] = {
            exists: io.fileExists(layerPath),
            path: platform.normalizePath(layerPath),
          };
        }
        domains[entry.name] = { path: platform.normalizePath(domainDir), layers };
      }
    } catch { /* ignore */ }
  }

  return { common, domains };
}

/**
 * 설정 파일 감지 (application.yml, application.properties 등)
 */
function detectConfigFiles(srcMainResources) {
  if (!io.fileExists(srcMainResources)) return [];
  const configPatterns = /^application.*\.(yml|yaml|properties)$/;
  const files = io.listFiles(srcMainResources, configPatterns);
  return files.map(f => platform.normalizePath(f));
}

/**
 * 도메인 목록 감지 (domain/ 디렉토리의 하위 디렉토리)
 */
function detectDomains(srcMainJava, basePackage) {
  if (!basePackage) return [];
  const domainPath = path.join(srcMainJava, fileUtil.packageToPath(basePackage), 'domain');
  if (!io.fileExists(domainPath)) return [];

  try {
    const entries = fs.readdirSync(domainPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    return [];
  }
}

/**
 * 프로젝트 레벨 감지 (Monolith vs MSA)
 */
function detectProjectLevel(projectRoot, dependencies) {
  const { hasDependency } = require('./gradle-parser');

  const msaDeps = [
    'spring-cloud-starter-netflix-eureka',
    'spring-cloud-starter-gateway',
    'spring-cloud-starter-openfeign',
    'spring-cloud-starter-config',
  ];

  const hasMsaDep = msaDeps.some(dep => hasDependency(dependencies, dep));

  const settingsPath = path.join(projectRoot, 'settings.gradle');
  const settingsContent = io.readFile(settingsPath);
  const hasMultiModule = settingsContent
    ? (settingsContent.match(/include\s/g) || []).length >= 2
    : false;

  if (hasMsaDep || hasMultiModule) {
    return {
      level: 'MSA',
      indicators: [
        hasMsaDep && 'Spring Cloud 의존성 감지',
        hasMultiModule && '멀티모듈 구조 감지',
      ].filter(Boolean),
    };
  }

  return {
    level: 'Monolith',
    indicators: ['단일 모듈 구조'],
  };
}

module.exports = { analyzeProject, detectBasePackage, detectStructure, detectConfigFiles, detectDomains, detectProjectLevel };
