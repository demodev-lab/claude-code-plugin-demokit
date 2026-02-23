const { buildPrdSection, buildDesignSection, buildTasksSection, buildTasksYaml, serializeYaml, buildSuperworkBlueprint } = require('../../lib/superwork');

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
    expect(prd).toContain('- api');
    expect(prd).toContain('- entity');
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

  it('수락 기준 포함', () => {
    const prd = buildPrdSection({
      requestText: '인증 API',
      featureSlug: 'auth-api',
      size: { label: 'Feature', size: 'feature' },
      signals: { api: true, entity: false, security: true, exception: false, infra: false, qa: false },
    });
    expect(prd).toContain('## 수락 기준');
    expect(prd).toContain('모든 Do 단계 task 완료');
    expect(prd).toContain('보안 검증 통과');
    expect(prd).toContain('API 스펙 문서화');
  });

  it('security signal 없으면 보안 검증 미포함', () => {
    const prd = buildPrdSection({
      requestText: '작업',
      featureSlug: 'slug',
      size: { label: 'Quick Fix', size: 'quickFix' },
      signals: { api: false, entity: false, security: false },
    });
    expect(prd).toContain('## 수락 기준');
    expect(prd).not.toContain('보안 검증');
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

  it('designPhase에 tasks 없어도 crash하지 않음', () => {
    const phases = [{ id: 'design', title: 'Design', goal: '설계' }];
    const design = buildDesignSection({ phases });
    expect(design).toContain('# DESIGN');
    expect(design).toContain('설계');
    expect(design).not.toContain('### 설계 항목');
  });

  it('Layer 의존관계 다이어그램 포함', () => {
    const phases = [
      {
        id: 'design', title: 'Design', goal: '설계',
        tasks: [{ title: '설계', layer: 'entity' }],
      },
      {
        id: 'do',
        tasks: [
          { title: 'Entity', layer: 'entity' },
          { title: 'Service', layer: 'service' },
          { title: 'Controller', layer: 'controller' },
        ],
      },
    ];
    const design = buildDesignSection({ phases });
    expect(design).toContain('### Layer 의존관계');
    expect(design).toContain('→');
    expect(design).toContain('entity (독립)');
    expect(design).toContain('entity → service');
  });

  it('doPhase에 tasks 없어도 crash하지 않음', () => {
    const phases = [
      { id: 'design', title: 'Design', goal: '설계', tasks: [] },
      { id: 'do' },
    ];
    const design = buildDesignSection({ phases });
    expect(design).toContain('# DESIGN');
    expect(design).not.toContain('Layer 의존관계');
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
    expect(tasks).toContain('(depends: entity, repository, dto)');
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

describe('buildTasksYaml', () => {
  it('기본 DAG 생성 — tasks에 id/layer/dependsOn/wave 포함', () => {
    const phases = [{
      id: 'do',
      tasks: [
        { title: 'Entity + Repository 구현', layer: 'entity', owner: null },
        { title: 'Service 핵심 로직', layer: 'service', owner: null },
        { title: 'Controller', layer: 'controller', owner: null },
      ],
      parallelGroups: [
        [{ layer: 'entity' }],
        [{ layer: 'service' }],
        [{ layer: 'controller' }],
      ],
    }];
    const result = buildTasksYaml({ phases, featureSlug: 'test-feat' });
    expect(result.version).toBe('1.0');
    expect(result.feature).toBe('test-feat');
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].id).toBe('entity-1');
    expect(result.tasks[0].layer).toBe('entity');
    expect(result.tasks[0].dependsOn).toEqual([]);
    expect(result.tasks[1].id).toBe('service-2');
    expect(result.tasks[1].wave).toBe(2);
    expect(result.waves).toHaveLength(3);
    expect(result.waves[0].layers).toContain('entity');
  });

  it('빈 phase 방어 — tasks/waves 빈 배열 반환', () => {
    const result = buildTasksYaml({ phases: [], featureSlug: 'empty' });
    expect(result.tasks).toEqual([]);
    expect(result.waves).toEqual([]);
  });

  it('do phase에 tasks 없으면 빈 배열 반환', () => {
    const phases = [{ id: 'do', tasks: [] }];
    const result = buildTasksYaml({ phases, featureSlug: 'no-tasks' });
    expect(result.tasks).toEqual([]);
    expect(result.waves).toEqual([]);
  });

  it('dependsOn 정확성 — service가 entity에 의존', () => {
    const phases = [{
      id: 'do',
      tasks: [
        { title: 'Entity', layer: 'entity', owner: null },
        { title: 'Repo', layer: 'repository', owner: null },
        { title: 'Service', layer: 'service', owner: null },
      ],
      parallelGroups: [
        [{ layer: 'entity' }],
        [{ layer: 'repository' }],
        [{ layer: 'service' }],
      ],
    }];
    const result = buildTasksYaml({ phases, featureSlug: 'dep-test' });
    const serviceTask = result.tasks.find(t => t.layer === 'service');
    expect(serviceTask.dependsOn).toContain('entity-1');
    expect(serviceTask.dependsOn).toContain('repository-2');
    const repoTask = result.tasks.find(t => t.layer === 'repository');
    expect(repoTask.dependsOn).toContain('entity-1');
  });

  it('뒤에 오는 task에도 의존 — controller가 exception에 의존', () => {
    const phases = [{
      id: 'do',
      tasks: [
        { title: 'Service', layer: 'service', owner: null },
        { title: 'DTO', layer: 'dto', owner: null },
        { title: 'Controller', layer: 'controller', owner: null },
        { title: 'Exception', layer: 'exception', owner: null },
      ],
      parallelGroups: [],
    }];
    const result = buildTasksYaml({ phases, featureSlug: 'order-test' });
    const ctrlTask = result.tasks.find(t => t.layer === 'controller');
    expect(ctrlTask.dependsOn).toContain('service-1');
    expect(ctrlTask.dependsOn).toContain('dto-2');
    expect(ctrlTask.dependsOn).toContain('exception-4');
  });

  it('entity task에 ownFiles 패턴 존재', () => {
    const phases = [{
      id: 'do',
      tasks: [
        { title: 'Entity', layer: 'entity', owner: null },
        { title: 'Service', layer: 'service', owner: null },
      ],
      parallelGroups: [],
    }];
    const result = buildTasksYaml({ phases, featureSlug: 'own-test' });
    const entityTask = result.tasks.find(t => t.layer === 'entity');
    expect(entityTask.ownFiles).toBeDefined();
    expect(entityTask.ownFiles).toContain('src/**/entity/**');
  });

  it('unknown layer task에 ownFiles 미포함', () => {
    const phases = [{
      id: 'do',
      tasks: [{ title: 'Custom', layer: 'unknown', owner: null }],
      parallelGroups: [],
    }];
    const result = buildTasksYaml({ phases, featureSlug: 'no-own' });
    expect(result.tasks[0].ownFiles).toBeUndefined();
  });

  it('자기 자신을 dependsOn에 포함하지 않음', () => {
    const phases = [{
      id: 'do',
      tasks: [
        { title: 'Entity', layer: 'entity', owner: null },
        { title: 'Test', layer: 'test', owner: null },
      ],
      parallelGroups: [],
    }];
    const result = buildTasksYaml({ phases, featureSlug: 'self-ref' });
    const testTask = result.tasks.find(t => t.layer === 'test');
    expect(testTask.dependsOn).toContain('entity-1');
    expect(testTask.dependsOn).not.toContain('test-2');
  });
});

describe('serializeYaml', () => {
  it('YAML 문자열 출력 — version, dependsOn 포함', () => {
    const obj = {
      version: '1.0',
      feature: 'test',
      tasks: [{
        id: 'entity-1',
        title: 'Entity',
        layer: 'entity',
        owner: null,
        wave: 1,
        dependsOn: [],
      }, {
        id: 'service-2',
        title: 'Service',
        layer: 'service',
        owner: null,
        wave: 2,
        dependsOn: ['entity-1'],
      }],
      waves: [{ index: 1, layers: ['entity'] }, { index: 2, layers: ['service'] }],
    };
    const yaml = serializeYaml(obj);
    expect(yaml).toContain('version: "1.0"');
    expect(yaml).toContain('feature: "test"');
    expect(yaml).toContain('dependsOn: []');
    expect(yaml).toContain('dependsOn:');
    expect(yaml).toContain('- "entity-1"');
    expect(yaml).toContain('waves:');
    expect(yaml).toContain('- entity');
    expect(yaml.endsWith('\n')).toBe(true);
  });

  it('빈 tasks/waves — tasks: [] / waves: [] 출력', () => {
    const obj = { version: '1.0', feature: 'empty', tasks: [], waves: [] };
    const yaml = serializeYaml(obj);
    expect(yaml).toContain('tasks: []');
    expect(yaml).toContain('waves: []');
    expect(yaml).not.toMatch(/^tasks:\n/m);
  });

  it('title에 쌍따옴표 포함 시 이스케이프', () => {
    const obj = {
      version: '1.0',
      feature: 'quote-test',
      tasks: [{
        id: 'entity-1',
        title: 'Entity "모델" 구현',
        layer: 'entity',
        owner: null,
        wave: 1,
        dependsOn: [],
      }],
      waves: [{ index: 1, layers: ['entity'] }],
    };
    const yaml = serializeYaml(obj);
    expect(yaml).toContain('title: "Entity \\"모델\\" 구현"');
    expect(yaml).not.toContain('title: "Entity "모델" 구현"');
  });

  it('ownFiles 직렬화 출력 확인', () => {
    const obj = {
      version: '1.0',
      feature: 'test',
      tasks: [{
        id: 'entity-1',
        title: 'Entity',
        layer: 'entity',
        owner: null,
        wave: 1,
        dependsOn: [],
        ownFiles: ['src/**/entity/**', 'src/**/domain/**'],
      }],
      waves: [{ index: 1, layers: ['entity'] }],
    };
    const yaml = serializeYaml(obj);
    expect(yaml).toContain('ownFiles:');
    expect(yaml).toContain('- "src/**/entity/**"');
    expect(yaml).toContain('- "src/**/domain/**"');
  });

  it('ownFiles 없는 task는 ownFiles 미출력', () => {
    const obj = {
      version: '1.0',
      feature: 'test',
      tasks: [{
        id: 'custom-1',
        title: 'Custom',
        layer: 'custom',
        owner: null,
        wave: 1,
        dependsOn: [],
      }],
      waves: [{ index: 1, layers: ['custom'] }],
    };
    const yaml = serializeYaml(obj);
    expect(yaml).not.toContain('ownFiles');
  });

  it('wave가 null일 때 null 출력', () => {
    const obj = {
      version: '1.0',
      feature: 'test',
      tasks: [{
        id: 'entity-1',
        title: 'Entity',
        layer: 'entity',
        owner: null,
        wave: null,
        dependsOn: [],
      }],
      waves: [],
    };
    const yaml = serializeYaml(obj);
    expect(yaml).toContain('wave: null');
  });
});

describe('buildSuperworkBlueprint artifacts', () => {
  it('artifacts 필드 존재 (prd, design, tasks, tasksYaml)', () => {
    const result = buildSuperworkBlueprint('/superwork 회원관리 API 구현');
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts.prd).toContain('# PRD');
    expect(result.artifacts.design).toContain('# DESIGN');
    expect(result.artifacts.tasks).toContain('# TASKS');
    expect(result.artifacts.tasksYaml).toBeDefined();
    expect(result.artifacts.tasksYaml).toContain('version:');
    expect(result.artifacts.tasksYaml).toContain('tasks:');
  });

  it('hasRequest false일 때 artifacts 없음', () => {
    const result = buildSuperworkBlueprint('/superwork');
    expect(result.artifacts).toBeUndefined();
  });
});
