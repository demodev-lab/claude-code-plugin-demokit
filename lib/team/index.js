/**
 * Team 모듈 barrel export
 */
const teamConfig = require('./team-config');
const orchestrator = require('./orchestrator');
const coordinator = require('./coordinator');
const stateWriter = require('./state-writer');

module.exports = {
  teamConfig,
  orchestrator,
  coordinator,
  stateWriter,
};
