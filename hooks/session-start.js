/**
 * SessionStart Hook
 * 세션 시작 시 Spring Boot 프로젝트 감지 및 컨텍스트 초기화
 *
 * 1. build.gradle 파싱 (Spring Boot 버전, Java 버전, 의존성)
 * 2. 프로젝트 구조 분석 (base package, 레이어 디렉토리, 설정 파일)
 * 3. 레벨 감지 (Monolith vs MSA)
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

  // 1. build.gradle / build.gradle.kts 파싱
  const fs = require('fs');
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
      lines.push(`  프롬프트: ${loop.prompt.substring(0, 80)}${loop.prompt.length > 80 ? '...' : ''}`);
    }
  } catch { /* loop 모듈 로드 실패 시 무시 */ }

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

  lines.push('');
  lines.push('사용 가능한 명령: /crud, /entity, /service, /controller, /pdca, /review, /test, /loop');

  const result = {
    systemMessage: lines.join('\n'),
  };
  console.log(JSON.stringify(result));
}

main().catch(err => {
  console.error(`[demokit] session-start 오류: ${err.message}`);
  console.log(JSON.stringify({ systemMessage: `[demokit] 초기화 오류: ${err.message}` }));
});
