# Components Overview

demokit 플러그인의 전체 컴포넌트 현황.

## 요약

| 카테고리 | 수량 |
|---------|------|
| Agents (에이전트) | 15개 |
| Skills (스킬) | 32개 |
| Hooks (훅) | 10개 |
| Output Styles | 3개 |
| Orchestration Patterns | 5개 |

## Agents (15개)

### 설계/아키텍처 (2)
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| spring-architect | opus | 아키텍처 설계, 패키지 구조 |
| product-manager | sonnet | 요구사항 분석, MoSCoW 우선순위 |

### 구현 (4)
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| domain-expert | opus | JPA Entity, Repository |
| service-expert | opus | Service 비즈니스 로직 |
| api-expert | opus | Controller, DTO, API |
| dba-expert | opus | DB 최적화, 인덱스, N+1 |

### 품질 (4)
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| test-expert | opus | 테스트 코드 생성 |
| code-reviewer | opus | 코드 리뷰 |
| gap-detector | opus | 설계-구현 Gap 분석 |
| qa-monitor | haiku | 로그 기반 QA 모니터링 |

### 인프라/배포 (2)
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| infra-expert | sonnet | Docker, Gradle, 설정 |
| devops-engineer | sonnet | CI/CD, K8s, 배포 |

### 보안 (1)
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| security-expert | opus | Spring Security, JWT |

### 자동화 (2)
| 에이전트 | 모델 | 역할 |
|---------|------|------|
| pdca-iterator | opus | PDCA 반복 수정 |
| report-generator | haiku | 완료 보고서 생성 |

## Skills (32개)

### 코드 생성 (8)
/crud, /entity, /service, /controller, /repository, /dto, /exception, /test

### 워크플로우 (4)
/pdca, /loop, /plan-plus, /pipeline

### 분석 (4)
/review, /qa, /optimize, /erd

### 인프라 (7)
/docker, /gradle, /security, /config, /properties, /migration, /cache

### Git (5)
/commit, /push, /commit-push, /pr, /changelog

### 기타 (4)
/init, /help, /api-docs, /cancel-loop

## Hooks (10개)

| 훅 | 트리거 | 핵심 기능 |
|------|--------|----------|
| SessionStart | 세션 시작 | 프로젝트 감지, 레벨 판별 |
| UserPromptSubmit | 프롬프트 제출 | 의도 분석, 모호성 감지 |
| PreToolUse | 도구 사용 전 | 안전 검증 (Write/Edit, Bash) |
| PostToolUse | 도구 사용 후 | 결과 후처리 (Write/Edit, Bash, Skill) |
| Stop | 세션 종료 | 상태 저장/정리 |
| TaskCompleted | 태스크 완료 | 다음 작업 배정 |
| SubagentStart | 서브에이전트 시작 | 팀 멤버 등록 |
| SubagentStop | 서브에이전트 종료 | 팀 멤버 해제 |
| TeammateIdle | 팀원 유휴 | 다음 팀 작업 배정 |
| PreCompact | 컨텍스트 압축 전 | 컨텍스트 보존 |

## Orchestration Patterns (5개)

| 패턴 | 설명 | 사용 시나리오 |
|------|------|-------------|
| leader | 리더가 순차 처리 | 단일 담당자 작업 |
| council | 전원 병렬 분석 | Gap 분석, 코드 리뷰 |
| swarm | 의존성 기반 병렬/순차 | 구현 (Entity→Service→Controller) |
| pipeline | 순차 스테이지 | 설계 파이프라인 |
| watchdog | 전원 전체 작업 모니터링 | MSA 품질 감시 |

## Output Styles (3개)

| 스타일 | 대상 |
|--------|------|
| demodev-monolith | SingleModule, MultiModule, Monolith |
| demodev-msa | MSA |
| demodev-pdca-guide | PDCA 가이드 |

## 관련 문서
- [[../philosophy/core-mission]] — 핵심 미션
- [[../philosophy/pdca-methodology]] — PDCA 방법론
- [[../philosophy/context-engineering]] — 컨텍스트 엔지니어링
