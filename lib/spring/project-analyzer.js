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

  // Fast path: 일반적으로 *Application.java에 @SpringBootApplication이 위치함
  // 전체 Java 파일 내용 스캔 전에 후보 파일만 우선 확인
  const appCandidates = io.listFiles(srcMainJava, /Application\.java$/);
  for (const filePath of appCandidates) {
    const content = io.readFile(filePath);
    if (content && content.includes('@SpringBootApplication')) {
      const pkgMatch = content.match(/package\s+([\w.]+)\s*;/);
      if (pkgMatch) {
        log.debug('project-analyzer', `base package 감지(fast): ${pkgMatch[1]}`);
        return pkgMatch[1];
      }
    }
  }

  // Fallback: 기존 방식 (전체 Java 파일 스캔)
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
 * 프로젝트 레벨 감지 (SingleModule / MultiModule / MSA)
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

  // settings.gradle 또는 settings.gradle.kts 지원
  const settingsPath = path.join(projectRoot, 'settings.gradle');
  const settingsKtsPath = path.join(projectRoot, 'settings.gradle.kts');
  const settingsContent = io.readFile(settingsPath) ?? io.readFile(settingsKtsPath);
  // include 문에 속한 모듈 수만 카운트 (여러 줄 Kotlin DSL 블록 포함)
  const includeBlocks = settingsContent
    ? (settingsContent.match(/include\s*\([^)]*\)|include\s+[^\n]*/g) || [])
    : [];
  const includeCount = includeBlocks.join(' ')
    .match(/['"][^'"]+['"]/g)?.length || 0;

  // MSA: Spring Cloud 의존성이 있으면 MSA
  if (hasMsaDep) {
    return {
      level: 'MSA',
      indicators: [
        'Spring Cloud 의존성 감지',
        includeCount >= 2 && '멀티모듈 구조 감지',
      ].filter(Boolean),
    };
  }

  // MultiModule: include 2개 이상이지만 MSA 의존성 없음
  if (includeCount >= 2) {
    return {
      level: 'MultiModule',
      indicators: ['멀티모듈 구조 감지 (MSA 의존성 없음)'],
    };
  }

  // SingleModule: 기본값
  return {
    level: 'SingleModule',
    indicators: ['단일 모듈 구조'],
  };
}

module.exports = { analyzeProject, detectBasePackage, detectStructure, detectConfigFiles, detectDomains, detectProjectLevel };
