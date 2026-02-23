const {
  MESSAGE_TYPES, createMessage, createBroadcast,
  createPhaseTransitionNotice,
} = require('../../lib/team/communication');

describe('Team Communication', () => {
  describe('MESSAGE_TYPES', () => {
    it('8개 메시지 타입 정의', () => {
      expect(MESSAGE_TYPES).toHaveLength(8);
      expect(MESSAGE_TYPES).toContain('task_assignment');
      expect(MESSAGE_TYPES).toContain('directive');
    });
  });

  describe('createMessage', () => {
    it('유효한 메시지 생성', () => {
      const msg = createMessage('cto', 'developer', 'task_assignment', {
        subject: 'Test Task',
        body: 'Implement feature X',
      });
      expect(msg).not.toBeNull();
      expect(msg.from).toBe('cto');
      expect(msg.to).toBe('developer');
      expect(msg.type).toBe('task_assignment');
      expect(msg.payload.subject).toBe('Test Task');
      expect(msg.payload.body).toBe('Implement feature X');
      expect(msg.timestamp).toBeDefined();
    });

    it('유효하지 않은 타입 → null', () => {
      const msg = createMessage('cto', 'dev', 'invalid_type', { subject: 'x' });
      expect(msg).toBeNull();
    });

    it('payload 기본값 설정', () => {
      const msg = createMessage('cto', 'dev', 'info', {});
      expect(msg.payload.subject).toBe('');
      expect(msg.payload.body).toBe('');
      expect(msg.payload.feature).toBeNull();
      expect(msg.payload.phase).toBeNull();
      expect(msg.payload.references).toEqual([]);
    });

    it('payload가 null/undefined여도 crash 없이 동작', () => {
      const msg1 = createMessage('cto', 'dev', 'info', null);
      expect(msg1).not.toBeNull();
      expect(msg1.payload.subject).toBe('');

      const msg2 = createMessage('cto', 'dev', 'info', undefined);
      expect(msg2).not.toBeNull();
      expect(msg2.payload.body).toBe('');
    });
  });

  describe('createBroadcast', () => {
    it('to=all 브로드캐스트 메시지', () => {
      const msg = createBroadcast('cto', 'status_update', { subject: 'Update', body: 'Phase changed' });
      expect(msg.to).toBe('all');
      expect(msg.from).toBe('cto');
    });

    it('유효하지 않은 타입 → null', () => {
      const msg = createBroadcast('cto', 'bad_type', { subject: 'x' });
      expect(msg).toBeNull();
    });
  });

  describe('createPhaseTransitionNotice', () => {
    it('phase 전환 알림 생성', () => {
      const msg = createPhaseTransitionNotice('회원관리', 'plan', 'design');
      expect(msg.type).toBe('phase_transition');
      expect(msg.to).toBe('all');
      expect(msg.payload.feature).toBe('회원관리');
      expect(msg.payload.phase).toBe('design');
      expect(msg.payload.body).toContain('plan');
      expect(msg.payload.body).toContain('design');
    });

    it('context에 matchRate/issues 포함', () => {
      const msg = createPhaseTransitionNotice('auth', 'analyze', 'iterate', {
        matchRate: 85,
        issues: 3,
      });
      expect(msg.payload.body).toContain('85%');
      expect(msg.payload.body).toContain('3');
    });
  });

});
