#!/usr/bin/env node
const { createPhaseStopHandler, runCli } = require('./pipeline-phase-stop-common');

const handler = createPhaseStopHandler({
  phaseId: 5,
  phaseName: 'Integration',
});

module.exports = handler;

if (require.main === module) {
  runCli(handler);
}
