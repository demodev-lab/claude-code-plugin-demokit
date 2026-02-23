/**
 * Wave Executor
 * Wave 실행 계획 생성 + 상태 관리 + hook 기반 전환 로직
 */
const worktreeManager = require('./worktree-manager');

/**
 * parallelGroups → wavePlan 변환
 */
function buildWavePlan(parallelGroups, featureSlug) {
  if (!Array.isArray(parallelGroups) || parallelGroups.length === 0) return [];

  const waves = parallelGroups
    .filter(group => Array.isArray(group))
    .map((group) => {
      const tasks = group
        .filter(task => task && task.layer)
        .map(task => ({
          layer: task.layer,
          title: task.title || '',
          owner: task.owner || null,
        }));
      return { tasks };
    })
    .filter(w => w.tasks.length > 0);

  return waves.map((w, idx) => ({
    waveIndex: idx + 1,
    layers: w.tasks.map(t => t.layer),
    tasks: w.tasks,
  }));
}

/**
 * Wave 실행 지시 마크다운 생성
 */
function buildWaveExecutionMarkdown(wavePlan, featureSlug, waveState) {
  if (!Array.isArray(wavePlan) || wavePlan.length === 0) return '';

  const lines = [];
  lines.push('## 4) Wave 기반 병렬 실행 계획');
  lines.push(`feature: \`${featureSlug}\` | 총 ${wavePlan.length}개 Wave`);
  lines.push('');

  for (const wave of wavePlan) {
    const layerList = wave.layers.join(', ');
    const waveData = waveState?.waves?.find(w => w.waveIndex === wave.waveIndex);
    const isStarted = waveData?.status === 'in_progress';
    lines.push(`### Wave ${wave.waveIndex}: ${layerList}${isStarted ? ' (started)' : ''}`);
    lines.push(`- 독립 worktree에서 병렬 실행 (${wave.tasks.length}개 작업)`);
    for (const task of wave.tasks) {
      const owner = task.owner ? ` (${task.owner})` : '';
      const waveTask = waveData?.tasks?.find(t => t.layer === task.layer);
      const wtPath = waveTask?.worktreePath;
      lines.push(`  - \`${task.layer}\`: ${task.title}${owner}`);
      if (wtPath) {
        lines.push(`    - worktree: \`${wtPath}\``);
        lines.push(`    - branch: \`${waveTask.branchName}\``);
      }
    }
    if (wave.waveIndex < wavePlan.length) {
      lines.push(`- Wave ${wave.waveIndex} 완료 → merge → Wave ${wave.waveIndex + 1} 시작`);
    } else {
      lines.push(`- Wave ${wave.waveIndex} 완료 → 최종 merge`);
    }
    lines.push('');
  }

  lines.push('```text');
  lines.push('실행 흐름: Wave N 시작 → worktree 생성 → 병렬 실행 → merge → 다음 Wave');
  lines.push('```');

  if (waveState) {
    try {
      const currentWave = waveState.waves?.find(w => w.status === 'in_progress');
      if (currentWave) {
        const { buildWaveDispatchInstructions } = require('./wave-dispatcher');
        let level = null;
        try { level = require('../core').cache.get('level') || null; } catch { /* ignore */ }
        const dispatch = buildWaveDispatchInstructions(waveState, currentWave.waveIndex, { level });
        if (dispatch) {
          lines.push('');
          lines.push(dispatch);
        }
      }
    } catch { /* dispatch 실패해도 기존 마크다운 유지 */ }
  }

  return lines.join('\n');
}

/**
 * Wave 상태 객체 생성
 */
function createWaveState(wavePlan, featureSlug, options = {}) {
  return {
    featureSlug,
    currentWave: 0,
    totalWaves: wavePlan.length,
    status: 'pending',
    complexityScore: options.complexityScore != null ? options.complexityScore : null,
    waves: wavePlan.map(wave => ({
      waveIndex: wave.waveIndex,
      status: 'pending',
      tasks: wave.tasks.map(task => ({
        layer: task.layer,
        branchName: `wave-${wave.waveIndex}/${featureSlug}/${task.layer}`,
        worktreePath: null,
        agentId: null,
        status: 'pending',
        startedAt: null,
        completedAt: null,
      })),
    })),
  };
}

/**
 * Wave 내 개별 task 완료 처리
 * @returns {{ waveCompleted: boolean, allWavesCompleted: boolean, nextWaveIndex: number|null }}
 */
function completeWaveTask(waveState, waveIndex, taskLayer) {
  if (!waveState || !Array.isArray(waveState.waves)) {
    return { waveCompleted: false, allWavesCompleted: false, nextWaveIndex: null };
  }

  const wave = waveState.waves.find(w => w.waveIndex === waveIndex);
  if (!wave) {
    return { waveCompleted: false, allWavesCompleted: false, nextWaveIndex: null };
  }

  // 이미 완료된 wave에 대한 중복 호출 방어
  if (wave.status === 'completed') {
    const allDone = waveState.waves.every(w => w.status === 'completed');
    return { waveCompleted: false, allWavesCompleted: allDone, nextWaveIndex: null };
  }

  const task = wave.tasks.find(t => t.layer === taskLayer);
  if (task && task.status !== 'completed' && task.status !== 'failed') {
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
  }

  // completed + failed 모두 "종료 상태"로 취급
  const waveCompleted = wave.tasks.every(t => t.status === 'completed' || t.status === 'failed');
  if (waveCompleted) {
    wave.status = 'completed';
  }

  const allWavesCompleted = waveState.waves.every(w => w.status === 'completed');
  if (allWavesCompleted) {
    waveState.status = 'completed';
  }

  const nextWaveIndex = waveCompleted && !allWavesCompleted
    ? waveIndex + 1
    : null;

  return { waveCompleted, allWavesCompleted, nextWaveIndex };
}

/**
 * Wave 내 개별 task 실패 처리
 * completed와 failed를 모두 "종료 상태"로 취급. wave의 모든 task가 종료 → wave 완료.
 * @returns {{ waveCompleted: boolean, allWavesCompleted: boolean, nextWaveIndex: number|null, failedLayers: string[] }}
 */
function failWaveTask(waveState, waveIndex, taskLayer) {
  if (!waveState || !Array.isArray(waveState.waves)) {
    return { waveCompleted: false, allWavesCompleted: false, nextWaveIndex: null, failedLayers: [] };
  }

  const wave = waveState.waves.find(w => w.waveIndex === waveIndex);
  if (!wave) {
    return { waveCompleted: false, allWavesCompleted: false, nextWaveIndex: null, failedLayers: [] };
  }

  if (wave.status === 'completed') {
    const allDone = waveState.waves.every(w => w.status === 'completed');
    return { waveCompleted: false, allWavesCompleted: allDone, nextWaveIndex: null, failedLayers: [] };
  }

  const task = wave.tasks.find(t => t.layer === taskLayer);
  if (task && task.status !== 'completed' && task.status !== 'failed') {
    task.status = 'failed';
    task.completedAt = new Date().toISOString();
  }

  const failedLayers = wave.tasks.filter(t => t.status === 'failed').map(t => t.layer);
  const waveCompleted = wave.tasks.every(t => t.status === 'completed' || t.status === 'failed');
  if (waveCompleted) {
    wave.status = 'completed';
  }

  const allWavesCompleted = waveState.waves.every(w => w.status === 'completed');
  if (allWavesCompleted) {
    waveState.status = 'completed';
  }

  const nextWaveIndex = waveCompleted && !allWavesCompleted
    ? waveIndex + 1
    : null;

  return { waveCompleted, allWavesCompleted, nextWaveIndex, failedLayers };
}

/**
 * Wave 시작: worktree 일괄 생성 + 상태 업데이트
 */
function startWave(waveState, waveIndex, projectRoot) {
  if (!waveState || !Array.isArray(waveState.waves)) return null;

  const wave = waveState.waves.find(w => w.waveIndex === waveIndex);
  if (!wave || wave.status === 'completed' || wave.status === 'blocked') return null;

  const layerNames = wave.tasks.map(t => t.layer).filter(Boolean);
  if (layerNames.length === 0) {
    wave.status = 'blocked';
    return null;
  }
  let worktrees;
  try {
    worktrees = worktreeManager.createWaveWorktrees(
      projectRoot, waveState.featureSlug, waveIndex, layerNames,
    );
  } catch (err) {
    wave.status = 'blocked';
    return null;
  }

  if (!Array.isArray(worktrees) || worktrees.length === 0) {
    wave.status = 'blocked';
    return null;
  }

  // worktree 생성 성공 후 상태 업데이트
  wave.status = 'in_progress';
  for (const wt of worktrees) {
    const task = wave.tasks.find(t => t.layer === wt.layer);
    if (task) {
      task.worktreePath = wt.worktreePath;
      task.branchName = wt.branchName;
      task.status = 'in_progress';
      task.startedAt = new Date().toISOString();
    }
  }

  waveState.currentWave = waveIndex;
  waveState.status = 'in_progress';

  return { waveIndex, worktrees, tasks: wave.tasks };
}

/**
 * Wave 완료 후 verify 게이트 + merge + cleanup
 */
function finalizeWave(waveState, waveIndex, projectRoot, targetBranch) {
  if (!waveState || !Array.isArray(waveState.waves)) return null;

  const wave = waveState.waves.find(w => w.waveIndex === waveIndex);
  if (!wave || wave.status !== 'completed') return null;

  const worktrees = wave.tasks
    .filter(t => t.worktreePath && t.branchName && t.status !== 'failed')
    .map(t => ({ layer: t.layer, worktreePath: t.worktreePath, branchName: t.branchName }));

  if (worktrees.length === 0) return null;

  // verify 게이트: 각 worktree에서 테스트 실행
  const { detectVerifyCommand } = require('./wave-dispatcher');
  const verifyCmd = detectVerifyCommand(projectRoot);
  const verified = [];
  const failed = [];
  for (const wt of worktrees) {
    const result = worktreeManager.verifyWorktree(wt.worktreePath, verifyCmd);
    if (result.passed) {
      verified.push(wt);
    } else {
      failed.push({ ...wt, verifyOutput: result.output });
      // verify 실패 task를 'failed'로 마킹 (reschedule/hint가 감지할 수 있도록)
      const task = wave.tasks.find(t => t.layer === wt.layer);
      if (task) task.status = 'failed';
    }
  }

  // verify 통과한 worktree만 merge
  const mergeResult = verified.length > 0
    ? worktreeManager.mergeAndCleanupWave(projectRoot, verified, targetBranch)
    : { mergedCount: 0, conflictCount: 0, results: [] };

  return {
    ...mergeResult,
    verifyFailedCount: failed.length,
    verifyFailed: failed.map(f => f.layer),
  };
}

/**
 * 실패한 task를 다음 wave에 이월 (최대 1회 재시도)
 */
function rescheduleFailedTasks(waveState, completedWaveIndex) {
  if (!waveState || !Array.isArray(waveState.waves)) {
    return { rescheduled: [], targetWaveIndex: null };
  }
  const completedWave = waveState.waves.find(w => w.waveIndex === completedWaveIndex);
  if (!completedWave || !Array.isArray(completedWave.tasks)) return { rescheduled: [], targetWaveIndex: null };

  // 이미 retry인 task는 재스케줄 안함 (무한루프 방지)
  const failedTasks = completedWave.tasks.filter(t => t.status === 'failed' && !t.retryOf);
  if (failedTasks.length === 0) return { rescheduled: [], targetWaveIndex: null };

  const nextWaveIndex = completedWaveIndex + 1;
  let targetWave = waveState.waves.find(w => w.waveIndex === nextWaveIndex);
  if (!targetWave) {
    targetWave = { waveIndex: nextWaveIndex, status: 'pending', tasks: [] };
    waveState.waves.push(targetWave);
    waveState.totalWaves = waveState.waves.length;
  }

  const rescheduled = [];
  for (const failed of failedTasks) {
    if (targetWave.tasks.some(t => t.layer === failed.layer)) continue;
    targetWave.tasks.push({
      layer: failed.layer,
      branchName: `wave-${nextWaveIndex}/${waveState.featureSlug}/${failed.layer}`,
      worktreePath: null, agentId: null, status: 'pending',
      startedAt: null, completedAt: null,
      retryOf: completedWaveIndex,
    });
    rescheduled.push(failed.layer);
  }
  return { rescheduled, targetWaveIndex: rescheduled.length > 0 ? nextWaveIndex : null };
}

/**
 * 실패 task에 대한 helper spawn 힌트 생성
 */
function buildHelperSpawnHint(waveState, waveIndex) {
  if (!waveState || !Array.isArray(waveState.waves)) return null;
  const wave = waveState.waves.find(w => w.waveIndex === waveIndex);
  if (!wave || !Array.isArray(wave.tasks)) return null;
  const failedTasks = wave.tasks.filter(t => t.status === 'failed');
  if (failedTasks.length === 0) return null;
  const { LAYER_AGENT_MAP } = require('./wave-dispatcher');
  const suggestions = failedTasks.map(t => `${t.layer} → ${LAYER_AGENT_MAP[t.layer] || t.layer}`);
  return `[Wave] 실패 task 재할당 제안: ${suggestions.join(', ')}`;
}

module.exports = {
  buildWavePlan,
  buildWaveExecutionMarkdown,
  createWaveState,
  completeWaveTask,
  failWaveTask,
  startWave,
  finalizeWave,
  rescheduleFailedTasks,
  buildHelperSpawnHint,
};
