/**
 * Team Communication Module
 * teammate 메시지 구조 및 라우팅 로직
 */
const { debug: log } = require('../core');

const MESSAGE_TYPES = [
  'task_assignment',
  'review_request',
  'approval',
  'rejection',
  'phase_transition',
  'status_update',
  'directive',
  'info',
];

/**
 * 메시지 생성
 * @param {string} fromRole - 발신 역할
 * @param {string} toRole - 수신 역할
 * @param {string} messageType - 메시지 타입
 * @param {Object} payload - { subject, body, feature?, phase?, references? }
 * @returns {Object|null}
 */
function createMessage(fromRole, toRole, messageType, payload) {
  if (!MESSAGE_TYPES.includes(messageType)) {
    log.debug('communication', `invalid message type: ${messageType}`);
    return null;
  }

  const safePayload = payload || {};

  return {
    from: fromRole,
    to: toRole,
    type: messageType,
    payload: {
      subject: safePayload.subject || '',
      body: safePayload.body || '',
      feature: safePayload.feature || null,
      phase: safePayload.phase || null,
      references: safePayload.references || [],
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 브로드캐스트 메시지 생성
 */
function createBroadcast(fromRole, messageType, payload) {
  return createMessage(fromRole, 'all', messageType, payload);
}

/**
 * PDCA phase 전환 알림 생성
 */
function createPhaseTransitionNotice(feature, fromPhase, toPhase, context = {}) {
  const payload = {
    subject: `Phase Transition: ${fromPhase} → ${toPhase}`,
    body: `Feature "${feature}" is moving from ${fromPhase} to ${toPhase} phase.`,
    feature,
    phase: toPhase,
  };

  if (context.matchRate != null) {
    payload.body += ` Current match rate: ${context.matchRate}%.`;
  }
  if (context.issues) {
    payload.body += ` Open issues: ${context.issues}.`;
  }

  return createBroadcast('cto', 'phase_transition', payload);
}

/**
 * Plan 승인/거절 메시지 생성
 */
function createPlanDecision(teammateRole, approved, feedback) {
  const messageType = approved ? 'approval' : 'rejection';
  const payload = {
    subject: approved ? 'Plan Approved' : 'Plan Rejected',
    body: feedback || (approved
      ? 'Your plan has been approved. Proceed with execution.'
      : 'Please revise your plan based on the feedback.'),
  };

  return createMessage('cto', teammateRole, messageType, payload);
}

/**
 * CTO 지시 메시지 생성
 */
function createDirective(toRole, directive, context = {}) {
  const payload = {
    subject: 'CTO Directive',
    body: directive,
    feature: context.feature || null,
    phase: context.phase || null,
    references: context.references || [],
  };

  return createMessage('cto', toRole, 'directive', payload);
}

module.exports = {
  MESSAGE_TYPES,
  createMessage,
  createBroadcast,
  createPhaseTransitionNotice,
  createPlanDecision,
  createDirective,
};
