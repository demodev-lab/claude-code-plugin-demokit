#!/usr/bin/env node
const { createPhaseStopHandler, runCli } = require('./pipeline-phase-stop-common');

const handler = createPhaseStopHandler({
  phaseId: 7,
  phaseName: 'Performance',
});

module.exports = handler;

if (require.main === module) {
  runCli(handler);
}
