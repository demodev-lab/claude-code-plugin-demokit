/**
 * Task Completed Hook
 * Agent 작업 완료 시:
 * 1. context.md에 현재 상태 저장
 * 2. PDCA 자동 진행 및 다음 단계 안내
 * 3. Loop 활성이면 루프 상태 업데이트
 */
const path = require('path');
const { resolveAgentIdFromHook } = require(path.join(__dirname, '..', 'lib', 'team', 'agent-id'));

function extractAgentId(hookData) {
  const resolved = resolveAgentIdFromHook(hookData);
  return resolved ? resolved : null;
}

function extractCompletedTaskId(hookData, activeMember) {
  return hookData.task_id
    || hookData.tool_input?.task_id
    || hookData.tool_name
    || hookData.task_description
    || hookData.tool_input?.prompt
    || hookData.tool_input?.task_description
    || activeMember?.currentTask
    || '작업 완료';
}

function resolveTaskDoneMember(teamState, explicitAgentId, completedTaskId, coordinator) {
  if (!teamState || !Array.isArray(teamState.members)) return null;
  if (explicitAgentId) {
    const matched = teamState.members.find(m => m.id === explicitAgentId);
    if (matched) return matched;
  }

  const normalizedTaskId = typeof completedTaskId === 'string' ? completedTaskId.trim() : '';
  if (!normalizedTaskId || !coordinator?.isMatchedTask) {
    return teamState.members.find(m => m.status === 'active') || null;
  }

  const activeMembers = teamState.members.filter(m => m.status === 'active' && m.id);
  const matchedByTask = activeMembers.filter((member) => coordinator.isMatchedTask({
    id: member.currentTask || '',
    subject: member.currentTask || '',
    description: member.currentTask || '',
  }, normalizedTaskId));

  if (matchedByTask.length === 1) return matchedByTask[0];
  if (matchedByTask.length > 1) return matchedByTask[0];

  return activeMembers[0] || null;
}

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

  // 2. PDCA 진행 상태 확인 + 자동 전환
  try {
    const { status: pdcaStatus, phase: pdcaPhase, automation } = require(path.join(__dirname, '..', 'lib', 'pdca'));
    const features = pdcaStatus.listFeatures(projectRoot);
    const activeFeature = features.find(f => f.currentPhase && f.currentPhase !== 'report');

    if (activeFeature) {
      const currentPhase = activeFeature.currentPhase;
      const nextPhase = pdcaPhase.getNextPhase(currentPhase);

      // 자동 전환 판단
      const shouldAuto = nextPhase && automation.shouldAutoTransition(projectRoot, activeFeature.feature, currentPhase);

      if (shouldAuto) {
        // 현재 phase 완료 처리
        pdcaStatus.updatePhaseStatus(projectRoot, activeFeature.feature, currentPhase, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
        // 다음 phase로 전환
        const fullStatus = pdcaStatus.loadStatus(projectRoot, activeFeature.feature);
        fullStatus.currentPhase = nextPhase;
        fullStatus.phases[nextPhase].status = 'in-progress';
        fullStatus.phases[nextPhase].startedAt = new Date().toISOString();
        pdcaStatus.saveStatus(projectRoot, activeFeature.feature, fullStatus);

        const summary = pdcaPhase.generatePhaseSummary(fullStatus);
        hints.push(`[PDCA] '${activeFeature.feature}' 자동 전환: ${currentPhase} → ${nextPhase}`);
        hints.push(`  ${summary}`);
      } else if (nextPhase) {
        // 수동 전환 제안 + deliverables 상태
        hints.push(`[PDCA] '${activeFeature.feature}' 현재 단계: ${currentPhase}`);
        try {
          const deliverables = pdcaPhase.checkPhaseDeliverables(projectRoot, activeFeature.feature, currentPhase);
          if (deliverables.complete) {
            hints.push(`  산출물 완료. 다음 단계: /pdca ${nextPhase} ${activeFeature.feature}`);
          } else {
            hints.push(`  미완료 산출물: ${deliverables.missing.join(', ')}`);
            hints.push(`  다음 단계: /pdca ${nextPhase} ${activeFeature.feature}`);
          }
        } catch {
          hints.push(`  다음 단계: /pdca ${nextPhase} ${activeFeature.feature}`);
        }
      }
    }
  } catch { /* pdca 모듈 로드 실패 시 무시 */ }

  // 3. Memory 자동 저장 (작업 유형 기반)
  try {
    const { scope } = require(path.join(__dirname, '..', 'lib', 'memory'));
    const taskDesc = (hookData.task_description || hookData.tool_name || '').toLowerCase();

    // entity 관련 작업 → domains 업데이트
    if (/entity|도메인/.test(taskDesc)) {
      const domainMatch1 = taskDesc.match(/(\w+)\s*(?:entity|엔티티)/i);
      const domainMatch2 = taskDesc.match(/(?:entity|엔티티)\s*(\w+)/i);
      const domainMatch = domainMatch1 || domainMatch2;
      if (domainMatch) {
        const domainName = domainMatch[1].toLowerCase();
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

  // 5. Team Hooks - phase 완료 시 다음 phase 전환 안내
  try {
    const { status: pdcaStatusMod } = require(path.join(__dirname, '..', 'lib', 'pdca'));
    const { hooks: teamHooks } = require(path.join(__dirname, '..', 'lib', 'team'));
    const features = pdcaStatusMod.listFeatures(projectRoot);
    const activeFeature = features.find(f => f.currentPhase && f.currentPhase !== 'report');

    if (activeFeature) {
      const result = teamHooks.assignNextTeammateWork(
        activeFeature.currentPhase,
        activeFeature.feature,
        activeFeature.level || 'Monolith'
      );

      if (result.nextPhase) {
        hints.push(`[Team Hooks] 다음 phase: ${result.nextPhase} (패턴: ${result.team.pattern})`);
        if (result.needsRecompose) {
          hints.push(`[Team Hooks] 팀 재구성 필요`);
        }
      }
    }
  } catch { /* team hooks 실패 시 무시 */ }

  // 6. Team 작업 할당
  try {
    const { stateWriter, coordinator, orchestrator, teamConfig } = require(path.join(__dirname, '..', 'lib', 'team'));
    const cleanupPolicy = teamConfig.getCleanupPolicy ? teamConfig.getCleanupPolicy() : {};
    const teamState = stateWriter.loadTeamState(projectRoot);
    if (teamState.enabled) {
      const staleResult = cleanupPolicy?.staleMemberMs
        ? stateWriter.cleanupStaleMembers(projectRoot, cleanupPolicy.staleMemberMs)
        : { state: null };

      const currentTeamState = staleResult.state || teamState;
      const taskDesc = hookData.task_description || hookData.tool_name || '';
      const explicitAgentId = extractAgentId(hookData);

      // 완료 기록
      let finalState = currentTeamState;
      const tentativeTaskId = extractCompletedTaskId(hookData) || taskDesc;
      const matchedMember = resolveTaskDoneMember(currentTeamState, explicitAgentId, tentativeTaskId, coordinator);
      const completedTaskId = extractCompletedTaskId(hookData, matchedMember) || taskDesc;
      if (matchedMember) {
        finalState = stateWriter.recordTaskCompletion(projectRoot, matchedMember.id, completedTaskId, 'completed');
      }

      const synced = orchestrator.syncTeamQueueFromPdca(projectRoot, stateWriter);
      if (synced.state) {
        finalState = synced.state;
      }

      // 다음 작업 결정 (완료 처리 후 최신 상태 사용)
      const next = coordinator.getNextAssignment(finalState, completedTaskId);
      if (next) {
        hints.push(`[Team] 다음 작업: ${next.nextAgent} → ${next.nextTask}`);
        if (next.nextTaskId) {
          hints.push(`[Team] 다음 작업 ID: ${next.nextTaskId}`);
        }
      }
    }
  } catch { /* team 모듈 로드 실패 시 무시 */ }

  // 7. Loop 상태 확인
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
