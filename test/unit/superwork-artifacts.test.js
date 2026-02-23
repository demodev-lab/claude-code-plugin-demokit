const { buildPrdSection, buildDesignSection, buildTasksSection, buildSuperworkBlueprint } = require('../../lib/superwork');

describe('buildPrdSection', () => {
  it('활성 signals 포함', () => {
    const prd = buildPrdSection({
      requestText: '회원가입 API',
      featureSlug: '회원가입-api',
      size: { label: 'Feature', size: 'feature' },
      signals: { api: true, entity: true, security: false, exception: false, infra: false, qa: false },
    });
    expect(prd).toContain('# PRD');
    expect(prd).toContain('회원가입 API');
    expect(prd).toContain('회원가입-api');
    expect(prd).toContain('api, entity');
    expect(prd).not.toContain('security');
  });

  it('signals 없으면 (없음) 표시', () => {
    const prd = buildPrdSection({
      requestText: '작업',
      featureSlug: 'slug',
      size: { label: 'Quick Fix', size: 'quickFix' },
      signals: { api: false, entity: false },
    });
    expect(prd).toContain('(없음)');
  });
});

describe('buildDesignSection', () => {
  it('design phase tasks 포함', () => {
    const phases = [
      { id: 'plan', title: 'Plan', goal: '목표', tasks: [] },
      {
        id: 'design', title: 'Design', goal: '설계 고정',
        tasks: [
          { title: 'ERD 라벨링', layer: 'entity' },
          { title: 'API 스펙', layer: 'controller' },
        ],
      },
    ];
    const design = buildDesignSection({ phases });
    expect(design).toContain('# DESIGN');
    expect(design).toContain('ERD 라벨링');
    expect(design).toContain('API 스펙');
    expect(design).toContain('설계 고정');
  });

  it('design phase 없으면 헤더만', () => {
    const design = buildDesignSection({ phases: [{ id: 'plan' }] });
    expect(design).toBe('# DESIGN');
  });
});

describe('buildTasksSection', () => {
  it('do phase tasks + 의존성 표시', () => {
    const phases = [{
      id: 'do',
      tasks: [
        { title: 'Entity', layer: 'entity' },
        { title: 'Service', layer: 'service' },
        { title: 'Controller', layer: 'controller' },
      ],
      parallelGroups: [
        [{ layer: 'entity' }],
        [{ layer: 'service' }],
        [{ layer: 'controller' }],
      ],
    }];
    const tasks = buildTasksSection({ phases, featureSlug: 'feat' });
    expect(tasks).toContain('# TASKS');
    expect(tasks).toContain('[entity]');
    expect(tasks).toContain('[service]');
    expect(tasks).toContain('(depends: entity, repository)');
    expect(tasks).toContain('## 병렬 그룹');
    expect(tasks).toContain('Wave 1');
  });

  it('parallelGroups 1개면 병렬 그룹 미표시', () => {
    const phases = [{
      id: 'do',
      tasks: [{ title: 'Entity', layer: 'entity' }],
      parallelGroups: [[{ layer: 'entity' }]],
    }];
    const tasks = buildTasksSection({ phases, featureSlug: 'feat' });
    expect(tasks).not.toContain('## 병렬 그룹');
  });
});

describe('buildSuperworkBlueprint artifacts', () => {
  it('artifacts 필드 존재 (prd, design, tasks)', () => {
    const result = buildSuperworkBlueprint('/superwork 회원관리 API 구현');
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts.prd).toContain('# PRD');
    expect(result.artifacts.design).toContain('# DESIGN');
    expect(result.artifacts.tasks).toContain('# TASKS');
  });

  it('hasRequest false일 때 artifacts 없음', () => {
    const result = buildSuperworkBlueprint('/superwork');
    expect(result.artifacts).toBeUndefined();
  });
});
