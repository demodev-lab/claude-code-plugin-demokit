/**
 * Task Completed Hook
 * Agent 작업 완료 시:
 * 1. context.md에 현재 상태 저장
 * 2. PDCA 자동 진행 및 다음 단계 안내
 * 3. Loop 활성이면 루프 상태 업데이트
 */
const path = require('path');
const core = require(path.join(__dirname, '..', 'lib', 'core'));
const { resolveAgentIdFromHook, resolveWorktreePathFromHook } = require(path.join(__dirname, '..', 'lib', 'team', 'agent-id'));

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
  const hotPathStartMs = Date.now();
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData = {};
  try {
    if (input && input.trim()) hookData = JSON.parse(input);
  } catch { /* ignore */ }

  const projectRoot = core.platform.findProjectRoot(process.cwd());

  if (!projectRoot) {
    console.log(JSON.stringify({}));
    return;
  }

  const shouldRun = core.hookRuntime.shouldRun({
    eventName: 'TaskCompleted',
    scriptKey: 'taskCompleted',
    eventFallback: true,
    scriptFallback: true,
  });
  if (!shouldRun) {
    console.log(JSON.stringify({}));
    return;
  }

  const hints = [];
  let activePdcaFeature = null;

  // 1. context.md 저장 (공통 상태 수집 사용)
  try {
    const { snapshot, writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
    const state = snapshot.collectState(projectRoot, core.cache);
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
    const pdcaStartMs = Date.now();
    const { status: pdcaStatus, phase: pdcaPhase, automation } = require(path.join(__dirname, '..', 'lib', 'pdca'));
    const features = pdcaStatus.listFeatures(projectRoot);
    const activeFeature = features.find(f => f.currentPhase && f.currentPhase !== 'report');

    if (activeFeature) {
      activePdcaFeature = {
        feature: activeFeature.feature,
        currentPhase: activeFeature.currentPhase,
        level: core.cache.get('level') || 'SingleModule',
      };
      const currentPhase = activeFeature.currentPhase;
      const nextPhase = pdcaPhase.getNextPhase(currentPhase);
      const activeFeatureStatus = pdcaStatus.loadStatus(projectRoot, activeFeature.feature);

      // 자동 전환 판단
      const shouldAuto = nextPhase && automation.shouldAutoTransition(projectRoot, activeFeature.feature, currentPhase, activeFeatureStatus);

      if (shouldAuto) {
        // 현재 phase 완료 처리
        const transitionedStatus = pdcaStatus.updatePhaseStatus(projectRoot, activeFeature.feature, currentPhase, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
        // 다음 phase로 전환
        const fullStatus = transitionedStatus || activeFeatureStatus || pdcaStatus.loadStatus(projectRoot, activeFeature.feature);
        if (fullStatus && fullStatus.phases) {
          fullStatus.currentPhase = nextPhase;
          if (!fullStatus.phases[nextPhase]) {
            fullStatus.phases[nextPhase] = {};
          }
          fullStatus.phases[nextPhase].status = 'in-progress';
          fullStatus.phases[nextPhase].startedAt = new Date().toISOString();
          pdcaStatus.saveStatus(projectRoot, activeFeature.feature, fullStatus);
        }

        if (activePdcaFeature) {
          activePdcaFeature.currentPhase = nextPhase;
        }

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

    core.debug.debug('task-completed', 'pdca hook elapsed', {
      durationMs: Date.now() - pdcaStartMs,
      hasActiveFeature: Boolean(activeFeature),
    });
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
  // 기본값 off: 데모/핫패스 성능을 위해 불필요한 추가 계산을 생략
  const emitTeamTransitionHints = core.config.getConfigValue('team.performance.emitTransitionHints', false);
  if (emitTeamTransitionHints && activePdcaFeature) {
    try {
      const { hooks: teamHooks } = require(path.join(__dirname, '..', 'lib', 'team'));
      const result = teamHooks.assignNextTeammateWork(
        activePdcaFeature.currentPhase,
        activePdcaFeature.feature,
        activePdcaFeature.level || 'SingleModule'
      );

      if (result.nextPhase) {
        hints.push(`[Team Hooks] 다음 phase: ${result.nextPhase} (패턴: ${result.team.pattern})`);
        if (result.needsRecompose) {
          hints.push(`[Team Hooks] 팀 재구성 필요`);
        }
      }
    } catch { /* team hooks 실패 시 무시 */ }
  }

  // 6. Team 작업 할당
  try {
    const teamStartMs = Date.now();
    const { stateWriter, coordinator, orchestrator, teamConfig } = require(path.join(__dirname, '..', 'lib', 'team'));
    const cleanupPolicy = teamConfig.getCleanupPolicy ? teamConfig.getCleanupPolicy() : {};
    const teamState = stateWriter.loadTeamState(projectRoot);
    if (teamState.enabled) {
      const taskDesc = hookData.task_description || hookData.tool_name || '';
      const explicitAgentId = extractAgentId(hookData);
      const worktreePath = resolveWorktreePathFromHook(hookData, process.cwd());

      // 완료 기록
      let finalState = teamState;
      const tentativeTaskId = extractCompletedTaskId(hookData) || taskDesc;
      const matchedMember = resolveTaskDoneMember(teamState, explicitAgentId, tentativeTaskId, coordinator);
      const completedTaskId = extractCompletedTaskId(hookData, matchedMember) || taskDesc;
      let syncContext = null;
      if (activePdcaFeature && orchestrator.buildTeamContextForPhase) {
        const teamContext = orchestrator.buildTeamContextForPhase(
          activePdcaFeature.currentPhase,
          activePdcaFeature.feature,
          { level: activePdcaFeature.level || 'SingleModule' }
        );
        if (teamContext) {
          syncContext = {
            feature: activePdcaFeature.feature,
            phase: activePdcaFeature.currentPhase,
            pattern: teamContext.pattern,
            taskQueue: teamContext.taskQueue,
          };
        }
      } else if (orchestrator.buildTeamSyncContext) {
        syncContext = orchestrator.buildTeamSyncContext(projectRoot);
      }

      const completionResult = stateWriter.completeTaskAndSync(projectRoot, {
        memberId: matchedMember ? matchedMember.id : null,
        taskId: completedTaskId,
        result: 'completed',
        staleMemberMs: cleanupPolicy?.staleMemberMs,
        syncContext: syncContext || undefined,
        worktreePath,
      });
      finalState = completionResult.state || finalState;

      core.debug.debug('task-completed', 'team completion path', {
        memberId: matchedMember ? matchedMember.id : null,
        completionApplied: completionResult.completionApplied || false,
        changed: completionResult.changed,
        taskQueueUpdated: completionResult.taskQueueUpdated || false,
        removedMemberIds: completionResult.removedMemberIds || [],
        durationMs: Date.now() - teamStartMs,
      });

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

  // 6.5. Wave 실행 전환
  try {
    const { stateWriter } = require(path.join(__dirname, '..', 'lib', 'team'));
    const { completeWaveTask, finalizeWave, startWave } = require(path.join(__dirname, '..', 'lib', 'team', 'wave-executor'));
    const { extractLayer } = require(path.join(__dirname, '..', 'lib', 'team', 'coordinator'));

    const taskDesc = hookData.task_description || hookData.tool_name || '';
    const completedLayer = extractLayer(taskDesc);

    if (completedLayer) {
      // Phase 1: 원자적 task 완료 (file lock 내부)
      let waveResult = null;
      let completedWaveIndex = null;
      let autoStartWave1 = false;
      stateWriter.updateWaveExecution(projectRoot, (we) => {
        // pending 상태 + wave 0 → 아직 wave 1이 시작되지 않은 초기 상태
        if (we.status === 'pending' && we.currentWave === 0) {
          autoStartWave1 = true;
          return;
        }
        if (we.status !== 'in_progress' || we.currentWave <= 0) return;
        completedWaveIndex = we.currentWave;
        waveResult = completeWaveTask(we, we.currentWave, completedLayer);
      });

      // Wave 1 자동 시작 (pending → in_progress 전환)
      if (autoStartWave1) {
        try {
          const initState = stateWriter.loadTeamState(projectRoot);
          const initWaveExec = initState.waveExecution;
          const w1Status = initWaveExec?.waves?.find(w => w.waveIndex === 1)?.status;
          if (initWaveExec && w1Status !== 'blocked' && w1Status !== 'completed') {
            const wave1Result = startWave(initWaveExec, 1, projectRoot);
            stateWriter.updateWaveExecution(projectRoot, (we) => {
              const w1 = initWaveExec.waves.find(w => w.waveIndex === 1);
              if (w1) {
                const target = we.waves.find(w => w.waveIndex === 1);
                if (target) Object.assign(target, w1);
              }
              if (wave1Result) {
                we.currentWave = 1;
                we.status = 'in_progress';
              }
            });
            if (wave1Result) {
              hints.push(`[Wave] Wave 1 시작: ${wave1Result.tasks.map(t => t.layer).join(', ')}`);
            } else {
              hints.push('[Wave] Wave 1 시작 실패 (worktree 생성 오류)');
            }
          }
        } catch (w1Err) {
          process.stderr.write(`[demokit] wave 1 자동 시작 실패: ${w1Err.message}\n`);
        }
      }

      // Phase 2: git 작업 (lock 밖)
      if (waveResult && waveResult.waveCompleted && completedWaveIndex !== null) {
        try {
          const freshState = stateWriter.loadTeamState(projectRoot);
          const freshWaveExec = freshState.waveExecution;
          if (freshWaveExec) {
            const mergeResult = finalizeWave(freshWaveExec, completedWaveIndex, projectRoot, 'HEAD');
            if (mergeResult) {
              hints.push(`[Wave] Wave ${completedWaveIndex} 완료: ${mergeResult.mergedCount}개 merge, ${mergeResult.conflictCount}개 conflict`);
            }

            if (waveResult.nextWaveIndex) {
              const nextWaveResult = startWave(freshWaveExec, waveResult.nextWaveIndex, projectRoot);
              // Phase 3: git 작업 결과 저장 (startWave 결과만 반영)
              stateWriter.updateWaveExecution(projectRoot, (we) => {
                const nextWave = freshWaveExec.waves.find(w => w.waveIndex === waveResult.nextWaveIndex);
                if (nextWave) {
                  const target = we.waves.find(w => w.waveIndex === waveResult.nextWaveIndex);
                  if (target) Object.assign(target, nextWave);
                }
                if (nextWaveResult) {
                  we.currentWave = waveResult.nextWaveIndex;
                  we.status = 'in_progress';
                }
              });
              if (nextWaveResult) {
                hints.push(`[Wave] Wave ${waveResult.nextWaveIndex} 시작: ${nextWaveResult.tasks.map(t => t.layer).join(', ')}`);
              } else {
                hints.push(`[Wave] Wave ${waveResult.nextWaveIndex} 시작 실패 (worktree 생성 오류)`);
              }
            }
          }
        } catch (waveErr) {
          process.stderr.write(`[demokit] wave git 작업 실패: ${waveErr.message}\n`);
        }
      }

      if (waveResult && waveResult.allWavesCompleted) {
        hints.push('[Wave] 모든 Wave 완료');
      }
    }
  } catch { /* wave 모듈 로드 실패 시 무시 */ }

  core.debug.debug('task-completed', 'task-completed hook elapsed', {
    durationMs: Date.now() - hotPathStartMs,
    projectRoot,
  });

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
