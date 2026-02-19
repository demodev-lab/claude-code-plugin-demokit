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
| spring-architect | opus | 아키텍처 설계 |
| domain-expert | sonnet | JPA Entity/Repository |
| service-expert | sonnet | Service 비즈니스 로직 |
| api-expert | sonnet | Controller/DTO/API |
| security-expert | opus | 보안 설정 |
| infra-expert | sonnet | Docker/Gradle/설정 |
| test-expert | sonnet | 테스트 코드 |
| code-reviewer | opus | 코드 리뷰 |
| gap-detector | sonnet | Gap 분석 |
| pdca-iterator | sonnet | PDCA 반복 수정 |
| report-generator | haiku | 보고서 생성 |
| product-manager | sonnet | 요구사항 분석 |
| dba-expert | sonnet | DB 최적화 |
| devops-engineer | sonnet | CI/CD/배포 |
| qa-monitor | haiku | QA 모니터링 |

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
