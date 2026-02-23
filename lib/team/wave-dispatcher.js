/**
 * Wave Dispatcher
 * Wave task별 dispatch 지시 마크다운 생성
 */

const LAYER_AGENT_MAP = {
  entity: 'domain-expert',
  dto: 'report-generator',
  config: 'spring-architect',
  exception: 'security-expert',
  repository: 'dba-expert',
  service: 'service-expert',
  controller: 'api-expert',
  test: 'test-expert',
};

/**
 * layer → agent 역매핑
 * @returns {string|null}
 */
function resolveAgentForLayer(layer) {
  if (!layer || typeof layer !== 'string') return null;
  return LAYER_AGENT_MAP[layer.toLowerCase()] || null;
}

/**
 * wave의 in_progress task들에 대해 dispatch 지시 마크다운 생성
 * @returns {string} dispatch 마크다운 (없으면 빈 문자열)
 */
function buildWaveDispatchInstructions(waveState, waveIndex) {
  if (!waveState || !Array.isArray(waveState.waves)) return '';

  const wave = waveState.waves.find(w => w.waveIndex === waveIndex);
  if (!wave || wave.status !== 'in_progress') return '';
  if (!Array.isArray(wave.tasks)) return '';

  const activeTasks = wave.tasks.filter(t => t.status === 'in_progress' && t.layer);
  if (activeTasks.length === 0) return '';

  const lines = [];
  lines.push('## Wave Dispatch 지시');
  lines.push(`Wave ${waveIndex}: ${activeTasks.length}개 task를 **병렬로 Task subagent 실행**하세요.`);
  lines.push('');

  for (const task of activeTasks) {
    const agent = resolveAgentForLayer(task.layer) || task.layer;
    lines.push(`### ${task.layer}`);
    lines.push(`- **agent**: \`${agent}\``);
    if (task.worktreePath) {
      lines.push(`- **worktree**: \`${task.worktreePath}\``);
    }
    if (task.branchName) {
      lines.push(`- **branch**: \`${task.branchName}\``);
    }
    lines.push(`- **지시**: \`${task.layer}\` 레이어 구현을 해당 worktree에서 수행`);
    lines.push('');
  }

  lines.push('> 위 task들을 각각 독립된 Task subagent로 **동시에** 실행하세요. 각 subagent는 지정된 worktree 경로에서 작업합니다.');

  return lines.join('\n');
}

module.exports = {
  LAYER_AGENT_MAP,
  resolveAgentForLayer,
  buildWaveDispatchInstructions,
};
