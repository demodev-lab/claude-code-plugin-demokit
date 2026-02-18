# Context Engineering

## 개요

demokit은 3계층 구조로 컨텍스트를 관리한다:

```
Hooks (자동 트리거)
  ↓ 컨텍스트 주입
Skills (사용자 명령)
  ↓ 에이전트 호출
Agents (전문 실행)
```

## 계층 구조

### Layer 1: Hooks (자동 트리거)

훅은 Claude Code의 이벤트에 반응하여 자동 실행된다. 사용자 개입 없이 프로젝트 컨텍스트를 수집/주입한다.

| 훅 | 역할 |
|------|------|
| SessionStart | 프로젝트 감지, 레벨 판별, 캐시 초기화 |
| UserPromptSubmit | 의도 분석, 모호성 감지, 에이전트 라우팅 |
| PreToolUse | 안전 검증 (위험 명령 차단) |
| PostToolUse | 결과 후처리 (파일 추적) |
| SubagentStart | 서브에이전트별 컨텍스트 주입 |
| SubagentStop | 상태 정리, 메모리 저장 |

### Layer 2: Skills (사용자 명령)

스킬은 `/명령어` 형태로 사용자가 직접 호출한다. 복잡한 워크플로우를 단일 명령으로 실행한다.

**카테고리:**
- **코드 생성**: /crud, /entity, /service, /controller, /repository, /dto, /exception
- **워크플로우**: /pdca, /loop, /plan-plus, /pipeline
- **분석**: /review, /qa, /optimize, /erd
- **인프라**: /docker, /gradle, /security, /config, /properties, /migration, /cache
- **Git**: /commit, /push, /commit-push, /pr, /changelog
- **기타**: /init, /help, /api-docs, /cancel-loop

### Layer 3: Agents (전문 실행)

에이전트는 특정 영역의 전문 지식을 가진 AI 워커다. 스킬이나 훅에 의해 호출되며, 도구(Read, Write, Bash 등)를 사용하여 실제 작업을 수행한다.

**모델 배정:**
- **opus** (10개): 복잡한 설계/구현 — domain-expert, service-expert, api-expert, security-expert, test-expert, code-reviewer, spring-architect, gap-detector, pdca-iterator, dba-expert
- **sonnet** (3개): 일반 작업 — infra-expert, product-manager, devops-engineer
- **haiku** (2개): 경량 작업 — report-generator, qa-monitor

## 컨텍스트 흐름

```
사용자 프롬프트
  → prompt-submit (모호성 점수 계산)
    → score < 0.5: 직접 실행
    → score >= 0.5: 명확화 질문
  → 스킬 매칭 (/명령어)
    → 에이전트 호출
      → agent-start (shared patterns 주입)
      → 작업 실행
      → agent-stop (메모리 저장)
```

## Shared Patterns

에이전트 간 공유되는 지식 파일:
- `spring-conventions.md` — Spring Boot 컨벤션
- `jpa-patterns.md` — JPA 패턴
- `api-patterns.md` — REST API 패턴
- `test-patterns.md` — 테스트 패턴

## 관련 문서
- [[core-mission]] — 핵심 미션
- [[pdca-methodology]] — PDCA 방법론
- [[../components/overview]] — 컴포넌트 총괄
