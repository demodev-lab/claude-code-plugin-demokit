const {
  PHASE_ICONS, PHASE_ORDER,
  generatePdcaTaskSubject, generatePdcaTaskDescription,
  getPdcaTaskMetadata, generateTaskGuidance,
  createPdcaTaskChain, autoCreatePdcaTask,
} = require('../../lib/task/creator');

describe('Task Creator', () => {
  describe('generatePdcaTaskSubject', () => {
    it('plan phase icon 포함', () => {
      const subject = generatePdcaTaskSubject('plan', 'auth');
      expect(subject).toContain(PHASE_ICONS.plan);
      expect(subject).toContain('[Plan]');
      expect(subject).toContain('auth');
    });

    it('do phase icon 포함', () => {
      const subject = generatePdcaTaskSubject('do', 'user-mgmt');
      expect(subject).toContain(PHASE_ICONS.do);
      expect(subject).toContain('[Do]');
      expect(subject).toContain('user-mgmt');
    });

    it('모든 phase에 대해 subject 생성', () => {
      for (const phase of PHASE_ORDER) {
        const subject = generatePdcaTaskSubject(phase, 'test-feature');
        expect(subject.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generatePdcaTaskDescription', () => {
    it('feature, phase 포함', () => {
      const desc = generatePdcaTaskDescription('plan', 'auth');
      expect(desc).toContain('auth');
      expect(desc).toContain('Plan');
    });

    it('docPath 포함', () => {
      const desc = generatePdcaTaskDescription('design', 'auth', '.pdca/auth/design.md');
      expect(desc).toContain('.pdca/auth/design.md');
    });
  });

  describe('getPdcaTaskMetadata', () => {
    it('기본 메타데이터 생성', () => {
      const meta = getPdcaTaskMetadata('plan', 'auth');
      expect(meta.pdcaPhase).toBe('plan');
      expect(meta.pdcaOrder).toBe(0);
      expect(meta.feature).toBe('auth');
      expect(meta.level).toBe('SingleModule');
      expect(meta.createdAt).toBeDefined();
    });

    it('options.level 반영', () => {
      const meta = getPdcaTaskMetadata('do', 'auth', { level: 'MSA' });
      expect(meta.level).toBe('MSA');
    });

    it('phase order 정확성', () => {
      expect(getPdcaTaskMetadata('plan', 'x').pdcaOrder).toBe(0);
      expect(getPdcaTaskMetadata('design', 'x').pdcaOrder).toBe(1);
      expect(getPdcaTaskMetadata('do', 'x').pdcaOrder).toBe(2);
      expect(getPdcaTaskMetadata('analyze', 'x').pdcaOrder).toBe(3);
      expect(getPdcaTaskMetadata('iterate', 'x').pdcaOrder).toBe(4);
      expect(getPdcaTaskMetadata('report', 'x').pdcaOrder).toBe(5);
    });
  });

  describe('generateTaskGuidance', () => {
    it('선행 phase 조건 표시', () => {
      const guidance = generateTaskGuidance('design', 'auth', 'plan');
      expect(guidance).toContain('Plan');
      expect(guidance).toContain('선행 조건');
    });

    it('선행 없으면 가이드만 표시', () => {
      const guidance = generateTaskGuidance('plan', 'auth');
      expect(guidance).toContain('요구사항');
      expect(guidance).not.toContain('선행 조건');
    });
  });

  describe('createPdcaTaskChain', () => {
    it('6개 phase 전체 chain 생성', () => {
      const chain = createPdcaTaskChain('auth');
      expect(chain.feature).toBe('auth');
      expect(chain.phases).toHaveLength(6);
      expect(Object.keys(chain.tasks)).toHaveLength(6);
      expect(chain.createdAt).toBeDefined();
    });

    it('각 task에 id, subject, description, metadata, status 포함', () => {
      const chain = createPdcaTaskChain('auth');
      for (const phase of PHASE_ORDER) {
        const task = chain.tasks[phase];
        expect(task.id).toBe(`auth-${phase}`);
        expect(task.subject).toBeDefined();
        expect(task.description).toBeDefined();
        expect(task.metadata).toBeDefined();
        expect(task.status).toBe('pending');
      }
    });

    it('blockedBy 설정 (design은 plan에 의존)', () => {
      const chain = createPdcaTaskChain('auth');
      expect(chain.tasks.plan.blockedBy).toEqual([]);
      expect(chain.tasks.design.blockedBy).toEqual(['auth-plan']);
      expect(chain.tasks.do.blockedBy).toEqual(['auth-design']);
      expect(chain.tasks.analyze.blockedBy).toEqual(['auth-do']);
      expect(chain.tasks.iterate.blockedBy).toEqual(['auth-analyze']);
      expect(chain.tasks.report.blockedBy).toEqual(['auth-iterate']);
    });

    it('options 전달', () => {
      const chain = createPdcaTaskChain('auth', { level: 'MSA' });
      expect(chain.tasks.plan.metadata.level).toBe('MSA');
    });
  });

  describe('autoCreatePdcaTask', () => {
    it('단일 task 생성', () => {
      const task = autoCreatePdcaTask('auth', 'plan');
      expect(task.id).toBe('auth-plan');
      expect(task.subject).toContain('Plan');
      expect(task.status).toBe('pending');
      expect(task.blockedBy).toEqual([]);
    });

    it('design task에 blockedBy 포함', () => {
      const task = autoCreatePdcaTask('auth', 'design');
      expect(task.blockedBy).toEqual(['auth-plan']);
    });
  });
});
