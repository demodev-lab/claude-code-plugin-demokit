/**
 * Task Completed Hook
 * Agent 작업 완료 시:
 * 1. context.md에 현재 상태 저장
 * 2. PDCA 자동 진행 및 다음 단계 안내
 * 3. Loop 활성이면 루프 상태 업데이트
 */
const path = require('path');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData = {};
  try {
    if (input && input.trim()) hookData = JSON.parse(input);
  } catch { /* ignore */ }

  const { platform, cache } = require(path.join(__dirname, '..', 'lib', 'core'));
  const projectRoot = platform.findProjectRoot(process.cwd());

  if (!projectRoot) {
    console.log(JSON.stringify({}));
    return;
  }

  const hints = [];

  // 1. context.md 저장 (공통 상태 수집 사용)
  try {
    const { snapshot, writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
    const state = snapshot.collectState(projectRoot, cache);
    const taskDesc = hookData.task_description || hookData.tool_name || '작업 완료';

    writer.saveContext(projectRoot, {
      ...state,
      currentTask: {
        description: taskDesc,
        status: 'completed',
      },
      recentChanges: [taskDesc],
    });
  } catch (err) {
    process.stderr.write(`[demokit] context.md 저장 실패: ${err.message}\n`);
  }

  // 2. PDCA 진행 상태 확인
  try {
    const { status: pdcaStatus, phase: pdcaPhase } = require(path.join(__dirname, '..', 'lib', 'pdca'));
    const features = pdcaStatus.listFeatures(projectRoot);
    const activeFeature = features.find(f => f.currentPhase && f.currentPhase !== 'report');

    if (activeFeature) {
      const nextPhase = pdcaPhase.getNextPhase(activeFeature.currentPhase);
      if (nextPhase) {
        hints.push(`[PDCA] '${activeFeature.feature}' 현재 단계: ${activeFeature.currentPhase}`);
        hints.push(`  다음 단계: /pdca ${nextPhase} ${activeFeature.feature}`);
      }
    }
  } catch { /* pdca 모듈 로드 실패 시 무시 */ }

  // 3. Memory 자동 저장 (작업 유형 기반)
  try {
    const { scope } = require(path.join(__dirname, '..', 'lib', 'memory'));
    const taskDesc = (hookData.task_description || hookData.tool_name || '').toLowerCase();

    // entity 관련 작업 → domains 업데이트
    if (/entity|도메인/.test(taskDesc)) {
      const domainMatch = taskDesc.match(/(\w+)\s*(entity|엔티티)/i) || taskDesc.match(/(entity|엔티티)\s*(\w+)/i);
      if (domainMatch) {
        const domainName = (domainMatch[1] || domainMatch[2]).toLowerCase();
        if (domainName !== 'entity' && domainName !== '엔티티') {
          scope.updateMemory(projectRoot, `project.domains.${domainName}`, prev => ({
            ...prev,
            lastModified: new Date().toISOString().slice(0, 10),
          }));
        }
      }
    }

    // controller/api 작업 → apiEndpoints 기록은 상세 정보가 필요하므로 마커만
    if (/controller|컨트롤러|api/.test(taskDesc)) {
      scope.updateMemory(projectRoot, 'project._lastApiUpdate', () => new Date().toISOString());
    }

    // optimize 작업 → optimizations 기록
    if (/optimize|최적화|n\+1/.test(taskDesc)) {
      scope.updateMemory(projectRoot, 'project._lastOptimizeUpdate', () => new Date().toISOString());
    }
  } catch { /* memory 모듈 로드 실패 시 무시 */ }

  // 4. Skill Metadata — next-skill 제안
  try {
    const { skillLoader } = require(path.join(__dirname, '..', 'lib', 'core'));
    const taskDesc = hookData.task_description || hookData.tool_name || '';
    // 작업 설명에서 스킬명 추출 시도
    const skillPatterns = ['entity', 'repository', 'service', 'controller', 'dto', 'crud', 'exception', 'test', 'security', 'config', 'docker'];
    const matchedSkill = skillPatterns.find(s => new RegExp(`\\b${s}\\b`, 'i').test(taskDesc));

    if (matchedSkill) {
      const nextSkill = skillLoader.getNextSkill(matchedSkill);
      if (nextSkill) {
        const nextMeta = skillLoader.loadSkillMeta(nextSkill);
        const hint = nextMeta?.['argument-hint'] || '';
        hints.push(`[다음 스킬] /${nextSkill}${hint ? ` — ${hint}` : ''}`);
      }
    }
  } catch { /* skill-loader 실패 시 무시 */ }

  // 5. Team 작업 할당
  try {
    const { stateWriter, coordinator } = require(path.join(__dirname, '..', 'lib', 'team'));
    const teamState = stateWriter.loadTeamState(projectRoot);
    if (teamState.enabled) {
      const taskDesc = hookData.task_description || hookData.tool_name || '';
      // 완료 기록
      const matchedMember = teamState.members.find(m => m.status === 'active');
      if (matchedMember) {
        stateWriter.recordTaskCompletion(projectRoot, matchedMember.id, taskDesc, 'completed');
      }
      // 다음 작업 결정
      const next = coordinator.getNextAssignment(teamState, taskDesc);
      if (next) {
        hints.push(`[Team] 다음 작업: ${next.nextAgent} → ${next.nextTask}`);
      }
    }
  } catch { /* team 모듈 로드 실패 시 무시 */ }

  // 6. Loop 상태 확인
  try {
    const loopState = require(path.join(__dirname, '..', 'lib', 'loop', 'state'));
    const loop = loopState.getState(projectRoot);
    if (loop.active) {
      hints.push(`[Loop] 활성 중: ${loop.currentIteration}/${loop.maxIterations}회`);
    }
  } catch { /* loop 모듈 로드 실패 시 무시 */ }

  if (hints.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit]\n${hints.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(err => {
  console.error(`[demokit] task-completed 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
