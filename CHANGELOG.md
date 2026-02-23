# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2026-02-23

### Fixed
- Wave 초기화 중복 실행 방지: `buildSuperworkBlueprint`에 기존 waveExecution 가드 추가
- Worktree 생성 idempotent 처리: 기존 branch/worktree 존재 시 재사용
- `stop-handler.js` state 쓰기에 `withFileLock` 적용 (race condition 방지)

### Added
- `state-writer.withTeamLock()` 헬퍼 함수 export

## [1.1.0] - 2026-02-23

### Added
- Layer Constants 단일 소스 모듈 (`layer-constants.js`) — LAYER_DEPENDENCIES + LAYER_FILE_PATTERNS 정본
- Work Pod 시스템 (`work-pod.js`) — Navigator/Dev/Executor/QA 4인 Pod 프로토콜
- Dynamic Scheduler (`dynamic-scheduler.js`) — 실패 task 정책 기반 재할당 + spawn helper
- Artifact Writer (`artifact-writer.js`) — PRD/DESIGN/TASKS 산출물 파일 자동 저장
- Cross-Team Validation 완전 구현
  - `test` layer를 CROSS_VALIDATION_MAP에 추가 (`service-expert`)
  - LAYER_REVIEW_CHECKLIST: 레이어별 검토 체크리스트
  - `buildCrossValidationMarkdown`: 파일 패턴, 검토 항목, 완료 보고 양식 포함
  - `buildCrossValidationDispatch`: 병렬 Task subagent 실행 지시 래퍼
  - 이전 wave 교차 검증 결과를 다음 wave dispatch 마크다운에 주입
- Superwork 산출물 강화: PRD 수락 기준, Design 의존관계 다이어그램, Tasks YAML
- Coordinator `resolveTaskDependencies`에 ownFiles 자동 주입
- 오케스트레이션 갭 분석 문서 (`docs/orchestration-gap-analysis.md`)

### Fixed
- `/pdca do` 경로에서 `complexityScore`가 `createWaveState`에 전달되지 않던 문제
- `task-completed.js`에서 `complexityScore || 0` → `?? 0` 시맨틱 수정
- `buildCrossValidationMarkdown`에서 `featureSlug` undefined 시 `'unknown'` fallback 추가

## [1.0.8] - 2026-02-23

### Fixed
- `finalizeWave` 트리거 갭: `extractLayer` null 시 wave 처리 블록이 영원히 스킵되는 결함 수정
  - fallback 1: worktree branch name에서 layer 추출
  - fallback 2: agentId로 현재 wave 미완료 task 매칭

### Removed
- `coordinator.js`: `distributeWork`, `distributeLeader`, `distributeCouncil`, `distributeWatchdog`, `distributePipeline`, `distributeSwarm`, `canParallelizeAtPosition` 제거
- `cto-logic.js`: `decidePdcaPhase`, `evaluateDocument`, `recommendTeamComposition`, `REQUIRED_SECTIONS` 제거
- `task-queue.js`: `_taskAssignments` Map, `assignTaskToRole`, `getTeamProgress`, `findNextAvailableTask`, `isPhaseComplete` 제거
- `orchestrator.js`: `shouldUseTeam`, `delegateTask`, `selectPattern` 제거
- `communication.js`: `createPlanDecision`, `createDirective` 제거
- `hooks.js`: `handleTeammateIdle` 제거
- `state-writer.js`: `getActiveMembers` 제거
- `worktree-manager.js`: `listWorktrees` 제거
- `agent-id.js`: `normalizeAgentId` export 제거 (내부 헬퍼로 유지)

### Added
- `/superwork` blueprint 생성 시 wave state 자동 초기화 (team enabled + parallelGroups > 1 조건)
- `/pdca do` 실행 시 wave state 초기화 트리거 (중복 초기화 방지 포함)
- wave-trigger 단위 테스트 6건 추가

## [1.0.7] - 2026-02-23

### Added
- Wave 기반 Git Worktree 병렬 실행 시스템 (`lib/team/worktree-manager.js`, `lib/team/wave-executor.js`)
- `worktree-manager`: git worktree CRUD (생성/삭제/merge/목록), wave 단위 일괄 생성/merge+cleanup, 부분 실패 시 rollback
- `wave-executor`: parallelGroups → wavePlan 변환, wave 상태 관리, hook 기반 wave 전환 로직
- `state-writer`: `initWaveExecution`/`updateWaveExecution` 함수, team-state version 1.2
- `/superwork` 마크다운에 Wave 기반 병렬 실행 계획 자동 포함
- `task-completed` hook에 Section 6.5 Wave 실행 전환 (3-phase 원자적 상태 관리)
- Wave 1 자동 시작 (pending → in_progress 전환)
- `coordinator.distributeSwarm`에 `isolation`/`layer` 필드 추가

### Fixed
- Shell command injection 방어: branch name sanitize, path validate, baseBranch/worktreeBranch sanitize
- Race condition 방지: completeWaveTask를 file lock 내부에서 실행, stale snapshot overwrite 방지
- Null guard: mergeAndCleanupWave, createWaveWorktrees, buildWavePlan, startWave 등 20+ 방어 코드
- `removeWorktree` catch-all이 real error를 묻어버리는 문제 → 선택적 prune fallback
- non-conflict merge 실패 시 worktree 삭제 → worktree 보존으로 변경
- blocked wave 무한 재시도 방지, startWave 실패 시 상태 불일치 방지
- buildWavePlan에서 layer 없는 task/non-array group filter, waveIndex 재인덱싱

## [1.0.6] - 2026-02-20

### Added
- (none)

### Changed
- `/superwork` 플로우 가이드를 Plan/Design/Do/Analyze → (조건부 Iterate) → Report까지 정석 체인으로 정립.
- `/superwork` 요청 시 `/pdca` 연계 가이드에 Analyze 결과 기준으로 Iterate 수행 조건(낮은 Match Rate 시 반복)을 명시.

### Fixed
- `.pdca/` 하위 임시 산출물로 오인되는 문서(`docs/.bkit-memory.json`, `docs/.pdca-status.json`)가 생성되어 저장소에 남는 문제를 방지.

## [1.0.5] - 2026-02-20

### Added
- `/superwork` 입력 파서 하드닝: `/superwork` 형식이 아닌 일반 문장은 제안 생성 대상에서 제외.
- `/superwork` 엔진에 팀 비활성 진단 메시지 노출(`team.enabled=false`)을 추가해 병렬 오케스트레이션 제약 사전 안내.
- `/superwork`와 `/pdca` 연동 시 생성 체크리스트 템플릿 결과에 팀 상태 메타(`enabled/reason`) 반영.

### Fixed
- 비정상 입력(커맨드 아님)으로 `buildSuperworkBlueprint`가 동작하는 오동작을 방지.
- 팀 비활성(`team.enabled=false`) 상태에서 병렬 제안이 과도하게 제안되는 문제를 보정.

## [1.0.4] - 2026-02-20

### Added
- Hook 런타임 토글 헬퍼 추가: `lib/core/hook-runtime.js`
- Hook 런타임 토글 확장: `demodev.config.json > hooks.runtime.events/scripts`
- Hook 관련 신규 테스트 추가:
  - `test/unit/hook-runtime.test.js`
  - `test/unit/pipeline-phase-runtime.test.js` 보강
- bkit 호환 명령 alias 확장 (`commands/*`):
  - `/code-review`, `/zero-script-qa`, `/development-pipeline`
  - `/starter`, `/dynamic`, `/enterprise`
  - `/phase-1-schema` ~ `/phase-9-deployment`
- 호환 명령 매핑 문서 추가: `docs/compatibility-command-map.md`
- 운영/레퍼런스 문서 고도화:
  - `docs/config-recipes.md`
  - `docs/command-cookbook.md`
  - `docs/incident-response-playbook.md`
  - `docs/glossary.md`
  - ADR 문서 3종 (`docs/adr-001~003-*.md`)

### Changed
- 주요 hook 스크립트가 `hooks.runtime` 토글을 존중하도록 개선:
  - `scripts/user-prompt-handler.js`
  - `scripts/task-completed.js`
  - `scripts/stop-handler.js`
  - `scripts/context-compaction.js`
  - `scripts/subagent-start-handler.js`
  - `scripts/subagent-stop-handler.js`
  - `scripts/team-idle-handler.js`
- `scripts/pipeline-phase-runtime.js` 고도화:
  - stage별 hook/event/script 제어 (`pre/post/stop/transition`)
  - `stopEnabled`, `emitOncePerPhase` 지원
  - phase/stage 힌트 메시지 추가
- `scripts/pipeline-phase-stop.js`를 runtime 기반으로 리팩터링해 stage 게이트/토글 일관성 확보
- `developmentPipeline.phaseScripts`에 `stopEnabled`, `emitOncePerPhase` 반영

## [1.0.3] - 2026-02-20

### Added
- `/demokit` 명령 허브를 실행 가능한 command frontmatter 형식으로 강화 (`commands/demokit.md`).
- `/output-style-setup`를 설치형 워크플로우로 확장 (project/user 레벨 선택 + 파일 복사 절차).
- 트리거 우선순위 문서 추가: `demokit-system/triggers/priority-rules.md`.
- 파이프라인 상태 자동 전이 CLI 추가: `scripts/pipeline-ctl.js` (`start|status|next`).
- 문서 드리프트 방지 스크립트 추가: `scripts/generate-graph-index.js`.
- 신규 테스트 추가:
  - `test/unit/pipeline-state.test.js`
  - `test/unit/graph-index-generator.test.js`
  - `test/unit/team-config-performance.test.js`
  - `test/unit/team-config-level-overrides.test.js`
  - `test/unit/team-level-mapping.test.js`
  - `test/unit/pipeline-phase-runtime.test.js`
  - `test/unit/pipeline-phase-stop.test.js`
  - `test/unit/pdca-phase.test.js` sticky-cache 케이스 보강
- phase별 pipeline 스크립트 추가:
  - stop: `scripts/phase-1-schema-stop.js` ~ `scripts/phase-9-deployment-stop.js`
  - pre/post: `scripts/phase-1-schema-pre.js` ~ `scripts/phase-9-deployment-post.js`
  - dispatcher: `scripts/pipeline-phase-pre.js`, `scripts/pipeline-phase-post.js`, `scripts/pipeline-phase-stop.js`, `scripts/pipeline-phase-transition.js`
  - common runtime: `scripts/pipeline-phase-runtime.js`, `scripts/pipeline-phase-stop-common.js`
- 시스템 문서 확장:
  - `demokit-system/philosophy/architecture-principles.md`
  - `demokit-system/components/team-orchestration.md`
  - `demokit-system/components/pipeline-phase-scripts.md`
  - `demokit-system/scenarios/pdca-do-performance.md`
  - `demokit-system/scenarios/team-delegate-mode.md`
- 운영 레퍼런스 문서 허브 추가 (`docs/*`):
  - `docs/README.md`
  - `docs/architecture-overview.md`
  - `docs/team-orchestration-guide.md`
  - `docs/pipeline-phase-scripts-guide.md`
  - `docs/pdca-performance-guide.md`
  - `docs/hook-runtime-control.md`
  - `docs/reference-config.md`
  - `docs/troubleshooting.md`
  - `docs/migration-from-bkit.md`
  - `docs/runbook-demo-vs-prod.md`
  - `docs/performance-benchmark.md`

### Changed
- `hooks/hooks.json` timeout 단위를 ms 기준으로 통일 (`5/10` → `5000/10000`).
- Hook에 pipeline phase dispatcher를 추가해 stage별 처리 분리:
  - `PreToolUse` -> `pipeline-phase-pre.js`
  - `PostToolUse` -> `pipeline-phase-post.js`
  - `Stop` -> `pipeline-phase-stop.js`
  - `TaskCompleted` -> `pipeline-phase-transition.js`
- `developmentPipeline.phaseScripts` 런타임 토글(`enabled`, `preEnabled`, `postEnabled`, `transitionEnabled`) 추가.
- `pipeline-phase-stop-common.js` 완료 신호 판정을 강화해 `incomplete`, `미완료`, `not complete` 류의 부정 표현 오탐을 방지.
- `pipeline-phase-runtime.js` emit-once marker 키에 pipeline run id(`startedAt`)를 포함해 reset/start 이후 pre/post 힌트가 정상 재노출되도록 개선.
- `lib/core/plugin-validator.js`에 hook timeout 검증 로직 추가 (누락/비정상값/의심 단위 경고).
- `scripts/validate-hooks.js`에 hook timeout 검증/리포트 항목 추가.
- `skills/pipeline/SKILL.md`를 상태 파일 기반(`.pipeline/status.json`) status/next 자동 전이 흐름으로 강화.
- `skills/pipeline/skill.yaml` argument-hint를 `feature|status|next` 형태로 갱신.
- `scripts/pipeline-ctl.js`에서 `start user-management`(positional) 지원 및 옵션 순서(`start --reset user-management`) 호환성 개선.
- `lib/pipeline/state.js`에서 완료된 파이프라인에 대한 반복 `next` 호출 시 history 중복 누적을 방지.
- `lib/pipeline/state.js`의 start/next 전이를 파일 락 기반(`io.withFileLock`)으로 보호하여 동시 실행 시 상태 경합(race) 리스크 완화.
- PDCA Do 오케스트레이션 성능 튜닝:
  - `demodev.config.json`에 `team.performance` 섹션 추가 (phase별 member cap/pattern/maxParallel override)
  - SingleModule `do` phase fan-out을 설정 기반으로 제어하도록 개선 (`phaseMemberCap/patternOverride/maxParallel`; 현재 기본 3인 멀티 실행)
  - `lib/team/team-config.js`가 `team.performance` 오버라이드를 반영하도록 개선
  - `lib/team/orchestrator.js`가 팀별 `maxParallel` 설정을 존중하도록 개선
  - `skills/pdca/skill.yaml`에 phase별 agents 매핑을 명시하여 `do/analyze/iterate/report`에서 경량/전문 에이전트 우선 라우팅
  - `lib/pdca/phase.js`의 `PHASE_INFO.do.agent`를 `service-expert`로 정렬해 문서/메타 불일치 제거
- Team 레벨 제어 강화:
  - `demodev.config.json`에 `team.delegateMode`, `team.levelOverrides`, `team.levelProfileMap` 추가
  - demokit topology 레벨(`SingleModule/MultiModule/Monolith/MSA`)을 bkit 프로파일(`Dynamic/Enterprise`)로 호환 매핑하는 레이어(`lib/team/level-mapping.js`) 추가
  - `lib/team/team-config.js`가 레벨별 override + delegate mode를 반영하도록 확장
  - `lib/team/team-config.js`의 phase team 해석을 merge 방식으로 개선해 partial override(`pattern`만 override 등) 시 기본 members/lead 유지
  - delegate mode에서 phase를 단일 리더(`leader`, `maxParallel=1`)로 강제해 데모/핫패스 fan-out 축소
  - `lib/team/orchestrator.js`가 `delegateMode/delegateAgent` 메타를 팀 컨텍스트에 포함
  - `lib/team/hooks.js`가 `team-config` 기반 팀 구성을 일관되게 사용
- `lib/pdca/phase.js` deliverables 탐색 최적화:
  - do phase 패턴을 `src/main/java/**/entity/*.java`로 좁혀 스캔 범위 축소
  - do phase 완료 후 sticky cache를 사용해 반복 체크 시 재스캔 최소화
  - sticky cache에 TTL(`pdca.doStickyCacheTtlMs`, 기본 15000ms) 적용으로 stale 판정 리스크 완화
  - 파일 탐색 시 skip 디렉토리(`build`, `target`, `node_modules` 등) 제외
- `scripts/task-completed.js` 핫패스 최적화:
  - 기본값으로 Team transition hint 계산 비활성화(`team.performance.emitTransitionHints=false`)
  - PDCA active feature 컨텍스트를 재사용해 팀 sync 시 중복 상태 조회를 줄임
  - auto transition 이후 active feature phase 컨텍스트를 즉시 갱신해 후속 team sync/hint 계산 일관성 개선
- `lib/team/hooks.js`가 `strategy` 대신 `team-config` 기반 팀 구성을 사용하도록 변경(성능 오버라이드 반영 일관성 확보).
- `demokit-system/_GRAPH-INDEX.md`의 에이전트 모델 표를 실제 설정(sonnet/opus)과 동기화.
- `package.json`에 운영 스크립트 추가:
  - `validate:hooks`
  - `sync:graph-index`
  - `check:graph-index`

## [1.0.2] - 2026-02-19

### Added
- `plugin.json`에 `outputStyles` 연결 (`./output-styles/`).
- `hooks/hooks.json`에 schema + timeout + `SessionStart.once` 적용.
- `marketplace.json`에 schema/version 메타 추가.
- 누락된 skill metadata 추가/정비:
  - `skills/pipeline/skill.yaml`
  - `skills/qa/skill.yaml`
  - `skills/worker/skill.yaml`
  - `skills/plan-plus/skill.yaml` 보완
- 운영 문서 추가:
  - `CUSTOMIZATION-GUIDE.md`
  - `commands/demokit.md`
  - `commands/output-style-setup.md`
- 시스템 문서 레이어 확장:
  - `demokit-system/scenarios/*`
  - `demokit-system/triggers/trigger-matrix.md`
  - `demokit-system/testing/test-checklist.md`

### Changed
- `lib/core/plugin-validator.js`가 `hooks/` 참조도 인식/검증하도록 개선.
- PDCA 성능 최적화를 위한 기본 에이전트 라우팅 재조정:
  - `spring-architect`는 `opus` 유지
  - `domain/service/api/test/gap/iterator/dba` 계열을 `sonnet` 중심으로 조정
  - `security-expert`, `code-reviewer`는 `opus` 유지
- PDCA 팀 경로 최적화:
  - `team.phaseTeams.do` 멤버 3→2 축소 (`api-expert` 제거)
  - `team.phaseTeams.analyze`를 `gap-detector + test-expert` 중심으로 재정렬
- Hook 핫패스 최적화:
  - `lib/context-store/snapshot.js`에 cross-process 디스크 캐시 추가 (`.demodev/cache/snapshot-static-v1.json`, 기본 TTL 30초)
  - `lib/spring/project-analyzer.js`의 base package 감지를 `*Application.java` 우선(fast path)으로 개선
  - `scripts/unified-bash-pre.js`에서 task context 로드를 2회 → 1회로 축소
- README/운영 가이드 문서 정리 및 최신 명령/팀 모드 가이드 반영.

### Fixed
- `npm run validate:plugin -- --verbose` 경고 4건 제거:
  - skill.yaml missing 3건
  - hooks path parse 경고 1건
- Plan-plus 라우팅/메타데이터 누락 이슈 수정.
- 권한 검사 glob escape edge case 수정.

## [1.0.1] - 2026-02-18

### Added
- Spring Boot 특화 스킬/에이전트/PDCA 워크플로우 구성.
- Jest 기반 unit/integration 테스트 세트.
