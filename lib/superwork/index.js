/**
 * Superwork 엔진
 * /superwork 요청을 받아 자동 분해 템플릿, 병렬 태스크, /pdca 연동 플랜을 생성한다.
 */
const orchestrator = require('../team/orchestrator');
const { classifyBySize } = require('../task/classification');
const { cache } = require('../core');
const { isTeamEnabled: isTeamEnabledInConfig } = require('../team/team-config');
const { buildWavePlan, buildWaveExecutionMarkdown, createWaveState, startWave } = require('../team/wave-executor');
const { initWaveExecution } = require('../team/state-writer');
const { platform } = require('../core');

const PHASES = [
  {
    id: 'plan',
    title: 'Plan',
    goal: '요구사항/범위를 정렬하고 수락 기준을 고정',
  },
  {
    id: 'design',
    title: 'Design',
    goal: 'DB/API/유스케이스/권한 설계까지 산출물을 고정',
  },
  {
    id: 'do',
    title: 'Do',
    goal: '핵심 구현+테스트를 병렬 가능한 단위로 분해',
  },
  {
    id: 'analyze',
    title: 'Analyze',
    goal: '산출물-구현 갭 측정 및 개선 지점 추출',
  },
  {
    id: 'iterate',
    title: 'Iterate',
    goal: 'Gap이 90% 미만이면 반복 보강 루프 실행',
  },
  {
    id: 'report',
    title: 'Report',
    goal: '구현 결과와 성능/품질 지표를 압축 정리',
  },
];

const SIGNAL_PATTERNS = [
  { key: 'api', label: 'api', patterns: [/api|endpoint|rest|컨트롤러|controller|dto|요청|응답/i] },
  { key: 'entity', label: 'entity', patterns: [/엔티티|entity|도메인|table|테이블|schema|테이블/i] },
  { key: 'security', label: 'security', patterns: [/인증|인가|권한|security|jwt|oauth|auth/i] },
  { key: 'exception', label: '예외/에러 처리', patterns: [/예외|error|validation|유효성|error|예외처리/i] },
  { key: 'infra', label: '인프라', patterns: [/캐시|docker|redis|mq|인프라|kafka|mq|database|db/i] },
  { key: 'qa', label: 'QA', patterns: [/테스트|QA|리뷰|검증|테스트|안정화/i] },
];

const BASE_TASKS = {
  plan: [
    { title: '비즈니스 목표 1~2줄로 재정의', layer: 'plan' },
    { title: '수용 기준(AC) + 비기능 조건(성능/보안/운영) 정의', layer: 'plan' },
    { title: '기능 경계 분할(기본/확장 범위)', layer: 'plan' },
  ],
  design: [
    { title: '도메인 모델/ERD 라벨링', layer: 'entity' },
    { title: 'API 엔드포인트/스펙 초안', layer: 'controller' },
    { title: '트랜잭션 경계 및 예외 정책 정의', layer: 'exception' },
  ],
  do: [
    { title: 'Entity + Repository 구현', layer: 'repository' },
    { title: 'Service 핵심 로직 구현', layer: 'service' },
    { title: 'DTO/요청-응답 스펙 및 검증', layer: 'dto' },
    { title: 'Controller/엔드포인트 구현', layer: 'controller' },
    { title: '예외 처리 및 공통 응답 규격 적용', layer: 'exception' },
    { title: '테스트(단위/통합) 초안 작성', layer: 'test' },
  ],
  analyze: [
    { title: 'Plan/Design 산출물 대비 구현 매칭', layer: 'analyze' },
    { title: '누락 API/유효성/권한/예외 케이스 확인', layer: 'analyze' },
    { title: 'Gap 항목 우선순위 재정렬', layer: 'analyze' },
  ],
  iterate: [
    { title: 'Gap 기반 수정 항목 티켓화 및 재작업', layer: 'do' },
    { title: '반복 후 재측정 및 개선률 업데이트', layer: 'analyze' },
  ],
  report: [
    { title: '구현 결과 요약(산출물·리스크·미해결)', layer: 'report' },
    { title: '다음 스프린트 제안 작업 3개 추출', layer: 'report' },
  ],
};

const SIGNAL_TASKS = {
  api: {
    do: [
      { title: 'API 문서(요약) 및 에러 응답 명세 보강', layer: 'controller' },
      { title: '요청/응답 DTO 스펙 변경 테스트 케이스 정렬', layer: 'dto' },
    ],
  },
  entity: {
    plan: [{ title: '도메인 용어사전(비즈니스 용어) 확정', layer: 'entity' }],
    design: [{ title: '식별자 전략/연관관계 정책 결정', layer: 'entity' }],
    do: [{ title: '도메인 제약 조건(Unique/Index/SoftDelete) 반영', layer: 'entity' }],
  },
  security: {
    design: [{ title: '권한·인증 플로우(토큰/필터/예외) 정합성', layer: 'exception' }],
    do: [{ title: '권한검사 및 정책 기반 접근제어 반영', layer: 'exception' }],
    analyze: [{ title: '권한 우회·권한부재 케이스 테스트', layer: 'test' }],
  },
  exception: {
    do: [{ title: '문제별 에러 메시지/상태코드 통일', layer: 'exception' }],
    analyze: [{ title: '에러 처리 누락 케이스 점검', layer: 'exception' }],
  },
  infra: {
    design: [{ title: '운영/캐시/외부 연계 의존성 최소화 전략 정의', layer: 'config' }],
    do: [{ title: '의존성/설정 보강 및 회귀 위험 점검', layer: 'config' }],
  },
};

const LAYER_DEPENDENCIES = {
  entity: [],
  dto: [],
  config: [],
  exception: [],
  repository: ['entity'],
  service: ['entity', 'repository'],
  controller: ['service', 'dto', 'exception'],
  test: ['entity', 'repository', 'service', 'controller', 'dto', 'exception'],
};

function formatTaskWithOwner(task) {
  const owner = task.owner ? ` (${task.owner})` : '';
  return `${task.title}${owner}`;
}

function safeTrim(value) {
  if (!value) return '';
  if (typeof value !== 'string') return String(value);
  return value.trim();
}

function stripEnclosingQuote(value) {
  if (!value) return '';
  const trimmed = safeTrim(value);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"'))
      || (trimmed.startsWith('\"') && trimmed.endsWith('\"'))
      || (trimmed.startsWith("'") && trimmed.endsWith("'"))
      || (trimmed.startsWith('`') && trimmed.endsWith('`'))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseSuperworkPrompt(prompt) {
  const normalized = safeTrim(prompt);
  if (!normalized) {
    return {
      raw: '',
      hasRequest: false,
      requestText: '',
      featureSlug: '',
      isSuperworkCommand: false,
    };
  }

  const match = normalized.match(/^\/\s*superwork\b\s*(.*)$/i);
  if (!match) {
    return {
      raw: normalized,
      hasRequest: false,
      requestText: '',
      featureSlug: '',
      isSuperworkCommand: false,
    };
  }
  const body = match ? stripEnclosingQuote(match[1] || '') : normalized;
  const requestText = safeTrim(body);

  return {
    raw: normalized,
    hasRequest: !!requestText,
    requestText,
    featureSlug: slugifyFeature(requestText),
    isSuperworkCommand: true,
  };
}

function slugifyFeature(value) {
  const normalized = safeTrim(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return `feature-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  }

  const words = normalized.split(' ').slice(0, 5).filter(Boolean);
  return words.join('-');
}

function detectSignals(text) {
  const normalized = safeTrim(text);
  const hits = {};

  for (const { key, patterns } of SIGNAL_PATTERNS) {
    hits[key] = patterns.some((pattern) => pattern.test(normalized));
  }

  return hits;
}

function uniqueTaskList(tasks) {
  const seen = new Set();
  return tasks.filter((task) => {
    const normalized = safeTrim(task.title).toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function collectTasksForPhase(phaseId, signals) {
  const base = (BASE_TASKS[phaseId] || []).map((task) => ({ ...task }));
  const extra = [];

  Object.entries(signals || {}).forEach(([signal, isActive]) => {
    if (!isActive || !SIGNAL_TASKS[signal] || !SIGNAL_TASKS[signal][phaseId]) return;
    for (const task of SIGNAL_TASKS[signal][phaseId]) {
      extra.push({ ...task });
    }
  });

  return uniqueTaskList([...base, ...extra]);
}

function canParallelize(leftTask, rightTask) {
  const leftLayer = leftTask.layer;
  const rightLayer = rightTask.layer;
  if (!leftLayer || !rightLayer) return true;

  const leftDeps = LAYER_DEPENDENCIES[leftLayer] || [];
  const rightDeps = LAYER_DEPENDENCIES[rightLayer] || [];
  return !leftDeps.includes(rightLayer) && !rightDeps.includes(leftLayer);
}

function buildParallelGroups(tasks, maxParallel) {
  const normalizedMax = Number.isFinite(maxParallel) && maxParallel > 0 ? Math.max(1, Math.floor(maxParallel)) : 1;
  const groups = [];

  for (const task of tasks) {
    let placed = false;
    for (const group of groups) {
      if (group.length >= normalizedMax) continue;
      const allIndependent = group.every(item => canParallelize(item, task));
      if (allIndependent) {
        group.push(task);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push([task]);
    }
  }

  return groups;
}

function assignOwners(tasks, members = []) {
  if (!Array.isArray(members) || members.length === 0) {
    return tasks.map(task => ({
      ...task,
      owner: null,
    }));
  }

  return tasks.map((task, idx) => ({
    ...task,
    owner: members[idx % members.length],
  }));
}

function buildPdcaDoChecklist(doPhase, featureSlug) {
  const lines = [];
  const tasks = (doPhase && Array.isArray(doPhase.tasks)) ? doPhase.tasks : [];
  const groups = (doPhase && Array.isArray(doPhase.parallelGroups)) ? doPhase.parallelGroups : [];

  lines.push('## 3) /pdca do 실행 체크리스트 템플릿');
  lines.push('`/pdca do`와 바로 연결해서 쓰기 위한 체크리스트입니다.');
  lines.push('');
  lines.push('```markdown');
  lines.push('## Superwork Do Checklist');
  lines.push(`/pdca do ${featureSlug}`);
  lines.push('');
  if (tasks.length === 0) {
    lines.push('- [ ] Do 실행 항목이 없습니다.');
  } else {
    tasks.forEach((task, idx) => {
      lines.push(`- [ ] ${idx + 1}. ${formatTaskWithOwner(task)}`);
    });
  }
  lines.push('');
  if (groups.length > 1) {
    lines.push('### 병렬 실행 제안');
    groups.forEach((group, idx) => {
      if (group.length === 0) return;
      const names = group.map((task) => formatTaskWithOwner(task)).join(' / ');
      lines.push(`- 그룹 ${idx + 1}: ${names}`);
    });
  } else if (groups.length === 1 && groups[0]?.length > 0) {
    lines.push('### 병렬 실행 제안');
    lines.push(`- 그룹 1: ${groups[0].map((task) => formatTaskWithOwner(task)).join(' / ')}`);
  }
  lines.push('```');
  lines.push('');
  lines.push('```text');
  lines.push('권장 실행 패턴: `/pdca do <feature>` → 완료 체크리스트 → `/pdca analyze <feature>`');
  lines.push('```');

  return lines.join('\n');
}

function buildTeamContext(level, phaseId, feature) {
  let teamEnabled = false;
  try {
    teamEnabled = Boolean(isTeamEnabledInConfig());
  } catch {
    teamEnabled = false;
  }

  const context = orchestrator.buildTeamContextForPhase(phaseId, feature, { level });

  if (!context) {
    return {
      lead: null,
      members: [],
      pattern: 'single',
      maxParallel: 1,
      delegateMode: false,
      delegateAgent: null,
      taskQueue: [],
      enabled: false,
      reason: 'context_unavailable',
    };
  }

  return {
    lead: context.lead || null,
    members: teamEnabled ? (context.members || []) : [],
    pattern: context.pattern || 'single',
    maxParallel: teamEnabled ? (context.maxParallel || 1) : 1,
    delegateMode: teamEnabled ? Boolean(context.delegateMode) : false,
    delegateAgent: teamEnabled ? (context.delegateAgent || null) : null,
    taskQueue: teamEnabled ? (context.taskQueue || []) : [],
    enabled: teamEnabled,
    reason: teamEnabled ? null : 'team_disabled',
  };
}

function buildPhaseBlueprint(feature, phaseConfig, signals, level) {
  const context = buildTeamContext(level, phaseConfig.id, feature);
  const tasks = assignOwners(collectTasksForPhase(phaseConfig.id, signals), context.members);
  const groups = buildParallelGroups(tasks, context.maxParallel);

  return {
    id: phaseConfig.id,
    title: phaseConfig.title,
    goal: phaseConfig.goal,
    team: {
      lead: context.lead,
      members: context.members,
      pattern: context.pattern,
      maxParallel: context.maxParallel,
      delegateMode: context.delegateMode,
      delegateAgent: context.delegateAgent,
      enabled: context.enabled,
      reason: context.reason,
    },
    tasks,
    parallelGroups: groups,
  };
}

function getLevelHint() {
  try {
    return cache.get('level') || 'SingleModule';
  } catch {
    return 'SingleModule';
  }
}

function buildPdcaFlow(featureSlug, size) {
  const commands = [
    `/pdca plan ${featureSlug}`,
    `/pdca design ${featureSlug}`,
    `/pdca do ${featureSlug}`,
    `/pdca analyze ${featureSlug}`,
  ];

  // 작은 요청이라도 분석 단계는 유지하고, 분석 점수 기준으로 iterate 여부를 결정한다.
  commands.push(`/pdca iterate ${featureSlug}`);
  commands.push(`/pdca report ${featureSlug}`);
  commands.push('/pdca status');
  commands.push('/pdca next');

  return commands;
}

function buildMarkdown({ requestText, featureSlug, size, phases, startedWaveState }) {
  const lines = [];
  lines.push('[Superwork] 오케스트레이션 엔진(자동 생성)');
  lines.push('');
  lines.push('## 1) 요청 분해 템플릿');
  lines.push(`- 요청: ${requestText || '(요청 내용 없음)'}`);
  lines.push(`- feature 슬러그: ${featureSlug}`);
  lines.push(`- 작업 규모: ${size.label}`);
  lines.push('');

  for (const phase of phases) {
    lines.push(`### ${phase.title} (${phase.id})`);
    lines.push(`목표: ${phase.goal}`);
    lines.push(`팀: 패턴 ${phase.team.pattern}, 최대 병렬 ${phase.team.maxParallel}개`);
    if (phase.team && phase.team.enabled === false) {
      lines.push('⚠️ team.enabled=false: 팀 오케스트레이션이 비활성화되어 병렬도 함께 병렬 오퍼레이션 제안이 제한됩니다.');
    }
    if (phase.team.lead || phase.team.delegateAgent) {
      lines.push(`리더: ${phase.team.lead || phase.team.delegateAgent}`);
    }
    lines.push('작업 템플릿:');
    for (const task of phase.tasks) {
      const owner = task.owner ? ` (${task.owner})` : '';
      lines.push(`- [ ] ${task.title}${owner}`);
    }
    lines.push('병렬 제안:');
    phase.parallelGroups.forEach((group, idx) => {
      if (group.length === 0) return;
      const names = group.map(task => `${task.title}${task.owner ? ` (${task.owner})` : ''}`).join(' / ');
      lines.push(`- 병렬 그룹 ${idx + 1}: ${names}`);
    });
    lines.push('');
  }

  lines.push('## 2) /pdca 연동 제안');
  lines.push('아래 순서로 PDCA를 붙이면 구현-검증-보강-완료까지 이어집니다.');
  lines.push('※ `/pdca iterate`는 `/pdca analyze`의 Match Rate가 90% 미만일 때만 수행하도록 기본 판단합니다.');
  const pdcaFlow = buildPdcaFlow(featureSlug, size);
  for (const cmd of pdcaFlow) {
    lines.push(`- ${cmd}`);
  }
  if (size && (size.size === 'quickFix' || size.size === 'minorChange')) {
    lines.push('');
    lines.push('작은 범위라 해도 Plan/Design/Do/Analyze 단계는 기본 체인으로 유지하고, Analyze 결과에 따라 Iterate 진행 유무를 판단하세요.');
  }
  lines.push('');
  lines.push('원하면 다음 입력으로 바로 `1-2개씩` 단계 실행부터 시작해도 됩니다.');

  const doPhase = phases.find((phase) => phase.id === 'do');
  if (doPhase) {
    lines.push('');
    lines.push(buildPdcaDoChecklist(doPhase, featureSlug));

    if (doPhase.team && doPhase.team.enabled && doPhase.parallelGroups && doPhase.parallelGroups.length > 1) {
      const wavePlan = buildWavePlan(doPhase.parallelGroups, featureSlug);
      if (wavePlan.length > 0) {
        lines.push('');
        lines.push(buildWaveExecutionMarkdown(wavePlan, featureSlug, startedWaveState));
      }
    }
  }

  return lines.join('\n');
}

function buildSuperworkBlueprint(rawPrompt) {
  const parsed = parseSuperworkPrompt(rawPrompt);
  if (!parsed.isSuperworkCommand || !parsed.hasRequest) {
    return {
      hasRequest: false,
      message: '[Superwork] `/superwork "구현내용"` 형식으로 요청을 입력해 주세요.\n예: `/superwork 회원가입 API의 중복가입 방지 기능 구현`',
    };
  }

  const signals = detectSignals(parsed.requestText);
  const size = classifyBySize(parsed.requestText);
  const level = getLevelHint();
  const phases = PHASES.map(phase => buildPhaseBlueprint(parsed.featureSlug, phase, signals, level));

  // wave state 초기화 + wave 1 즉시 시작
  const doPhase = phases.find(p => p.id === 'do');
  let startedWaveState = null;
  if (doPhase?.team?.enabled && doPhase?.parallelGroups?.length > 1) {
    const wavePlan = buildWavePlan(doPhase.parallelGroups, parsed.featureSlug);
    if (wavePlan.length > 0) {
      try {
        const projectRoot = platform.findProjectRoot(process.cwd());
        if (projectRoot) {
          const waveState = createWaveState(wavePlan, parsed.featureSlug);
          startWave(waveState, 1, projectRoot);
          initWaveExecution(projectRoot, waveState);
          if (waveState.status === 'in_progress') {
            startedWaveState = waveState;
          }
        }
      } catch (_) { /* wave init 실패해도 superwork 정상 진행 */ }
    }
  }

  return {
    hasRequest: true,
    requestText: parsed.requestText,
    featureSlug: parsed.featureSlug,
    size,
    phases,
    message: buildMarkdown({
      requestText: parsed.requestText,
      featureSlug: parsed.featureSlug,
      size,
      phases,
      startedWaveState,
    }),
  };
}

module.exports = {
  parseSuperworkPrompt,
  detectSignals,
  buildSuperworkBlueprint,
};
