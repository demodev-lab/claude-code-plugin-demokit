#!/usr/bin/env node
/**
 * pipeline-phase-stop.js
 * Stop 이벤트에서 현재 pipeline phase에 해당하는 전용 스크립트를 라우팅한다.
 */
const path = require('path');

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

async function readHookDataFromStdin() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  if (!input || !input.trim()) return {};

  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

async function main() {
  const hookData = await readHookDataFromStdin();
  const { platform } = require(path.join(__dirname, '..', 'lib', 'core'));
  const { state: pipelineStateModule } = require(path.join(__dirname, '..', 'lib', 'pipeline'));

  const projectRoot = platform.findProjectRoot(process.cwd());
  if (!projectRoot) {
    console.log(JSON.stringify({}));
    return;
  }

  const pipelineState = pipelineStateModule.loadStatus(projectRoot);
  if (!pipelineState || !pipelineState.currentPhase) {
    console.log(JSON.stringify({}));
    return;
  }

  const phaseId = Number(pipelineState.currentPhase);
  const scriptRelPath = PHASE_SCRIPT_MAP[phaseId];
  if (!scriptRelPath) {
    console.log(JSON.stringify({}));
    return;
  }

  const handler = require(path.join(__dirname, scriptRelPath));
  if (typeof handler !== 'function') {
    console.log(JSON.stringify({}));
    return;
  }

  const result = await handler({
    projectRoot,
    hookData,
    pipelineState,
  });

  console.log(JSON.stringify(result || {}));
}

main().catch((err) => {
  console.error(`[demokit] pipeline-phase-stop error: ${err.message}`);
  console.log(JSON.stringify({}));
});
