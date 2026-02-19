#!/usr/bin/env node
const runtime = require('./pipeline-phase-runtime');
const { extractTaskText, isCompletionSignal } = require('./pipeline-phase-stop-common');

async function main() {
  const hookData = await runtime.readHookDataFromStdin();
  const context = await runtime.resolvePipelineContext('transition', hookData);

  if (!context.enabled || !context.projectRoot || !context.pipelineState) {
    runtime.printJson({});
    return;
  }

  const taskText = extractTaskText(hookData);
  if (!isCompletionSignal(taskText)) {
    runtime.printJson({});
    return;
  }

  const current = context.phaseMeta;
  if (!current) {
    runtime.printJson({});
    return;
  }

  const next = runtime.getNextPhaseMeta(context.pipelineState, context.phaseId);
  const lines = [
    `[Pipeline][Transition] ${current.name} 단계 완료 신호 감지`,
    next
      ? `다음 권장: /pipeline next  (${current.name} → ${next.name})`
      : '다음 권장: /pipeline status  (마지막 단계 가능)',
  ];

  runtime.printJson({
    systemMessage: lines.join('\n'),
    hookSpecificOutput: {
      hookEventName: 'TaskCompleted',
      pipelinePhase: context.phaseId,
      pipelinePhaseName: current.name,
      pipelineTransitionNext: next,
    },
  });
}

main().catch((err) => {
  console.error(`[demokit] pipeline-phase-transition error: ${err.message}`);
  runtime.printJson({});
});
