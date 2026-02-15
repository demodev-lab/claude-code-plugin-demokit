/**
 * Context Compaction Hook
 * 컨텍스트 압축 전 중요 상태를 보존
 *
 * 1. context.md에 전체 상태 스냅샷 저장 (영구)
 * 2. systemMessage로 핵심 상태 반환 (Claude 메모리)
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

  // 공통 상태 수집
  const { snapshot, writer } = require(path.join(__dirname, '..', 'lib', 'context-store'));
  const state = snapshot.collectState(projectRoot, cache);

  // 추가 상태 수집: Match Rate, Gap, Team
  let matchRateInfo = null;
  let gapList = [];
  let phaseHistory = [];
  let teamState = null;

  try {
    const { status: pdcaStatus, automation } = require(path.join(__dirname, '..', 'lib', 'pdca'));
    const features = pdcaStatus.listFeatures(projectRoot);
    const activeFeature = features.find(f => f.currentPhase && f.currentPhase !== 'report');
    if (activeFeature) {
      const fullStatus = pdcaStatus.loadStatus(projectRoot, activeFeature.feature);
      if (fullStatus?.phases?.analyze?.matchRate) {
        matchRateInfo = fullStatus.phases.analyze.matchRate;
        gapList = automation.identifyGaps(matchRateInfo);
      }
      if (fullStatus?.phaseHistory) {
        phaseHistory = fullStatus.phaseHistory;
      }
    }
  } catch { /* ignore */ }

  try {
    const { stateWriter } = require(path.join(__dirname, '..', 'lib', 'team'));
    teamState = stateWriter.loadTeamState(projectRoot);
  } catch { /* ignore */ }

  const stateLines = ['[demokit] 컨텍스트 보존 상태:'];

  // 프로젝트 정보
  if (state.project || state.gradle) {
    stateLines.push('');
    stateLines.push('## 프로젝트');
    if (state.gradle) {
      stateLines.push(`- Spring Boot: ${state.gradle.springBootVersion || '?'}`);
      stateLines.push(`- Java: ${state.gradle.javaVersion || '?'}`);
    }
    if (state.project) {
      stateLines.push(`- Base Package: ${state.project.basePackage || '?'}`);
    }
    if (state.level) {
      stateLines.push(`- 레벨: ${state.level}`);
    }
  }

  // PDCA 상태
  if (state.pdcaFeatures.length > 0) {
    stateLines.push('');
    stateLines.push('## PDCA');
    state.pdcaFeatures.forEach(f => {
      stateLines.push(`- ${f.feature}: ${f.currentPhase}`);
    });

    // Match Rate 상세
    if (matchRateInfo) {
      stateLines.push('');
      stateLines.push('### Match Rate');
      stateLines.push(`- 종합: ${matchRateInfo.totalRate || 0}%`);
      if (matchRateInfo.details) {
        for (const [key, detail] of Object.entries(matchRateInfo.details)) {
          stateLines.push(`  - ${key}: ${detail.rate || 0}% (${detail.matched || 0}/${detail.total || 0})`);
        }
      }
    }

    // Gap 목록
    if (gapList.length > 0) {
      stateLines.push('');
      stateLines.push('### Gaps');
      gapList.forEach(gap => {
        stateLines.push(`- ${gap.category}: ${gap.rate}% (누락 ${gap.missing}개)`);
      });
    }

    // Phase History
    if (phaseHistory.length > 0) {
      stateLines.push('');
      stateLines.push('### Phase 이력');
      phaseHistory.forEach(h => {
        stateLines.push(`- ${h.phase}: ${h.completedAt || '?'}`);
      });
    }
  }

  // Team 상태
  if (teamState && teamState.enabled) {
    stateLines.push('');
    stateLines.push('## Team');
    stateLines.push(`- 패턴: ${teamState.orchestrationPattern || '?'}`);
    if (teamState.members && teamState.members.length > 0) {
      teamState.members.forEach(m => {
        stateLines.push(`- ${m.id}: ${m.status}${m.currentTask ? ` (${m.currentTask})` : ''}`);
      });
    }
    if (teamState.taskQueue && teamState.taskQueue.length > 0) {
      stateLines.push(`- 대기 작업: ${teamState.taskQueue.length}개`);
    }
  }

  // Loop 상태
  if (state.loopState.active) {
    stateLines.push('');
    stateLines.push('## Loop');
    stateLines.push(`- 반복: ${state.loopState.currentIteration}/${state.loopState.maxIterations}`);
    stateLines.push(`- 프롬프트: ${state.loopState.prompt}`);
    stateLines.push(`- 완료 신호: ${state.loopState.completionPromise}`);
  }

  // 도메인 목록
  if (state.domains.length > 0) {
    stateLines.push('');
    stateLines.push('## 도메인');
    stateLines.push(`- ${state.domains.join(', ')}`);
  }

  // 참조
  stateLines.push('');
  stateLines.push('## 참조');
  stateLines.push('- 이전 작업 이력: .demodev/context.md');
  stateLines.push('- PDCA 스냅샷: .pdca-snapshots/');
  if (state.loopState.active) {
    stateLines.push('- 루프 로그: .demodev/loop-log.md');
  }

  // context.md에 전체 상태 스냅샷 영구 저장
  try {
    writer.saveContext(projectRoot, {
      ...state,
      currentTask: {
        description: '컨텍스트 압축',
        status: 'compacting',
      },
      recentChanges: ['컨텍스트 압축 발생 - 상태 스냅샷 저장'],
    });
  } catch (err) {
    process.stderr.write(`[demokit] context.md 저장 실패: ${err.message}\n`);
  }

  // feature별 스냅샷 저장
  try {
    const fs = require('fs');
    const snapshotDir = path.join(projectRoot, '.pdca-snapshots');
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    if (state.pdcaFeatures.length > 0) {
      const activeFeature = state.pdcaFeatures.find(f => f.currentPhase && f.currentPhase !== 'report');
      if (activeFeature) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const snapshotPath = path.join(snapshotDir, `${activeFeature.feature}-${timestamp}.json`);
        const snapshotData = {
          feature: activeFeature.feature,
          currentPhase: activeFeature.currentPhase,
          matchRate: matchRateInfo,
          gaps: gapList,
          phaseHistory,
          teamState: teamState ? { enabled: teamState.enabled, members: teamState.members, taskQueue: teamState.taskQueue } : null,
          timestamp: new Date().toISOString(),
        };
        fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');

        // 최근 10개만 유지
        const files = fs.readdirSync(snapshotDir)
          .filter(f => f.startsWith(activeFeature.feature) && f.endsWith('.json'))
          .sort()
          .reverse();
        if (files.length > 10) {
          files.slice(10).forEach(f => {
            try { fs.unlinkSync(path.join(snapshotDir, f)); } catch { /* ignore */ }
          });
        }
      }
    }
  } catch (err) {
    process.stderr.write(`[demokit] 스냅샷 저장 실패: ${err.message}\n`);
  }

  console.log(JSON.stringify({
    systemMessage: stateLines.join('\n'),
  }));
}

main().catch(err => {
  console.error(`[demokit] context-compaction 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
