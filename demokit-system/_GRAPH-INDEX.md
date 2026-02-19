# Graph Index

demokit 시스템의 전체 노드 인덱스.

## Philosophy (철학)

| 노드 | 설명 |
|------|------|
| [[philosophy/core-mission]] | Spring Boot 전문 개발 플러그인 미션 |
| [[philosophy/pdca-methodology]] | PDCA 6단계 + Check-Act 반복 루프 |
| [[philosophy/context-engineering]] | 훅/스킬/에이전트 계층 구조 |

## Components (컴포넌트)

| 노드 | 설명 |
|------|------|
| [[components/overview]] | 에이전트, 스킬, 훅 총괄 |

## Agents (에이전트)

| 이름 | 모델 | 역할 |
|------|------|------|
| domain-expert | sonnet | JPA Entity, Repository, DB 마이그레이션을 전문으로 다루는 도메인 계층 에이전트. |
| service-expert | sonnet | 비즈니스 로직, 트랜잭션 관리, 도메인 서비스를 전문으로 다루는 Service 계층 에이전트. |
| api-expert | sonnet | REST Controller, DTO, 예외 처리를 전문으로 다루는 API 계층 에이전트. |
| security-expert | opus | Spring Security, JWT, OAuth2, 인증/인가를 전문으로 다루는 보안 에이전트. |
| infra-expert | sonnet | Docker, Gradle, 설정 관리, CI/CD를 전문으로 다루는 인프라 에이전트. |
| test-expert | sonnet | 단위 테스트, 통합 테스트, 슬라이스 테스트를 전문으로 다루는 테스트 에이전트. |
| code-reviewer | opus | Spring Boot 프로젝트의 코드 리뷰를 수행하는 읽기 전용 에이전트. 파일 수정 없이 분석과 피드백만 제공. |
| spring-architect | opus | Spring Boot 3.5 애플리케이션의 전체 아키텍처를 설계하고 PDCA 워크플로우를 조율하는 최상위 설계 에이전트. |
| gap-detector | sonnet | PDCA Analyze 단계에서 설계 문서(design.md)와 실제 구현 코드 간의 Gap을 분석하고 Match Rate를 산출하는 에이전트. |
| pdca-iterator | sonnet | Match Rate가 90% 미만일 때 Gap을 자동으로 수정하여 Match Rate를 올리는 반복 개선 에이전트. |
| report-generator | haiku | PDCA 완료 보고서를 생성하는 경량 에이전트. |
| product-manager | sonnet | 요구사항 분석, 우선순위 결정, 사용자 스토리 작성을 전문으로 다루는 기획 에이전트. |
| dba-expert | sonnet | 데이터베이스 최적화, 인덱스 전략, N+1 문제 해결을 전문으로 다루는 DB 에이전트. |
| devops-engineer | sonnet | CI/CD 파이프라인, Docker 컨테이너화, Kubernetes 배포를 전문으로 다루는 인프라/배포 에이전트. |
| qa-monitor | haiku | 빌드 로그, 테스트 결과, 애플리케이션 로그를 분석하는 경량 QA 모니터링 에이전트. |

## Skills (스킬)

| 이름 | 설명 |
|------|------|
| /crud | CRUD 일괄 생성 |
| /entity | Entity 생성 |
| /service | Service 생성 |
| /controller | Controller 생성 |
| /repository | Repository 생성 |
| /dto | DTO 생성 |
| /exception | Exception 생성 |
| /test | 테스트 코드 생성 |
| /security | 보안 설정 |
| /docker | Docker 설정 |
| /gradle | Gradle 설정 |
| /pdca | PDCA 워크플로우 |
| /review | 코드 리뷰 |
| /loop | 자동 반복 실행 |
| /init | 프로젝트 초기화 |
| /commit | 커밋 |
| /push | 푸시 |
| /commit-push | 커밋+푸시 |
| /pr | PR 생성 |
| /help | 도움말 |
| /config | 설정 관리 |
| /properties | 프로퍼티 관리 |
| /migration | 마이그레이션 |
| /cache | 캐시 설정 |
| /erd | ERD 생성 |
| /optimize | 쿼리 최적화 |
| /changelog | 변경 로그 |
| /api-docs | API 문서 |
| /cancel-loop | Loop 취소 |
| /plan-plus | 브레인스토밍 강화 계획 |
| /pipeline | 9단계 개발 파이프라인 |
| /qa | Zero-Script QA |

## Hooks (훅)

| 이름 | 트리거 | 설명 |
|------|--------|------|
| SessionStart | 세션 시작 | 프로젝트 감지/초기화 |
| UserPromptSubmit | 프롬프트 제출 | 의도 분석/라우팅 |
| PreToolUse | 도구 사용 전 | 안전 검증 (Write/Edit, Bash) |
| PostToolUse | 도구 사용 후 | 결과 후처리 (Write/Edit, Bash, Skill) |
| Stop | 세션 종료 | 상태 저장/정리 |
| TaskCompleted | 태스크 완료 | 다음 작업 배정 |
| SubagentStart | 서브에이전트 시작 | 팀 멤버 등록 |
| SubagentStop | 서브에이전트 종료 | 팀 멤버 해제 |
| TeammateIdle | 팀원 유휴 | 다음 팀 작업 배정 |
| PreCompact | 컨텍스트 압축 전 | 컨텍스트 보존 |

## Triggers (트리거)

| 문서 | 설명 |
|------|------|
| [[triggers/trigger-matrix]] | 상황별 우선 명령/후속 조치 매트릭스 |
| [[triggers/priority-rules]] | hook/skill 충돌 시 우선순위 규칙 |
