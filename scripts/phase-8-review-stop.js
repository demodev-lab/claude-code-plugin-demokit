#!/usr/bin/env node
const { createPhaseStopHandler, runCli } = require('./pipeline-phase-stop-common');

const handler = createPhaseStopHandler({
  phaseId: 8,
  phaseName: 'Review',
});

module.exports = handler;

if (require.main === module) {
  runCli(handler);
}
