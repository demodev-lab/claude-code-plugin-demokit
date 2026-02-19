#!/usr/bin/env node
const path = require('path');
const runtime = require('./pipeline-phase-runtime');

const PHASE_SCRIPT_MAP = {
  1: './phase-1-schema-pre',
  2: './phase-2-convention-pre',
  3: './phase-3-infra-pre',
  4: './phase-4-feature-pre',
  5: './phase-5-integration-pre',
  6: './phase-6-testing-pre',
  7: './phase-7-performance-pre',
  8: './phase-8-review-pre',
  9: './phase-9-deployment-pre',
};

async function main() {
  const hookData = await runtime.readHookDataFromStdin();
  const context = await runtime.resolvePipelineContext('pre', hookData);

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
  console.error(`[demokit] pipeline-phase-pre error: ${err.message}`);
  runtime.printJson({});
});
