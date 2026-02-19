#!/usr/bin/env node
/**
 * Pipeline Control CLI
 * /pipeline status|next 상태 전이를 위한 CLI
 *
 * Usage:
 *   node scripts/pipeline-ctl.js start user-management [--reset]
 *   node scripts/pipeline-ctl.js start --feature user-management [--reset]
 *   node scripts/pipeline-ctl.js status
 *   node scripts/pipeline-ctl.js next
 */
const path = require('path');

function getArg(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function parseStartFeature(args) {
  const byOption = getArg(args, '--feature');
  if (byOption) return byOption;

  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];

    if (!token.startsWith('--')) {
      return token;
    }

    if (token === '--feature') {
      i += 1; // skip value
    }
  }

  return null;
}

function printUsage() {
  console.error([
    '사용법: node scripts/pipeline-ctl.js <start|status|next> [options]',
    '  start <feature> [--reset]            파이프라인 시작/초기화',
    '  start --feature <feature> [--reset]  파이프라인 시작/초기화',
    '  status                                현재 파이프라인 상태',
    '  next                                  현재 phase 완료 후 다음 phase 전이',
  ].join('\n'));
}

function formatPhaseLine(phase, isCurrent) {
  const marker = phase.status === 'completed'
    ? '✅'
    : (isCurrent ? '🔄' : '⬜');
  return `${marker} Phase ${phase.id}: ${phase.name} (${phase.agent}) [${phase.status}]`;
}

function main() {
  const { platform } = require(path.join(__dirname, '..', 'lib', 'core'));
  const { state: pipelineState } = require(path.join(__dirname, '..', 'lib', 'pipeline'));

  const projectRoot = platform.findProjectRoot(process.cwd());
  if (!projectRoot) {
    console.error('[demokit] 프로젝트 루트를 찾을 수 없습니다.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'start': {
        const feature = parseStartFeature(args);
        if (!feature) {
          console.error('feature 필수 (예: start user-management 또는 --feature user-management)');
          process.exit(1);
        }

        const reset = hasFlag(args, '--reset');
        const { state, reused } = pipelineState.startPipeline(projectRoot, feature, { reset });
        const summary = pipelineState.summarizeStatus(state);

        console.log(JSON.stringify({
          message: reused
            ? `기존 pipeline 상태를 재사용합니다: ${feature}`
            : `pipeline 시작: ${feature}`,
          summary,
          statusFile: pipelineState.getStatusFile(projectRoot),
        }, null, 2));
        break;
      }

      case 'status': {
        const state = pipelineState.loadStatus(projectRoot);
        if (!state) {
          console.log(JSON.stringify({
            message: 'pipeline 상태가 없습니다. /pipeline {feature}로 시작하세요.',
            statusFile: pipelineState.getStatusFile(projectRoot),
          }, null, 2));
          break;
        }

        const summary = pipelineState.summarizeStatus(state);
        const lines = [
          `[pipeline] feature: ${summary.feature}`,
          `진행률: ${summary.progress.completed}/${summary.progress.total} (${summary.progress.percent}%)`,
          ...(summary.phases || []).map(phase => formatPhaseLine(phase, summary.currentPhase?.id === phase.id)),
        ];

        if (summary.completed) {
          lines.push('🎉 파이프라인 완료 상태입니다.');
        }

        console.log(JSON.stringify({
          message: lines.join('\n'),
          summary,
          statusFile: pipelineState.getStatusFile(projectRoot),
        }, null, 2));
        break;
      }

      case 'next': {
        const result = pipelineState.advancePipeline(projectRoot);
        const summary = pipelineState.summarizeStatus(result.state);

        let message;
        if (result.completed) {
          message = `[pipeline] ${summary.feature}: 마지막 phase(${result.from.name}) 완료. 파이프라인 종료.`;
        } else {
          message = `[pipeline] ${summary.feature}: ${result.from.name} → ${result.to.name} 전이 완료.`;
        }

        console.log(JSON.stringify({
          message,
          advanced: result.advanced,
          completed: result.completed,
          summary,
          statusFile: pipelineState.getStatusFile(projectRoot),
        }, null, 2));
        break;
      }

      default:
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error(`[demokit] pipeline-ctl 오류: ${err.message}`);
    process.exit(1);
  }
}

main();
