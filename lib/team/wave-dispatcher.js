/**
 * Wave Dispatcher
 * Wave task별 dispatch 지시 마크다운 생성
 */
const fs = require('fs');
const path = require('path');

const LAYER_AGENT_MAP = {
  entity: 'domain-expert',
  dto: 'report-generator',
  config: 'spring-architect',
  exception: 'security-expert',
  repository: 'dba-expert',
  service: 'service-expert',
  controller: 'api-expert',
  test: 'test-expert',
};

const { LAYER_FILE_PATTERNS } = require('./layer-constants');

let _workPod = null;
try { _workPod = require('./work-pod'); } catch { /* 미설치 시 기존 동작 */ }

/**
 * 프로젝트 루트의 빌드 도구를 감지하여 verify 명령어 반환
 * @returns {string|null}
 */
function detectVerifyCommand(projectRoot) {
  if (!projectRoot) return null;
  if (fs.existsSync(path.join(projectRoot, 'build.gradle'))
      || fs.existsSync(path.join(projectRoot, 'build.gradle.kts')))
    return './gradlew test';
  if (fs.existsSync(path.join(projectRoot, 'pom.xml')))
    return 'mvn test';
  if (fs.existsSync(path.join(projectRoot, 'package.json')))
    return 'npm test';
  return null;
}

/**
 * layer → agent 역매핑
 * @returns {string|null}
 */
function resolveAgentForLayer(layer) {
  if (!layer || typeof layer !== 'string') return null;
  return LAYER_AGENT_MAP[layer.toLowerCase()] || null;
}

/**
 * src/ 하위 파일 목록 (재귀, TTL 캐시 30초)
 */
let _fileListCache = { projectRoot: null, files: [], expiresAt: 0 };

function listProjectFiles(projectRoot) {
  const now = Date.now();
  if (_fileListCache.projectRoot === projectRoot && now < _fileListCache.expiresAt) {
    return _fileListCache.files;
  }
  const srcDir = path.join(projectRoot, 'src');
  if (!fs.existsSync(srcDir)) return [];
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else results.push(path.relative(projectRoot, full));
    }
  }
  walk(srcDir);
  _fileListCache = { projectRoot, files: results, expiresAt: now + 30000 };
  return results;
}

/**
 * wave의 in_progress task들에 대해 dispatch 지시 마크다운 생성
 * @returns {string} dispatch 마크다운 (없으면 빈 문자열)
 */
function buildWaveDispatchInstructions(waveState, waveIndex, options) {
  if (!waveState || !Array.isArray(waveState.waves)) return '';

  const wave = waveState.waves.find(w => w.waveIndex === waveIndex);
  if (!wave || wave.status !== 'in_progress') return '';
  if (!Array.isArray(wave.tasks)) return '';

  const activeTasks = wave.tasks.filter(t => t.status === 'in_progress' && t.layer);
  if (activeTasks.length === 0) return '';

  // 같은 wave 내 모든 task의 OWN FILES 합집합 계산
  let allOwnFiles = {};
  const fileOwnershipEnabled = options?.fileOwnershipEnabled !== false;
  if (fileOwnershipEnabled && options?.projectRoot) {
    try {
      const ownership = require('../../dist/lib/team/file-ownership');
      const projectFiles = listProjectFiles(options.projectRoot);
      const ownershipMap = ownership.classifyFiles(projectFiles, LAYER_FILE_PATTERNS);
      for (const task of activeTasks) {
        allOwnFiles[task.layer] = ownership.getExclusiveFiles(ownershipMap, task.layer);
      }
    } catch {
      // fallback: 기존 패턴 기반
      for (const task of activeTasks) {
        allOwnFiles[task.layer] = LAYER_FILE_PATTERNS[task.layer] || [];
      }
    }
  } else {
    for (const task of activeTasks) {
      allOwnFiles[task.layer] = LAYER_FILE_PATTERNS[task.layer] || [];
    }
  }

  const projectRoot = options?.projectRoot || null;
  const level = options?.level || null;
  const verifyCmd = detectVerifyCommand(projectRoot);

  const lines = [];

  // 이전 wave 교차 검증 컨텍스트 주입
  if (waveIndex > 1) {
    const prevWave = waveState.waves.find(w => w.waveIndex === waveIndex - 1);
    if (prevWave?.crossValidation?.required && prevWave.crossValidation.pairs?.length > 0) {
      lines.push('## 이전 Wave 교차 검증 결과 (참고)');
      lines.push(`Wave ${waveIndex - 1}에서 아래 레이어가 교차 검증되었습니다. 이번 Wave 구현 시 참고하세요.`);
      for (const p of prevWave.crossValidation.pairs) {
        lines.push(`- \`${p.sourceLayer}\`: ${p.validatorAgent}가 검증 완료`);
      }
      lines.push('');
    }
  }

  lines.push('## Wave Dispatch 지시');
  lines.push(`Wave ${waveIndex}: ${activeTasks.length}개 task를 **병렬로 Task subagent 실행**하세요.`);
  lines.push('');

  for (const task of activeTasks) {
    const agent = resolveAgentForLayer(task.layer) || task.layer;
    const ownFiles = allOwnFiles[task.layer] || LAYER_FILE_PATTERNS[task.layer] || [];
    const doNotTouch = Object.entries(allOwnFiles)
      .filter(([layer]) => layer !== task.layer)
      .flatMap(([, patterns]) => patterns);

    lines.push(`### ${task.layer}`);
    lines.push(`- **agent**: \`${agent}\``);
    // Model routing
    const routingEnabled = options?.routingEnabled !== false;
    if (routingEnabled) {
      try {
        const router = require('../../dist/lib/routing/model-router');
        const result = router.routeModel(
          { layer: task.layer, taskDescription: task.description, agentType: agent },
          options?.modelAssignment
        );
        lines.push(`- **model**: \`${result.model}\` (${result.reason})`);
      } catch { /* routing 모듈 미빌드 시 무시 */ }
    }
    if (task.worktreePath) {
      lines.push(`- **worktree**: \`${task.worktreePath}\``);
    }
    if (task.branchName) {
      lines.push(`- **branch**: \`${task.branchName}\``);
    }
    if (ownFiles.length > 0) {
      lines.push(`- **OWN FILES**: \`${ownFiles.join('`, `')}\``);
    }
    if (doNotTouch.length > 0) {
      lines.push(`- **DO NOT TOUCH**: \`${doNotTouch.join('`, `')}\``);
    }
    lines.push(`- **지시**: \`${task.layer}\` 레이어 구현을 해당 worktree에서 수행`);

    // Pod protocol 삽입
    if (_workPod && level) {
      const pod = _workPod.resolvePodForTask(task.layer, level);
      if (pod) {
        lines.push(`- **pod**: Navigator=\`${pod.navigator}\` | Dev=\`${pod.dev}\` | Executor=\`${pod.executor}\` | QA=\`${pod.qa}\``);
        const protocol = _workPod.buildPodProtocol(task.layer, level, { verifyCmd });
        if (protocol) {
          lines.push('');
          lines.push(protocol);
        }
      }
    }

    lines.push('');
  }

  // Policy hints
  if (options?.projectRoot) {
    try {
      const { getPolicySuggestions } = require('./policy-learner');
      const suggestions = getPolicySuggestions(options.projectRoot);
      const relevant = suggestions.filter(s =>
        s.type === 'layer' && activeTasks.some(t => t.layer === s.target)
      );
      if (relevant.length > 0) {
        lines.push('> **과거 실행 기반 주의사항:**');
        for (const s of relevant) {
          lines.push(`> - ${s.message}`);
        }
        lines.push('');
      }
    } catch { /* 무시 */ }
  }

  // VERIFY 지시 (pod protocol 활성 시 Executor step에 이미 포함되므로 skip)
  const podApplied = _workPod && level && activeTasks.some(t =>
    _workPod.resolvePodForTask(t.layer, level) !== null
  );
  if (verifyCmd && !podApplied) {
    lines.push('> 각 subagent는 구현 후 반드시 아래 검증을 수행하세요:');
    lines.push(`> 1. \`cd {worktreePath} && ${verifyCmd}\``);
    lines.push('> 2. 실패 시 수정 후 재실행 (최대 3회)');
    lines.push('> 3. 3회 실패 시 STOP하고 실패 리포트 작성');
    lines.push('');
  }

  // 완료 리포트 양식
  lines.push('> 작업 완료 시 아래 형식으로 리포트를 남기세요:');
  lines.push('> - Files modified: (수정한 파일 목록)');
  lines.push('> - How verified: (실행한 verify 명령어 + 결과)');
  lines.push('> - Known issues: (알려진 문제, 없으면 "none")');
  lines.push('');

  lines.push('> 위 task들을 각각 독립된 Task subagent로 **동시에** 실행하세요. 각 subagent는 지정된 worktree 경로에서 작업합니다.');

  return lines.join('\n');
}

module.exports = {
  LAYER_AGENT_MAP,
  LAYER_POD_MAP: _workPod ? _workPod.LAYER_POD_MAP : null,
  LAYER_FILE_PATTERNS,
  resolveAgentForLayer,
  detectVerifyCommand,
  buildWaveDispatchInstructions,
};
