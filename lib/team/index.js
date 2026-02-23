/**
 * Team 모듈 barrel export
 */
const teamConfig = require('./team-config');
const orchestrator = require('./orchestrator');
const coordinator = require('./coordinator');
const stateWriter = require('./state-writer');
const agentId = require('./agent-id');
const communication = require('./communication');
const ctoLogic = require('./cto-logic');
const taskQueue = require('./task-queue');
const strategy = require('./strategy');
const levelMapping = require('./level-mapping');
const hooks = require('./hooks');
const worktreeManager = require('./worktree-manager');
const waveExecutor = require('./wave-executor');
const waveDispatcher = require('./wave-dispatcher');

module.exports = {
  teamConfig,
  orchestrator,
  coordinator,
  stateWriter,
  agentId,
  communication,
  ctoLogic,
  taskQueue,
  strategy,
  levelMapping,
  hooks,
  worktreeManager,
  waveExecutor,
  waveDispatcher,
};
