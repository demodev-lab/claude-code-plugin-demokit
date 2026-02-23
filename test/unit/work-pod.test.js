const {
  LAYER_POD_MAP,
  POD_LEVEL_PROFILES,
  resolvePodForTask,
  buildPodProtocol,
} = require('../../lib/team/work-pod');
const { LAYER_AGENT_MAP } = require('../../lib/team/wave-dispatcher');

describe('team/work-pod', () => {
  describe('LAYER_POD_MAP', () => {
    const expectedLayers = ['entity', 'dto', 'config', 'exception', 'repository', 'service', 'controller', 'test'];

    it('8개 레이어 키 존재', () => {
      expect(Object.keys(LAYER_POD_MAP)).toEqual(expect.arrayContaining(expectedLayers));
      expect(Object.keys(LAYER_POD_MAP)).toHaveLength(8);
    });

    it('각 pod에 4개 role 존재', () => {
      for (const layer of expectedLayers) {
        const pod = LAYER_POD_MAP[layer];
        expect(pod).toHaveProperty('navigator');
        expect(pod).toHaveProperty('dev');
        expect(pod).toHaveProperty('executor');
        expect(pod).toHaveProperty('qa');
      }
    });

    it('dev role이 LAYER_AGENT_MAP과 일치', () => {
      for (const layer of expectedLayers) {
        expect(LAYER_POD_MAP[layer].dev).toBe(LAYER_AGENT_MAP[layer]);
      }
    });

    it('config.qa = security-expert', () => {
      expect(LAYER_POD_MAP.config.qa).toBe('security-expert');
    });

    it('test.qa = qa-monitor', () => {
      expect(LAYER_POD_MAP.test.qa).toBe('qa-monitor');
    });
  });

  describe('resolvePodForTask', () => {
    it('entity + MultiModule → 4-role pod 반환', () => {
      const pod = resolvePodForTask('entity', 'MultiModule');
      expect(pod).not.toBeNull();
      expect(pod.navigator).toBe('spring-architect');
      expect(pod.dev).toBe('domain-expert');
      expect(pod.executor).toBe('test-expert');
      expect(pod.qa).toBe('code-reviewer');
      expect(pod.activeRoles).toEqual(['navigator', 'dev', 'executor', 'qa']);
    });

    it('config → qa = security-expert', () => {
      const pod = resolvePodForTask('config', 'SingleModule');
      expect(pod.qa).toBe('security-expert');
    });

    it('test + MSA → qa = qa-monitor', () => {
      const pod = resolvePodForTask('test', 'MSA');
      expect(pod.qa).toBe('qa-monitor');
    });

    it('대소문자 무시 (Entity → entity)', () => {
      const pod = resolvePodForTask('Entity', 'MultiModule');
      expect(pod).not.toBeNull();
      expect(pod.dev).toBe('domain-expert');
    });

    it('Starter → null', () => {
      expect(resolvePodForTask('entity', 'Starter')).toBeNull();
    });

    it('null layer → null', () => {
      expect(resolvePodForTask(null, 'MultiModule')).toBeNull();
    });

    it('null level → null', () => {
      expect(resolvePodForTask('entity', null)).toBeNull();
    });

    it('unknown layer → null', () => {
      expect(resolvePodForTask('unknown', 'MultiModule')).toBeNull();
    });

    it('unknown level → null', () => {
      expect(resolvePodForTask('entity', 'UnknownLevel')).toBeNull();
    });

    it('activeRoles 방어적 복사 검증', () => {
      const pod1 = resolvePodForTask('entity', 'MultiModule');
      const pod2 = resolvePodForTask('entity', 'MultiModule');
      pod1.activeRoles.push('extra');
      expect(pod2.activeRoles).toHaveLength(4);
    });
  });

  describe('buildPodProtocol', () => {
    it('entity + MultiModule → 프로토콜 마크다운 (4 steps)', () => {
      const md = buildPodProtocol('entity', 'MultiModule');
      expect(md).toContain('Work Pod Protocol');
      expect(md).toContain('Step 1');
      expect(md).toContain('Step 2');
      expect(md).toContain('Step 3');
      expect(md).toContain('Step 4');
      expect(md).toContain('spring-architect');
      expect(md).toContain('domain-expert');
      expect(md).toContain('test-expert');
      expect(md).toContain('code-reviewer');
    });

    it('Starter → null', () => {
      expect(buildPodProtocol('entity', 'Starter')).toBeNull();
    });

    it('null layer → null', () => {
      expect(buildPodProtocol(null, 'MultiModule')).toBeNull();
    });

    it('verifyCmd 있으면 Executor step에 포함', () => {
      const md = buildPodProtocol('entity', 'MultiModule', { verifyCmd: './gradlew test' });
      expect(md).toContain('./gradlew test');
      expect(md).toContain('Step 3');
    });

    it('verifyCmd 없으면 수동 검증 안내', () => {
      const md = buildPodProtocol('entity', 'MultiModule');
      expect(md).toContain('수동 검증');
    });

    it('마크다운 테이블 형식 포함', () => {
      const md = buildPodProtocol('entity', 'MultiModule');
      expect(md).toContain('| Role | Agent | Step |');
      expect(md).toContain('|------|-------|------|');
    });

    it('config layer → qa에 security-expert 표시', () => {
      const md = buildPodProtocol('config', 'Monolith');
      expect(md).toContain('security-expert');
    });

    it('test layer → qa에 qa-monitor 표시', () => {
      const md = buildPodProtocol('test', 'MSA');
      expect(md).toContain('qa-monitor');
    });
  });
});
