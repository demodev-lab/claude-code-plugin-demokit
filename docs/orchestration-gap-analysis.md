# Multi-Agent Orchestration Gap Analysis

> 논문 기반 레퍼런스 아키텍처 vs 현재 플러그인 구현 비교 분석

## 1. 현재 플러그인 오케스트레이션 구조

### 1.1 전체 흐름

```
/superwork "기능 요청"
  |
  v
신호 감지 -> 규모 분류 -> level 조회
  |
  v
phase별 팀 구성 (team-config x strategy)
  |
  v
taskQueue 생성 (레이어 의존성 토폴로지 정렬)
  |
  v
do phase -> Wave worktree 병렬 실행
  |
  v
TaskCompleted hook -> 완료 기록 -> Wave 전환 -> 다음 작업 배정
```

### 1.2 핵심 레이어

| 레이어 | 담당 모듈 | 역할 |
|--------|----------|------|
| 팀 구성 | `team-config`, `strategy`, `orchestrator` | level별 phase 매트릭스, 실행 패턴 결정, 컨텍스트 빌드 |
| 작업 분배 | `coordinator`, `state-writer` | Spring Boot 레이어 의존성 기반 토폴로지 정렬, file lock + atomic write 상태 관리 |
| Wave 병렬 실행 | `wave-executor`, `worktree-manager`, `wave-dispatcher` | git worktree 격리 실행, layer->agent 매핑, merge+cleanup |
| PDCA 연동 | `orchestrator.syncTeamQueueFromPdca()`, `hooks` | 활성 feature phase 읽어 팀 큐 자동 동기화, phase 전환 판단 |

### 1.3 상태 관리

- **저장소**: `.demodev/team-state.json`
- **동시성 보호**: `io.withFileLock()` + `writeAtomically(tmp->rename)`
- **이벤트 히스토리**: `task_queue_initialized`, `task_assigned`, `task_completed`, `members_pruned` 등

---

## 2. 레퍼런스 아키텍처 (논문 기반)

### 2.1 참조 논문/시스템

| 논문/시스템 | 핵심 기여 |
|------------|----------|
| ChatDev | 역할 기반 SOP 파이프라인 |
| MetaGPT | 구조화 문서(산출물) 기반 소통, 환각 감소 |
| Croto | 병렬 팀 탐색 + 교차 검증 |
| AgentCoder | Maker-Checker 테스트 루프 |
| HyperAgent | Plan/Navigate/Edit/Execute 역할 분리 |
| TEA | 라이프사이클/버전관리 |
| MAST | 실패모드 분류 + 방어 설계 |
| TDAG | 동적 DAG 재구성 |
| Evolving Orchestration | 메트릭 기반 정책 학습 |

### 2.2 제안 구조

```
(0) Intake & Complexity Router  ->  Mode 0: Single/Agentless
                                    Mode 1: Pod(Dev+QA)
                                    Mode 2: Cross-Team + 교차검증
(1) Planner (SOP 문서 생성)
    PRD.md -> DESIGN.md -> TASKS.yaml(DAG)

(2) Task Graph Builder (DAG + 파일 소유권)
    Work Package 단위, OWN FILES / DO NOT TOUCH

(3) Scheduler/Allocator (정적 + 동적)
    병렬 실행 + 의존성 순서 + 실패 시 재할당

(4) Work Pods (per worktree)
    Navigator -> Developer <-> Executor/Tester -> QA/Reviewer

(5) Cross-Team Validation
    A팀 산출물을 B팀이 리뷰/테스트

(6) Integration & Merge Pipeline
    merge order 최적화 + 통합 테스트

(7) Postmortem & Memory
    MAST 실패 분류 + 메트릭 저장
```

### 2.3 핵심 개념

- **Work Pod**: Navigator + Developer + Executor + QA 역할을 하나의 실행 단위로 묶음
- **구조화 문서 소통**: 에이전트 간 채팅 대신 PRD/DESIGN/TASKS.yaml/리포트로 동기화
- **정적 계획 + 동적 오케스트레이션**: 초기에 SOP+DAG로 쪼개고, 실행 중 재할당/추가 생성

---

## 3. Gap Analysis

### 3.1 매핑 비교

| 제안 구조 | 현재 플러그인 | 구현 수준 | 비고 |
|-----------|-------------|----------|------|
| Complexity Router (Mode 0/1/2) | `strategy.getPhaseExecutionPattern(level, phase)` | **부분** | level 기반 분기만 있음, 요청 복잡도 기반 라우팅 없음 |
| Planner (PRD/DESIGN/TASKS) | `/superwork` -> 단일 마크다운 | **약함** | 산출물 분리 없음, TASKS.yaml DAG 없음 |
| Task Graph (DAG + OWN FILES) | `coordinator.resolveTaskDependencies()` | **부분** | Spring Boot 레이어 토폴로지만, 파일 소유권 없음 |
| Scheduler (정적+동적) | `wave-executor` + `task-completed` hook | **정적만** | 동적 재할당/spawn helper 없음 |
| Work Pod (4역할) | wave-dispatcher layer->agent 매핑 | **Dev 단일** | Navigator/Executor/QA 역할 분리 없음 |
| Maker-Checker 루프 | 없음 | **없음** | dev->test->fix 반복 프로토콜 미내장 |
| Cross-Team Validation | 없음 | **없음** | 교차 리뷰/테스트 메커니즘 없음 |
| Merge Pipeline 게이트 | `mergeAndCleanupWave()` | **기계적** | merge order 최적화/통합 테스트 게이트 없음 |
| Postmortem/Memory | `state-writer.history[]` | **로그만** | MAST 분류/메트릭 피드백 루프 없음 |

### 3.2 현재 플러그인의 강점 (유지해야 할 것)

| 영역 | 설명 |
|------|------|
| 동시성 보호 | `io.withFileLock` + atomic write — 병렬 subagent 충돌 방어가 견고 |
| 도메인 특화 DAG | Spring Boot 레이어 의존성 하드코딩 (`entity->repo->service->controller`) — 범용 DAG보다 빠르고 정확 |
| PDCA 연동 | phase 자동 전환 + 팀 큐 동기화 이미 동작 |
| Wave 시스템 | git worktree 기반 병렬 실행 + merge+cleanup 파이프라인 존재 |

### 3.3 핵심 갭 (개선 필요)

#### Gap 1: 파일 소유권(OWN FILES) 부재 — 위험도 높음

현재 레이어(entity/service/controller) 단위로 worktree를 나누지만, 어떤 파일을 건드려도/건드리면 안 되는지 명시가 없음. 병렬 worktree에서 같은 파일 수정 시 merge conflict를 사전 방지하는 장치 없음.

#### Gap 2: Maker-Checker 루프 부재 — 품질 영향 높음

Pod 내부가 Dev 단일 역할. dev->test->fix 반복 루프가 구조화되지 않아 subagent가 테스트 실패 시 자체 판단에 의존. VERIFY 명령어 + 최대 N회 반복이 Pod 프로토콜에 내장되면 품질 향상 확실.

#### Gap 3: merge 전 검증 부재 — 안정성 결함

`finalizeWave()`가 `git merge --no-ff`만 수행. subagent 산출물의 테스트 통과 여부, 인터페이스 호환성, 코드 품질을 확인하지 않고 merge. 깨진 코드가 메인에 들어가는 경로가 열려 있음.

#### Gap 4: 실패 대응 없음 — 운영 불가 위험

Wave가 정적 계획 -> 순차 실행만 가능. subagent가 blocked/실패해도 감지 및 대응 경로 없음. `task-completed` hook이 성공 완료 이벤트만 처리하며, 재시도/재할당/fallback 메커니즘 부재. wave가 영원히 멈출 수 있음.

### 3.4 현재 구조의 본질적 한계

현재 구조는 "오케스트레이션"이 아니라 "디스패치"에 가깝다.

- **있는 것**: 작업을 나눠주고, 완료되면 수거하고, 다음 wave를 시작하는 "택배 시스템"
- **없는 것**: 작업 진행을 보면서 판단하고 조정하는 "관리자"

오케스트레이션이라 부르려면 최소한 **상황 인지(verify/blocked 감지) + 대응(gate/fallback)**이 필요.

---

## 4. 개선 로드맵 (중요도 기준)

### Phase 1: 최소 오케스트레이션 달성 (필수)

"오케스트레이션"이라 부를 수 있는 최소 요건. 이 4가지가 없으면 나머지는 의미 없음.

| 순서 | 항목 | 설명 | 대상 파일 |
|------|------|------|----------|
| 1 | OWN FILES 주입 | wave worktree 생성 시 파일 소유권을 subagent 프롬프트에 포함, merge conflict 사전 차단 | `wave-dispatcher.js` |
| 2 | VERIFY 루프 + 리포트 | dispatch 마크다운에 verify 명령어 + max 3회 반복 지시 삽입, 완료 시 구조화된 리포트 강제 | `wave-dispatcher.js` |
| 3 | merge 전 verify 게이트 | worktree merge 전 테스트/빌드 실행, 실패 시 merge 차단 + worktree 보존 | `wave-executor.js`, `worktree-manager.js` |
| 4 | blocked 감지 + fallback | subagent 실패/타임아웃 감지, 재시도 또는 wave 스킵 경로 | `task-completed.js`, `wave-executor.js` |

### Phase 2: 구조 고도화 (개선)

Phase 1이 안정화된 후 적용. 없어도 동작하지만 있으면 효율 상승.

| 항목 | 설명 | 대상 파일 |
|------|------|----------|
| Complexity Router | `strategy.js`의 level 기반 분기를 요청 복잡도 기반으로 확장 | `strategy.js`, `superwork/index.js` |
| 산출물 분리 | 단일 마크다운 -> PRD/DESIGN/TASKS 분리 생성 | `superwork/index.js` |
| 동적 재할당 | 실행 중 DAG 갱신, helper spawn, 우선순위 변경 | `task-completed.js`, `wave-executor.js` |

### Phase 3: 고급 최적화 (선택)

데이터가 쌓인 후 의미 있는 개선.

| 항목 | 설명 | 대상 파일 |
|------|------|----------|
| Cross-Team Validation | Mode 2 전용, 아키텍처 변경급 작업에만 적용 | 신규 모듈 |
| Postmortem 메트릭 | MAST 실패 분류 + 다음 실행 라우팅/할당 개선 피드백 | `state-writer.js`, 신규 모듈 |
| 메트릭 기반 정책 학습 | 오케스트레이터가 성공률/실패 패턴 기반으로 라우팅 최적화 | 신규 모듈 |

---

## 5. 결론

현재 플러그인은 **Wave worktree 병렬 실행 + PDCA 연동 + 동시성 보호**가 견고하며, Spring Boot 도메인 특화 DAG가 범용 구조보다 실전에서 빠름.

그러나 현재 구조는 "디스패치"이지 "오케스트레이션"이 아님. **상황 인지(verify/blocked 감지) + 대응(gate/fallback)**이 빠져 있어, 검증 없이 merge되고 실패 시 wave가 멈추는 구조적 결함이 존재.

Phase 1 (OWN FILES + VERIFY 루프 + merge 게이트 + blocked fallback) 4가지를 구현해야 **최소 오케스트레이션** 달성. 전면 재설계보다는 기존 `wave-dispatcher` + `wave-executor` + `task-completed` hook 확장으로 점진 적용이 현실적 최적.
