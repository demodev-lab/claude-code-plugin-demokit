#!/usr/bin/env node
const { createPhaseActivityHandler, printJson, readHookDataFromStdin, resolvePipelineContext } = require('./pipeline-phase-runtime');

const handler = createPhaseActivityHandler({
  phaseId: 7,
  phaseName: 'Performance',
  stage: 'pre',
});

module.exports = handler;

if (require.main === module) {
  (async () => {
    const hookData = await readHookDataFromStdin();
    const context = await resolvePipelineContext('pre', hookData);
    if (!context.enabled || !context.projectRoot || !context.pipelineState) {
      printJson({});
      return;
    }
    const result = await handler(context);
    printJson(result);
  })().catch((err) => {
    console.error(`[demokit] phase-7-performance-pre error: ${err.message}`);
    printJson({});
  });
}
