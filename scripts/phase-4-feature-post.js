#!/usr/bin/env node
const { createPhaseActivityHandler, printJson, readHookDataFromStdin, resolvePipelineContext } = require('./pipeline-phase-runtime');

const handler = createPhaseActivityHandler({
  phaseId: 4,
  phaseName: 'Feature',
  stage: 'post',
});

module.exports = handler;

if (require.main === module) {
  (async () => {
    const hookData = await readHookDataFromStdin();
    const context = await resolvePipelineContext('post', hookData);
    if (!context.enabled || !context.projectRoot || !context.pipelineState) {
      printJson({});
      return;
    }
    const result = await handler(context);
    printJson(result);
  })().catch((err) => {
    console.error(`[demokit] phase-4-feature-post error: ${err.message}`);
    printJson({});
  });
}
