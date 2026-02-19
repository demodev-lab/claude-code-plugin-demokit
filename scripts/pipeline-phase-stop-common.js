#!/usr/bin/env node
/**
 * pipeline-phase-stop-common.js
 * phase별 stop script 공통 유틸
 */
const path = require('path');

const NEGATIVE_SIGNAL_REGEX = /(미완료|미완성|not\s+complete(?:d)?|not\s+done|incomplete|unfinished|pending|todo|to-do|wip|진행\s*중|검토\s*중)/i;
const COMPLETION_SIGNAL_REGEX = /((완료|완성|마무리|끝)|\b(done|complete(?:d)?|finish(?:ed)?|implemented|resolved|fixed)\b)/i;

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

function extractTaskText(hookData) {
  return [
    hookData?.task_description,
    hookData?.tool_input?.task_description,
    hookData?.tool_input?.prompt,
    hookData?.tool_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function isCompletionSignal(taskText) {
  if (!taskText) return false;
  const normalized = String(taskText).trim();
  if (!normalized) return false;

  if (NEGATIVE_SIGNAL_REGEX.test(normalized)) {
    return false;
  }

  return COMPLETION_SIGNAL_REGEX.test(normalized);
}

function getNextPhase(state, currentPhaseId) {
  if (!state || !Array.isArray(state.phases)) return null;
  const idx = state.phases.findIndex(p => Number(p.id) === Number(currentPhaseId));
  if (idx === -1) return null;
  return state.phases[idx + 1] || null;
}

function createPhaseStopHandler({ phaseId, phaseName }) {
  if (!phaseId || !phaseName) {
    throw new Error('phaseId, phaseName are required');
  }

  return async function runPhaseStop(context = {}) {
    const projectRoot = context.projectRoot;
    if (!projectRoot) return {};

    const hookData = context.hookData || {};

    const { state: pipelineStateModule } = require(path.join(__dirname, '..', 'lib', 'pipeline'));
    const state = context.pipelineState || pipelineStateModule.loadStatus(projectRoot);

    if (!state || Number(state.currentPhase) !== Number(phaseId)) {
      return {};
    }

    const taskText = extractTaskText(hookData);
    if (!isCompletionSignal(taskText)) {
      return {};
    }

    const nextPhase = getNextPhase(state, phaseId);
    const summary = pipelineStateModule.summarizeStatus(state);

    const lines = [
      `[Pipeline][Phase ${phaseId}] ${phaseName} 완료 신호 감지`,
      `Feature: ${summary?.feature || state.feature || '(unknown)'}`,
      nextPhase
        ? `다음 단계: /pipeline next  (예상 전이: ${phaseName} → ${nextPhase.name})`
        : '다음 단계: /pipeline status  (마지막 단계일 수 있음)',
    ];

    return {
      systemMessage: lines.join('\n'),
      hookSpecificOutput: {
        hookEventName: 'Stop',
        pipelinePhase: phaseId,
        pipelinePhaseName: phaseName,
        pipelineNextPhase: nextPhase ? { id: nextPhase.id, name: nextPhase.name } : null,
      },
    };
  };
}

async function runCli(handler) {
  const hookData = await readHookDataFromStdin();
  const { platform } = require(path.join(__dirname, '..', 'lib', 'core'));
  const projectRoot = platform.findProjectRoot(process.cwd());

  if (!projectRoot) {
    console.log(JSON.stringify({}));
    return;
  }

  const result = await handler({ projectRoot, hookData });
  console.log(JSON.stringify(result || {}));
}

module.exports = {
  readHookDataFromStdin,
  extractTaskText,
  isCompletionSignal,
  createPhaseStopHandler,
  runCli,
};
