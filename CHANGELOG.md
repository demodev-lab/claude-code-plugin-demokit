# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (none)

## [1.0.6] - 2026-02-20

### Changed
- `/superwork` 플로우 가이드를 Plan/Design/Do/Analyze→(조건부 Iterate)→Report까지 정석 체인으로 정합.
- `/superwork` 요청 시 출력되는 PDCA 제안에서 Gap 개선 조건(Analyze 후 90% 미만) 기반 iterate 판단을 명시.

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
