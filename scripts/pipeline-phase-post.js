#!/usr/bin/env node
const path = require('path');
const runtime = require('./pipeline-phase-runtime');

const PHASE_SCRIPT_MAP = {
  1: './phase-1-schema-post',
  2: './phase-2-convention-post',
  3: './phase-3-infra-post',
  4: './phase-4-feature-post',
  5: './phase-5-integration-post',
  6: './phase-6-testing-post',
  7: './phase-7-performance-post',
  8: './phase-8-review-post',
  9: './phase-9-deployment-post',
};

async function main() {
  const hookData = await runtime.readHookDataFromStdin();
  const context = await runtime.resolvePipelineContext('post', hookData);

  if (!context.enabled || !context.projectRoot || !context.pipelineState) {
    runtime.printJson({});
    return;
  }

  const scriptRelPath = PHASE_SCRIPT_MAP[context.phaseId];
  if (!scriptRelPath) {
    runtime.printJson({});
    return;
  }

  const handler = require(path.join(__dirname, scriptRelPath));
  if (typeof handler !== 'function') {
    runtime.printJson({});
    return;
  }

  const result = await handler(context);
  runtime.printJson(result);
}

main().catch((err) => {
  console.error(`[demokit] pipeline-phase-post error: ${err.message}`);
  runtime.printJson({});
});
