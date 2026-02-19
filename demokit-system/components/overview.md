# Components Overview

demokit 플러그인의 전체 컴포넌트 현황.

## 요약

| 카테고리 | 수량 |
|---------|------|
| Agents (에이전트) | 15개 |
| Skills (스킬) | 33개 |
| Hooks (이벤트) | 10개 |
| Hook Commands | 18개 |
| Output Styles | 3개 |
| Orchestration Patterns | 5개 |
| Pipeline Phase Scripts | pre/post/stop/transition 지원 |

## Agents (15개)

### 설계/기획
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| spring-architect | opus | 아키텍처 설계, PDCA 조율 |
| product-manager | sonnet | 요구사항 분석, 우선순위 설계 |

### 구현
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| domain-expert | sonnet | Entity/Repository/도메인 계층 |
| service-expert | sonnet | Service 비즈니스 로직 |
| api-expert | sonnet | Controller/DTO/API 계층 |
| dba-expert | sonnet | DB 최적화, 인덱스, 쿼리 성능 |

### 품질/분석
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| test-expert | sonnet | 테스트 코드 생성 |
| code-reviewer | opus | 코드 리뷰/리스크 점검 |
| gap-detector | sonnet | 설계-구현 Gap 분석 |
| pdca-iterator | sonnet | 반복 개선/갭 해소 |
| report-generator | haiku | 보고서 생성 |
| qa-monitor | haiku | 로그 기반 QA 모니터링 |

### 인프라/보안
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| infra-expert | sonnet | Docker/Gradle/설정 |
| devops-engineer | sonnet | CI/CD, 배포 |
| security-expert | opus | Spring Security/JWT/OAuth |

## Skills (33개)

### 코드 생성
`/crud`, `/entity`, `/service`, `/controller`, `/repository`, `/dto`, `/exception`, `/test`

### 워크플로우
`/pdca`, `/loop`, `/plan-plus`, `/pipeline`, `/worker`

### 분석/품질
`/review`, `/qa`, `/optimize`, `/erd`, `/api-docs`

### 인프라/설정
`/docker`, `/gradle`, `/security`, `/config`, `/properties`, `/migration`, `/cache`

### Git/운영
`/commit`, `/push`, `/commit-push`, `/pr`, `/changelog`

### 기타
`/init`, `/help`, `/cancel-loop`

## Hooks

| 이벤트 | 설명 |
|------|------|
| SessionStart | 프로젝트 감지/초기화 |
| UserPromptSubmit | 의도 분석/라우팅 |
| PreToolUse | 안전 검증 |
| PostToolUse | 후처리/메타 동기화 |
| Stop | 상태 저장/정리 |
| TaskCompleted | 다음 작업 배정 |
| SubagentStart | 팀 멤버 등록 |
| SubagentStop | 팀 멤버 해제 |
| TeammateIdle | 다음 팀 작업 배정 |
| PreCompact | 컨텍스트 보존 |

## 팀 오케스트레이션 핵심

- `team.levelOverrides`로 레벨별 팀 정책 override
- `team.delegateMode`로 단일 리더 중심 실행 전환
- `team.performance`로 phase별 병렬도/멤버 수 제어

## 관련 문서
- [[team-orchestration]]
- [[pipeline-phase-scripts]]
- [[../philosophy/architecture-principles]]
