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
const waveMetrics = require('./wave-metrics');
const crossValidator = require('./cross-validator');
const policyLearner = require('./policy-learner');
const layerConstants = require('./layer-constants');
let workPod; try { workPod = require('./work-pod'); } catch { workPod = null; }

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
  waveMetrics,
  crossValidator,
  policyLearner,
  layerConstants,
  workPod,
};
