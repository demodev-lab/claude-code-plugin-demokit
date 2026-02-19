#!/usr/bin/env node
/**
 * pipeline-phase-stop.js
 * Stop 이벤트에서 현재 pipeline phase에 해당하는 전용 스크립트를 라우팅한다.
 */
const path = require('path');
const runtime = require('./pipeline-phase-runtime');

const PHASE_SCRIPT_MAP = {
  1: './phase-1-schema-stop',
  2: './phase-2-convention-stop',
  3: './phase-3-infra-stop',
  4: './phase-4-feature-stop',
  5: './phase-5-integration-stop',
  6: './phase-6-testing-stop',
  7: './phase-7-performance-stop',
  8: './phase-8-review-stop',
  9: './phase-9-deployment-stop',
};

async function main() {
  const hookData = await runtime.readHookDataFromStdin();
  const context = await runtime.resolvePipelineContext('stop', hookData);

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
  console.error(`[demokit] pipeline-phase-stop error: ${err.message}`);
  runtime.printJson({});
});
