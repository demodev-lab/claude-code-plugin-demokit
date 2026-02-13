/**
 * Team 모듈 barrel export
 */
const teamConfig = require('./team-config');
const orchestrator = require('./orchestrator');
const coordinator = require('./coordinator');
const stateWriter = require('./state-writer');
const agentId = require('./agent-id');

module.exports = {
  teamConfig,
  orchestrator,
  coordinator,
  stateWriter,
  agentId,
};
