#!/usr/bin/env node
const { createPhaseStopHandler, runCli } = require('./pipeline-phase-stop-common');

const handler = createPhaseStopHandler({
  phaseId: 6,
  phaseName: 'Testing',
});

module.exports = handler;

if (require.main === module) {
  runCli(handler);
}
