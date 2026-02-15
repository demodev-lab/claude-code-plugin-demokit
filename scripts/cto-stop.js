/**
 * CTO Agent Stop Script
 * 팀 상태 저장 및 cto_stopped 히스토리 기록
 */
const path = require('path');

async function main(hookData) {
  hookData = hookData || {};
  const hints = [];

  try {
    const { platform } = require(path.join(__dirname, '..', 'lib', 'core'));
    const { stateWriter } = require(path.join(__dirname, '..', 'lib', 'team'));

    const projectRoot = platform.findProjectRoot(process.cwd());
    if (projectRoot) {
      const teamState = stateWriter.loadTeamState(projectRoot);
      if (teamState.enabled) {
        teamState.history = teamState.history || [];
        teamState.history.push({
          event: 'cto_stopped',
          timestamp: new Date().toISOString(),
          activeMembers: teamState.members
            .filter(m => m.status === 'active')
            .map(m => m.id),
        });

        // 히스토리 크기 제한
        if (teamState.history.length > 100) {
          teamState.history = teamState.history.slice(-100);
        }

        stateWriter.saveTeamState(projectRoot, teamState);
        hints.push(`[CTO] 팀 상태 저장 완료`);
      }
    }
  } catch { /* ignore */ }

  return hints;
}

module.exports = { main };
