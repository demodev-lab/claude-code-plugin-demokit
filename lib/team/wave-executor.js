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
        const dispatch = buildWaveDispatchInstructions(waveState, currentWave.waveIndex);
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
function createWaveState(wavePlan, featureSlug) {
  return {
    featureSlug,
    currentWave: 0,
    totalWaves: wavePlan.length,
    status: 'pending',
    waves: wavePlan.map(wave => ({
      waveIndex: wave.waveIndex,
      status: 'pending',
      tasks: wave.tasks.map(task => ({
        layer: task.layer,
        branchName: `wave-${wave.waveIndex}/${featureSlug}/${task.layer}`,
        worktreePath: null,
        agentId: null,
        status: 'pending',
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
  if (task && task.status !== 'completed') {
    task.status = 'completed';
  }

  const waveCompleted = wave.tasks.every(t => t.status === 'completed');
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

  // worktree 생성 성공 후 상태 업데이트
  wave.status = 'in_progress';
  for (const wt of worktrees) {
    const task = wave.tasks.find(t => t.layer === wt.layer);
    if (task) {
      task.worktreePath = wt.worktreePath;
      task.branchName = wt.branchName;
      task.status = 'in_progress';
    }
  }

  waveState.currentWave = waveIndex;
  waveState.status = 'in_progress';

  return { waveIndex, worktrees, tasks: wave.tasks };
}

/**
 * Wave 완료 후 merge + cleanup
 */
function finalizeWave(waveState, waveIndex, projectRoot, targetBranch) {
  if (!waveState || !Array.isArray(waveState.waves)) return null;

  const wave = waveState.waves.find(w => w.waveIndex === waveIndex);
  if (!wave || wave.status !== 'completed') return null;

  const worktrees = wave.tasks
    .filter(t => t.worktreePath && t.branchName)
    .map(t => ({ layer: t.layer, worktreePath: t.worktreePath, branchName: t.branchName }));

  if (worktrees.length === 0) return null;

  return worktreeManager.mergeAndCleanupWave(projectRoot, worktrees, targetBranch);
}

module.exports = {
  buildWavePlan,
  buildWaveExecutionMarkdown,
  createWaveState,
  completeWaveTask,
  startWave,
  finalizeWave,
};
