/**
 * SessionStart Hook
 * 세션 시작 시 Spring Boot 프로젝트 감지 및 컨텍스트 초기화
 *
 * 1. build.gradle 파싱 (Spring Boot 버전, Java 버전, 의존성)
 * 2. 프로젝트 구조 분석 (base package, 레이어 디렉토리, 설정 파일)
 * 3. 레벨 감지 (SingleModule / MultiModule / MSA)
 * 4. PDCA 상태 초기화
 * 5. 세션 컨텍스트 systemMessage 출력
 */
const path = require('path');

async function main() {
  const { platform, io, cache, debug: log } = require('../lib/core');
  const { gradleParser, projectAnalyzer } = require('../lib/spring');
  const { status: pdcaStatus, level: pdcaLevel } = require('../lib/pdca');

  const projectRoot = platform.findProjectRoot(process.cwd());

  if (!projectRoot) {
    // Spring Boot 프로젝트가 아님 - 최소한의 메시지만
    const result = {
      systemMessage: '[demokit] Spring Boot 프로젝트가 감지되지 않았습니다. /init 으로 프로젝트를 초기화하세요.',
    };
    console.log(JSON.stringify(result));
    return;
  }

  const fs = require('fs');
  const crypto = require('crypto');

  // Web UI 자동 시작 (port 파일 기반 중복 체크)
  let webUiPort = null;
  try {
    const { spawn: spawnChild } = require('child_process');
    const portFile = path.join(projectRoot, '.demodev', 'web-ui.port');
    const hash = crypto.createHash('md5').update(projectRoot).digest();
    webUiPort = 2415 + (hash[0] % 100);
    let alreadyRunning = false;
    try {
      const info = JSON.parse(fs.readFileSync(portFile, 'utf-8'));
      if (info.pid) { process.kill(info.pid, 0); alreadyRunning = true; webUiPort = info.port; }
    } catch { /* 파일 없거나 프로세스 죽음 */ }
    if (!alreadyRunning) {
      const child = spawnChild(process.execPath, [
        path.join(__dirname, '..', 'scripts', 'web-ui.js'),
      ], {
        detached: true, stdio: 'ignore', cwd: projectRoot,
        env: { ...process.env, CLAUDE_PID: String(process.ppid) },
      });
      child.unref();
    }
  } catch { /* ignore */ }

  // 1. build.gradle / build.gradle.kts 파싱
  const buildGradlePath = path.join(projectRoot, 'build.gradle');
  const buildGradleKtsPath = path.join(projectRoot, 'build.gradle.kts');
  const gradlePath = fs.existsSync(buildGradleKtsPath) ? buildGradleKtsPath : buildGradlePath;
  const gradle = gradleParser.parseGradleBuild(gradlePath);

  if (!gradle) {
    const result = {
      systemMessage: '[demokit] build.gradle(.kts) 파싱 실패. Gradle 프로젝트인지 확인하세요.',
    };
    console.log(JSON.stringify(result));
    return;
  }

  // 2. 프로젝트 구조 분석
  const project = projectAnalyzer.analyzeProject(projectRoot);

  // 3. 레벨 감지
  const levelResult = projectAnalyzer.detectProjectLevel(projectRoot, gradle.dependencies);

  // 4. PDCA 진행 중인 feature 확인
  const activeFeatures = pdcaStatus.listFeatures(projectRoot);

  // 5. 캐시에 분석 결과 저장
  cache.set('projectRoot', projectRoot);
  cache.set('gradle', gradle);
  cache.set('project', project);
  cache.set('level', levelResult.level);

  // 5.5. Project auto-scan
  try {
    const scanEnabled = require('../lib/core').hookRuntime.shouldRun({ scriptKey: 'projectAutoScan', scriptFallback: false });
    if (scanEnabled) {
      const scanner = require(path.join(__dirname, '..', 'dist', 'lib', 'memory', 'project-scanner'));
      const { storage: memStorage } = require('../lib/memory');
      const memory = memStorage.loadMemory(projectRoot);
      const existing = memory.project?.metadata || null;
      if (scanner.shouldRescan(existing)) {
        const metadata = scanner.scanProject(projectRoot, gradle, project, levelResult.level);
        const updated = scanner.mergeIntoMemory(memory, metadata);
        memStorage.saveMemory(projectRoot, updated);
      }
    }
  } catch { /* 스캔 실패 시 무시 */ }

  // 5.6. Bean scan
  try {
    const scanEnabled = require('../lib/core').hookRuntime.shouldRun({ scriptKey: 'beanScanHandler', scriptFallback: false });
    if (scanEnabled) {
      const scanner = require(path.join(__dirname, '..', 'dist', 'lib', 'lsp', 'bean-scanner'));
      const existing = scanner.loadBeanGraph(projectRoot);
      if (scanner.shouldRescan(existing)) {
        const graph = scanner.scanBeans(projectRoot);
        scanner.saveBeanGraph(projectRoot, graph);
      }
    }
  } catch { /* bean scan 실패 시 무시 */ }

  // 6. systemMessage 구성
  const lines = [
    `[demokit] Spring Boot 프로젝트 감지`,
    `- Spring Boot: ${gradle.springBootVersion || '알 수 없음'}`,
    `- Java: ${gradle.javaVersion || '알 수 없음'}`,
    `- Base Package: ${project.basePackage || '알 수 없음'}`,
    `- 레벨: ${levelResult.level} (${levelResult.indicators.join(', ')})`,
    `- 의존성: ${gradle.dependencies.length}개`,
  ];

  // common 패키지 상태 표시
  const existingCommon = Object.entries(project.structure.common || {})
    .filter(([, v]) => v.exists)
    .map(([k]) => k);
  if (existingCommon.length > 0) {
    lines.push(`- common: ${existingCommon.join(', ')}`);
  }

  // 도메인 표시
  if (project.domains.length > 0) {
    lines.push(`- 도메인: ${project.domains.join(', ')}`);
  }

  // PDCA 진행 상황
  if (activeFeatures.length > 0) {
    lines.push(`- PDCA 진행 중: ${activeFeatures.map(f => `${f.feature}(${f.currentPhase})`).join(', ')}`);
  }

  // Loop 상태 표시
  try {
    const { state: loopState } = require('../lib/loop');
    const loop = loopState.getState(projectRoot);
    if (loop.active) {
      lines.push(`- Loop 활성: ${loop.currentIteration}/${loop.maxIterations}회 (완료 신호: '${loop.completionPromise}')`);
      const promptText = loop.prompt || '(프롬프트 없음)';
      lines.push(`  프롬프트: ${promptText.substring(0, 80)}${promptText.length > 80 ? '...' : ''}`);
    }
  } catch { /* loop 모듈 로드 실패 시 무시 */ }

  // Team 모드 감지/제안
  try {
    const { teamConfig, stateWriter, orchestrator } = require('../lib/team');
    if (teamConfig.isTeamEnabled()) {
      let teamState = stateWriter.loadTeamState(projectRoot);
      if (teamState.enabled !== true && activeFeatures.length > 0) {
        teamState.enabled = true;
        stateWriter.saveTeamState(projectRoot, teamState);
      }

      const synced = orchestrator.syncTeamQueueFromPdca(projectRoot, stateWriter);
      if (synced.state) {
        teamState = synced.state;
      }

      if (teamState.enabled && teamState.currentPhase) {
        lines.push('');
        lines.push(`[Team] 이전 세션 팀 상태 복원 가능: phase=${teamState.currentPhase}, feature=${teamState.feature || '?'}`);
        const activeMembers = (teamState.members || []).filter(m => m.status === 'active' || m.status === 'paused');
        if (activeMembers.length > 0) {
          lines.push(`  멤버: ${activeMembers.map(m => `${m.id}(${m.status})`).join(', ')}`);
        }
      } else if (activeFeatures.length > 0) {
        lines.push('');
        lines.push('[Team] 팀 모드 사용 가능: PDCA 진행 중인 feature에 팀 에이전트를 활용할 수 있습니다.');
      }
    }
  } catch { /* team 모듈 로드 실패 시 무시 */ }

  // 이전 세션 요약 주입
  try {
    const { summaryInjector } = require('../lib/context-store');
    if (summaryInjector) {
      const summaryLines = summaryInjector.buildSystemMessageLines(projectRoot);
      if (summaryLines.length > 0) {
        lines.push('');
        lines.push(...summaryLines);
      }
    }
  } catch { /* ignore */ }

  // 이전 세션 context.md 복원 안내
  try {
    const { writer } = require('../lib/context-store');
    const prevContext = writer.readContext(projectRoot);
    if (prevContext) {
      lines.push('');
      lines.push('📎 이전 세션 컨텍스트가 있습니다: .demodev/context.md');
      lines.push('  이전 작업을 이어서 하려면 해당 파일을 참조하세요.');
    }
  } catch { /* ignore */ }

  // Agent Memory 요약 주입
  try {
    const { storage: memStorage } = require('../lib/memory');
    const memory = memStorage.loadMemory(projectRoot);
    const summary = memStorage.summarizeMemory(memory);
    if (summary) {
      lines.push('');
      lines.push(`🧠 프로젝트 메모리: ${summary}`);
    }
  } catch { /* memory 모듈 로드 실패 시 무시 */ }

  // Context Injection
  try {
    const ctxConfig = require('../lib/core').config.getConfigValue('contextInjection.enabled', true);
    const { injector } = require('../lib/context-store');
    if (injector && ctxConfig !== false) {
      const merged = injector.injectContext(projectRoot);
      if (merged.systemMessageLines.length > 0) {
        lines.push('');
        lines.push('[Context] 통합 컨텍스트 주입');
        lines.push(...merged.systemMessageLines);
      }
    }
  } catch { /* ignore */ }

  // Feature Usage Report
  try {
    const featureReport = buildFeatureUsageReport(levelResult.level, activeFeatures.length > 0);
    if (featureReport) {
      lines.push('');
      lines.push(featureReport);
    }
  } catch { /* ignore */ }

  if (webUiPort) {
    lines.push(`- Web UI: http://localhost:${webUiPort}`);
  }

  lines.push('');
  lines.push('사용 가능한 명령: /crud, /entity, /service, /controller, /pdca, /review, /test, /loop, /plan-plus, /pipeline, /qa');

  const result = {
    systemMessage: lines.join('\n'),
  };
  console.log(JSON.stringify(result));
}

/**
 * Feature Usage Report 생성
 * @param {string} level - 프로젝트 레벨
 * @param {boolean} hasPdca - PDCA 진행 중 여부
 * @returns {string|null}
 */
function buildFeatureUsageReport(level, hasPdca) {
  const features = [];

  if (level === 'SingleModule' || level === 'Starter') {
    features.push(`${level}: /crud, /entity, /pdca, /plan-plus`);
  } else if (level === 'MultiModule' || level === 'Monolith') {
    features.push(`${level}: /crud, /entity, /pdca, /pipeline, /plan-plus`);
  } else if (level === 'MSA') {
    features.push('MSA: /crud, /entity, /pdca, /pipeline, /plan-plus, /qa');
  } else {
    features.push(`${level}: /crud, /entity, /pdca, /plan-plus`);
  }

  if (hasPdca) {
    features.push('PDCA 활성: /pipeline 으로 9단계 개발 파이프라인 사용 가능');
  }

  return features.length > 0 ? `[Feature] ${features.join(' | ')}` : null;
}

main().catch(err => {
  console.error(`[demokit] session-start 오류: ${err.message}`);
  console.log(JSON.stringify({ systemMessage: `[demokit] 초기화 오류: ${err.message}` }));
});
