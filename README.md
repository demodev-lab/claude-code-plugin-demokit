# demokit v1.0.1

Spring Boot 백엔드 특화 Claude Code 플러그인. PDCA 방법론 기반의 체계적인 개발 워크플로우를 제공한다.

## 설치

### 방법 1: 마켓플레이스에서 설치 (권장)

Claude Code 대화창에서 다음 명령어를 순서대로 입력한다.

```
/plugin marketplace add demodev-lab/claude-code-plugin-demokit
/plugin install demokit@demodev-plugins
```

> **비공개 레포 인증**: 사전에 `gh auth login`으로 GitHub 인증이 필요하다. 자동 업데이트를 위해 `GITHUB_TOKEN` 환경변수 설정을 권장한다.

#### 팀 자동 배포

프로젝트의 `.claude/settings.json`에 추가하면 팀원이 프로젝트 폴더를 신뢰할 때 자동으로 마켓플레이스가 등록된다.

```json
{
  "extraKnownMarketplaces": {
    "demodev-plugins": {
      "source": {
        "source": "github",
        "repo": "demodev-lab/claude-code-plugin-demokit"
      }
    }
  },
  "enabledPlugins": {
    "demokit@demodev-plugins": true
  }
}
```

### 방법 2: 로컬 설치

```bash
git clone https://github.com/demodev-lab/claude-code-plugin-demokit.git
cd /path/to/my-spring-boot-project
claude --plugin-dir /path/to/claude-code-plugin-demokit
```

> **주의**: 플러그인 디렉토리가 아닌, 작업 대상 Spring Boot 프로젝트 디렉토리에서 실행해야 한다.

### 요구사항

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) >= 1.0.0
- Node.js (hooks/scripts 실행용)

## 빠른 시작

### 0. 도움말

```
/help
```

사용 가능한 전체 커맨드 목록을 카테고리별로 확인한다. 개별 커맨드의 상세 사용법은 `/{name} help`로 조회한다.

### 0-b. 한눈에 보는 핵심 커맨드

`/help` 기준으로 사용자 입장에서 자주 쓰는 명령어만 모아 정리했습니다.

| 구분 | 한눈에 보기 |
|---|---|
| 프로젝트 | `/init` |
| 도메인 CRUD | `/crud`, `/entity`, `/repository`, `/service`, `/controller`, `/dto` |
| 설정/인프라 | `/exception`, `/config`, `/security`, `/cache`, `/gradle`, `/docker`, `/api-docs`, `/migration` |
| 분석/리뷰 | `/test`, `/review`, `/erd`, `/optimize`, `/changelog`, `/properties` |
| 워크플로우 | `/pdca`, `/pipeline`, `/plan-plus`, `/loop`, `/cancel-loop`, `/qa` |
| Git | `/commit`, `/commit-push`, `/push`, `/pr` |

```
/crud help
/pdca help
```

### 1. 프로젝트 초기화

Spring Boot 프로젝트 디렉토리에서 Claude Code를 실행하고 `/init`을 입력한다.

```
/init
```

`build.gradle`을 분석하여 프로젝트 정보(Spring Boot 버전, Java 버전, 의존성, 패키지 구조)를 자동 감지한다.

### 2. 도메인 CRUD 일괄 생성

```
/crud User
```

User 도메인의 Entity, Repository, Service, Controller, DTO를 DRY 원칙에 따라 한 번에 생성한다.

### 3. 코드 리뷰

```
/review
```

9개 체크리스트(아키텍처, Entity, Repository, Service, Controller/DTO, 보안, Best Practices, DRY, 클린 코드/SRP) 기반으로 리뷰한다.

### 4. PDCA 기반 기능 개발

```
/pdca plan 회원관리
/pdca design 회원관리
/pdca do 회원관리
/pdca analyze 회원관리
```

설계 → 구현 → Gap 분석 → 자동 수정까지 체계적으로 진행한다.

### 5. 자율 반복 루프

```
/loop 테스트 전부 통과시켜줘
```

테스트가 모두 통과할 때까지 자동으로 수정-실행을 반복한다.

## 개요

- **기술 스택**: Spring Boot 3.5.10 + Java 21 + Gradle (Groovy/Kotlin DSL)
- **핵심 철학**: DRY 원칙, 클린 코드, SRP(단일 책임 원칙), Spring Boot 2025/2026 Best Practices
- **자동화**: 코드 생성 → 컨벤션 검증 → 코드 리뷰 → Gap 분석 → 자동 수정까지 전 과정 자동화
- **멀티에이전트**: CTO(spring-architect) 기반 팀 오케스트레이션, 16개 전문 에이전트

## 프로젝트 구조

```
demokit/
├── .claude-plugin/
│   ├── plugin.json            # 플러그인 메타데이터
│   └── marketplace.json       # 마켓플레이스 카탈로그
├── agents/                    # 16개 전문 에이전트
├── hooks/                     # 이벤트 훅 (세션 시작, 파일 검증 등)
├── lib/
│   ├── core/                  # 플랫폼, 설정, Permission, Skill Loader
│   ├── import/                # 에이전트 프롬프트 import/공유 컨텍스트
│   ├── intent/                # 사용자 의도 감지 (한/영)
│   ├── loop/                  # 자율 반복 루프
│   ├── memory/                # Agent Memory (프로젝트 수준)
│   ├── pdca/                  # PDCA 상태, Phase, 아카이브
│   ├── task/                  # 작업 분류, 컨텍스트, 체인 빌더
│   └── team/                  # 팀 오케스트레이션 (CTO 조율)
├── output-styles/             # 출력 스타일 (Monolith / MSA / PDCA)
├── scripts/                   # 훅 실행 스크립트
├── skills/                    # 33개 슬래시 커맨드 (+ skill.yaml 메타데이터)
├── demokit-system/            # 시스템 아키텍처 문서 (Obsidian 그래프 뷰)
├── templates/
│   ├── code/                  # 코드 생성 템플릿
│   └── shared/                # 공유 컨벤션 (spring-conventions, jpa/api/test-patterns)
└── demodev.config.json        # 프로젝트 설정, 권한, 팀, Best Practices
```

## Skills (슬래시 커맨드)

자주 쓰는 작업을 커맨드 하나로 실행한다. 모든 커맨드는 `/{name} help`로 상세 사용법을 확인할 수 있다.

### 도움말

| 커맨드 | 설명 |
|--------|------|
| `/help` | 전체 커맨드 목록을 카테고리별로 조회 |
| `/{name} help` | 개별 커맨드의 사용법, 파라미터, 옵션, 예시 조회 |

### 프로젝트

| 커맨드 | 사용법 | 설명 |
|--------|--------|------|
| `/init` | `/init [path]` | 프로젝트 감지 및 초기화 (구조 분석, 모던 패턴 체크) |

### 도메인 CRUD

| 커맨드 | 사용법 | 설명 |
|--------|--------|------|
| `/crud` | `/crud {Name} [fields]` | Entity, Repository, Service, Controller, DTO 일괄 생성 |
| `/entity` | `/entity {Name} [fields]` | JPA Entity 생성 (BaseEntity 상속, `create()`/`update()`) |
| `/repository` | `/repository {Name} [--querydsl]` | Repository 생성 (default `getById()`, QueryDSL 선택) |
| `/service` | `/service {Name}` | Service 생성 (CRUD 메서드, DRY 패턴) |
| `/controller` | `/controller {Name}` | REST Controller 생성 (POST→201, DELETE→204) |
| `/dto` | `/dto {Name} [fields]` | Request/Response DTO 생성 (`record` 필수) |

### 설정/인프라

| 커맨드 | 사용법 | 설명 |
|--------|--------|------|
| `/exception` | `/exception {Name}` | 도메인 예외 + GlobalExceptionHandler (ProblemDetail) |
| `/config` | `/config {type[,type2]}` | Spring 설정 클래스 생성 (jpa, web, cache, querydsl, webclient, properties) |
| `/security` | `/security [jwt\|oauth2]` | Spring Security 설정 (JWT 기본, OAuth2 선택) |
| `/cache` | `/cache [caffeine\|redis]` | 캐시 설정 생성 (Caffeine 기본, Redis 선택) |
| `/gradle` | `/gradle {action} [dependency]` | Gradle 의존성 관리 (add, remove, check, update) |
| `/docker` | `/docker` | Dockerfile + docker-compose.yml 생성 |
| `/api-docs` | `/api-docs` | SpringDoc/Swagger API 문서화 설정 생성 |
| `/migration` | `/migration {desc} [--type flyway\|liquibase]` | DB 마이그레이션 파일 생성 (Flyway 기본) |

### 분석/리뷰

| 커맨드 | 사용법 | 설명 |
|--------|--------|------|
| `/test` | `/test {Name} [unit\|integration\|controller\|all]` | 테스트 코드 생성 (all 기본) |
| `/review` | `/review [target]` | 읽기 전용 코드 리뷰 (파일경로, 도메인명, all) |
| `/erd` | `/erd [domain]` | Mermaid ERD 다이어그램 생성 |
| `/optimize` | `/optimize [target] [--fix]` | N+1, 인덱스, 트랜잭션 등 성능 최적화 분석 |
| `/changelog` | `/changelog [range]` | Git 이력 기반 CHANGELOG 생성 |
| `/properties` | `/properties [action] [profile]` | application.yml 설정 분석/생성/프로파일 관리 |

### PDCA 워크플로우

| 커맨드 | 사용법 | 설명 |
|--------|--------|------|
| `/pdca plan` | `/pdca plan {feature}` | 요구사항 정의 + API/Entity 초안 |
| `/pdca design` | `/pdca design {feature}` | DB 스키마 상세 + API 상세 + 패키지 구조 |
| `/pdca do` | `/pdca do {feature}` | Entity → Repo → Service → Controller → DTO → Test 구현 |
| `/pdca analyze` | `/pdca analyze {feature}` | 설계-구현 Gap 분석 + Match Rate 산출 |
| `/pdca iterate` | `/pdca iterate {feature}` | Match Rate < 90% 시 자동 수정 반복 (최대 5회) |
| `/pdca report` | `/pdca report {feature}` | 완료 보고서 생성 |
| `/pdca status` | `/pdca status` | 현재 PDCA 상태 조회 |
| `/pdca next` | `/pdca next` | 다음 단계 안내 |
| `/pdca archive` | `/pdca archive {feature}` | 완료된 feature 아카이브 |
| `/pdca cleanup` | `/pdca cleanup` | 완료된 모든 feature 일괄 아카이브 |

### Git

| 커맨드 | 사용법 | 설명 |
|--------|--------|------|
| `/commit` | `/commit [message]` | 변경사항을 논리적 단위로 스마트 커밋 |
| `/commit-push` | `/commit-push [message]` | 커밋 후 원격 저장소에 푸시 |
| `/push` | `/push` | 현재 브랜치를 원격 저장소에 푸시 |
| `/pr` | `/pr [title]` | Pull Request 생성 (dev 브랜치 기준) |

### 고급 워크플로우

| 커맨드 | 사용법 | 설명 |
|--------|--------|------|
| `/pipeline` | `/pipeline {feature}` | Spring Boot 9단계 개발 파이프라인 (init→plan→design→do→analyze→iterate→test→review→report) |
| `/plan-plus` | `/plan-plus {feature}` | 6단계 브레인스토밍 강화 계획 수립 |
| `/qa` | `/qa [build\|test\|log]` | Zero-Script QA — 빌드/테스트/로그 기반 품질 분석 |
| `/loop` | `/loop {prompt} [--max-iterations N]` | 작업 완료까지 자동 반복 실행 |
| `/cancel-loop` | `/cancel-loop` | 활성화된 자율 반복 루프 즉시 취소 |

## Agents (전문 에이전트)

작업 유형에 따라 자동으로 전문 에이전트가 할당된다. 설계/구현/분석 등 품질이 중요한 작업은 **opus**, 패턴 기반 경량 작업은 **sonnet**, 포맷팅 중심 작업은 **haiku**를 사용한다.

| 에이전트 | 모델 | 역할 |
|----------|------|------|
| spring-architect | **opus** | 시스템 아키텍처 설계, PDCA Plan/Design, CTO (팀 모드) |
| domain-expert | **opus** | JPA Entity, Repository, QueryDSL, ERD |
| api-expert | **opus** | REST Controller, DTO, 예외 처리 |
| service-expert | **opus** | 비즈니스 로직, 트랜잭션 관리 |
| security-expert | **opus** | Spring Security, JWT, OAuth2 |
| test-expert | **opus** | 단위/통합/슬라이스 테스트 |
| code-reviewer | **opus** | 읽기 전용 코드 리뷰 (9개 체크리스트) |
| gap-detector | **opus** | PDCA Analyze - 설계-구현 Gap 분석 |
| pdca-iterator | **opus** | Match Rate < 90% 시 자동 Gap 수정 반복 |
| dba-expert | **opus** | DB 최적화, 인덱스 전략, N+1 해결 |
| product-manager | sonnet | 요구사항 분석, 우선순위 결정, 사용자 스토리 |
| devops-engineer | sonnet | CI/CD 파이프라인, Docker, Kubernetes 배포 |
| infra-expert | sonnet | Docker, Gradle, 설정 관리 |
| report-generator | haiku | PDCA 완료 보고서 생성 |
| qa-monitor | haiku | 빌드/테스트/애플리케이션 로그 QA 모니터링 |

## 코드 생성 원칙

### DRY (Don't Repeat Yourself)

모든 지식은 시스템 내에서 **단 하나의 명확한 표현**을 가진다.

| 패턴 | 설명 |
|------|------|
| `BaseEntity` 상속 | `createdAt`/`updatedAt` 단일 정의 |
| `Entity.create()` | 생성 로직 Entity 내부 단일 정의 |
| `Entity.update()` | 수정 로직 Entity 내부 캡슐화 |
| `Repository.getById()` | 조회+예외 로직 단일 정의 (default 메서드) |
| `Response.from()` | Entity→DTO 변환 단일 정의 |
| `GlobalExceptionHandler` | 예외→HTTP 응답 매핑 단일 정의 |
| `ProblemDetail` | RFC 9457 표준 에러 응답 (커스텀 에러 객체 금지) |

### 클린 코드 / SRP

| 규칙 | 설명 |
|------|------|
| 메서드 단일 책임 | 하나의 메서드는 하나의 작업만 수행, 15줄 이내 권장 |
| 의도 드러내기 | 메서드/변수명만으로 의도 파악 가능 (주석 의존 최소화) |
| 중첩 최소화 | depth 2단계 이내, 깊어지면 early return 또는 메서드 추출 |
| 매직 값 금지 | 매직 넘버/문자열 → 상수 또는 Enum |
| 죽은 코드 제거 | 불필요한 주석, 사용하지 않는 코드 즉시 제거 |

**SRP 레이어별 책임:**

| 레이어 | 책임 |
|--------|------|
| Controller | HTTP 요청/응답 처리만 (비즈니스 로직 금지) |
| Service | 비즈니스 로직만 (HTTP, 영속성 세부사항 분리) |
| Repository | 데이터 접근만 |
| Entity | 도메인 규칙 + 자기 자신의 상태 관리만 |
| DTO | 데이터 전달만 (변환용 `from()` 팩토리는 허용) |
| Config | 설정만 (비즈니스 로직 금지) |

### Spring Boot 3.5 Best Practices (2025/2026)

| 기능 | Best Practice |
|------|---------------|
| DTO | `record` (불변, compact, Bean Validation 직접 선언) |
| 에러 응답 | `ProblemDetail` (RFC 9457) |
| HTTP 클라이언트 | `WebClient` (RestTemplate/RestClient 사용 금지) |
| Virtual Threads | `spring.threads.virtual.enabled=true` |
| 테스트 Mock | `@MockitoBean` (`@MockBean` deprecated, 3.4+) |
| Soft Delete | `@SQLRestriction` / `@SoftDelete` (`@Where` deprecated, 6.3+) |
| 설정 바인딩 | `@ConfigurationProperties record` (불변) |
| Logging | Structured Logging JSON (3.4+) |
| Repository | `ListCrudRepository` + default 메서드 |
| QueryDSL | OpenFeign fork `io.github.openfeign.querydsl:6.12` |

## PDCA 워크플로우

설계-구현 Gap을 자동으로 감지하고 수정하는 반복 워크플로우.

```
Plan → Design → Do → Analyze → Iterate (반복) → Report
                                  ↑         |
                                  └─────────┘
                              Match Rate < 90% 시 재반복
```

**Match Rate 가중치:**

| 항목 | 비중 |
|------|------|
| API Endpoints | 30% |
| DB Schema | 25% |
| DTO Fields | 15% |
| Error Handling | 15% |
| Business Rules | 15% |

- 목표 Match Rate: **90% 이상**
- 최대 반복 횟수: **5회**
- 산출물은 `.pdca/` 디렉토리에 저장
- 완료된 feature는 `/pdca archive`로 아카이브 (`.pdca/_archive/`로 이동)

## 팀 모드 (Team Orchestration)

PDCA 워크플로우에서 **spring-architect(CTO)**가 전문 에이전트를 조율하는 멀티에이전트 오케스트레이션.

| Phase | 패턴 | Lead | Members |
|-------|------|------|---------|
| Plan | leader | spring-architect | domain-expert |
| Design | leader | spring-architect | api-expert, domain-expert |
| Do | swarm | — | domain-expert, service-expert, api-expert |
| Analyze | council | — | gap-detector, code-reviewer, test-expert |
| Iterate | leader | — | pdca-iterator |
| Report | leader | — | report-generator |

**오케스트레이션 패턴:**

- **leader**: Lead가 작업을 분배하고 결과를 통합
- **council**: 멤버가 독립적으로 분석 후 결과를 종합
- **swarm**: 의존성 순서에 따라 병렬/순차 분배

팀 상태는 세션 간에 영속화되어, 중단 후 재개 시 이전 상태를 복원할 수 있다.

### 팀 정리 정책(권장 운영값)

- `team.cleanup.staleMemberMs`: 마지막 활동 기준으로 오래된 멤버를 정리하는 시간(밀리초). 기본값 `1800000`(30분)
- `team.cleanup.clearTeamStateOnStopMode`
  - `always`: 세션 완전 종료 시 팀 상태를 즉시 초기화
  - `if_no_live`: active/working/idle 멤버가 없을 때만 초기화
  - `never`: 초기화 안 함
- `team.cleanup.pruneMembersOnStop`: true면 완전 종료 시 미작업 멤버(`paused`/`idle`/`failed` 등) 제거
- `team.cleanup.forceClearOnStop`, `team.cleanup.clearOnStop`: 하위 호환용 강제 정리 플래그

※ `clearTeamStateOnStop`(구버전 키)는 `clearTeamStateOnStopMode`로 정규화되어 처리됩니다.

## Context Engineering

에이전트에게 정확한 컨텍스트를 전달하기 위한 시스템.

### Import 시스템

에이전트 `.md` 파일에 `## imports` 섹션을 선언하면, 해당 공유 템플릿이 에이전트 프롬프트에 자동 주입된다.

```markdown
## imports
- ${PLUGIN_ROOT}/templates/shared/spring-conventions.md
- ${PLUGIN_ROOT}/templates/shared/jpa-patterns.md
```

Import 해석 규칙:
- `${...}` 변수 치환 후 상대 경로는 `fromFile` 기준 + `PROJECT_ROOT` + `PLUGIN_ROOT` + `cwd` 순으로 시도
- 상대 경로에 확장자가 없으면 `.md`, `.markdown`를 보조로 확인
- 외부 테스트/임시 프로젝트에서는 `process.cwd`가 바뀌어도 `fromFile` 기반 후보가 있으면 경로가 복원됩니다.

### Agent Memory

프로젝트 수준의 메모리를 자동으로 저장/조회한다. Entity 생성 시 도메인 정보, API 변경 시 엔드포인트 정보 등이 자동 기록되어 세션 시작 시 요약이 주입된다.

### Skill Metadata (skill.yaml)

각 스킬에 `skill.yaml` 메타데이터를 정의하여 next-skill 체인과 argument-hint를 제공한다. 작업 완료 시 다음 스킬을 자동 제안한다.

### Permission Hierarchy

`demodev.config.json`의 `permissions` 섹션에서 도구별 권한을 3단계(deny/ask/allow)로 관리한다. Hook에서 실행 전 자동 검증되어 위험 명령은 차단, 민감 파일 수정은 경고를 표시한다.

## Hooks (자동화)

파일 작성, 명령 실행 등 이벤트에 반응하여 자동으로 검증/제안을 수행한다.

| 이벤트 | 동작 |
|--------|------|
| Session Start | 프로젝트 분석, 팀 상태 복원, Agent Memory 요약 주입 |
| Pre Write/Edit | Permission Hierarchy 검증 + Java 컨벤션 검증 (네이밍, 패키지, 어노테이션, 금지 패턴) |
| Post Write/Edit | 관련 파일 생성 제안 |
| Pre Bash | Permission Hierarchy 기반 차단/경고 (deny→block, ask→경고) + 추가 휴리스틱 |
| Post Bash | 빌드/테스트 결과 파싱 및 에러 요약 |
| User Prompt | 의도 감지 (한/영) → Skill 자동 트리거 + 작업 규모 분류 → PDCA 제안 |
| Stop | Loop 종료 가로채기, 팀 상태 영속화 (active → paused) |
| Task Completed | Memory 자동 저장, next-skill 체인 제안, 팀 작업 할당, PDCA 안내 |
| Context Compaction | PDCA/Loop 상태 보존 |

## Output Styles

프로젝트 유형에 따라 자동으로 출력 스타일이 결정된다.

| 스타일 | 적용 조건 |
|--------|-----------|
| `demodev-monolith` | 단일 모듈, 단일 데이터베이스 구조 |
| `demodev-msa` | 멀티모듈 구조, Spring Cloud 의존성 존재 |
| `demodev-pdca-guide` | PDCA 워크플로우 Phase별 응답 형식 |

## 사용 예시

### 도움말 확인

```bash
/help                  # 전체 커맨드 목록
/crud help             # /crud 사용법, 파라미터, 예시
/pdca help             # /pdca 하위 명령 목록
/loop help             # /loop 옵션 설명
```

### 프로젝트 초기화

```bash
/init                  # 현재 디렉토리의 Spring Boot 프로젝트 분석
/init ./backend        # 특정 경로 지정
```

### 도메인 CRUD 생성

```bash
/crud User                                          # 필드를 대화형으로 입력
/crud User name:String, email:String, age:Integer   # 필드 직접 지정
/entity User name:String, email:String              # Entity만 생성
/repository User --querydsl                         # QueryDSL 포함
/test User unit                                     # 단위 테스트만 생성
```

### 설정/인프라

```bash
/config jpa,web,cache          # 여러 설정 동시 생성
/security jwt                  # JWT 인증 설정
/cache redis                   # Redis 캐시 설정
/gradle add spring-boot-starter-validation
/docker                        # Dockerfile + docker-compose.yml
/migration create_users_table  # Flyway 마이그레이션
```

### PDCA 기반 기능 개발

```bash
/pdca plan 회원관리       # 요구사항 정의 + API/Entity 초안
/pdca design 회원관리     # DB 스키마 + API 상세 설계
/pdca do 회원관리         # 코드 구현
/pdca analyze 회원관리    # 설계-구현 Gap 분석
/pdca iterate 회원관리    # Match Rate < 90% 시 자동 수정
/pdca report 회원관리     # 완료 보고서
/pdca status              # 전체 PDCA 상태 조회
/pdca next                # 다음 단계 안내
/pdca archive 회원관리    # 완료된 feature 아카이브
/pdca cleanup             # 완료된 모든 feature 일괄 아카이브
```

### 코드 리뷰

```bash
/review                # 전체 프로젝트 리뷰
/review User           # User 도메인만 리뷰
/review src/main/java/com/example/domain/user/  # 특정 경로
```

### 자율 반복 루프

```bash
/loop 테스트 전부 통과시켜줘
/loop Order API 전체 구현 --max-iterations 30
/loop 인증 시스템 구현 --completion-promise "AUTH_COMPLETE"
/cancel-loop           # 루프 즉시 취소
```

### Git 운영

```bash
/commit                              # 논리적 그룹별 자동 분류 커밋
/commit "feat: User 엔티티 추가"     # 메시지 직접 지정
/commit-push                         # 커밋 + 푸시
/push                                # 원격 푸시
/pr                                  # PR 자동 생성
/pr "feat: User 도메인 CRUD 구현"    # PR 제목 지정
```

## 패키지 구조

도메인 기반 패키지 구조(Package by Feature)를 따른다.

```
{basePackage}/
├── common/
│   ├── config/           # 설정 클래스
│   ├── domain/           # BaseEntity
│   ├── exception/        # GlobalExceptionHandler
│   └── security/         # SecurityConfig
└── domain/
    └── {domainName}/
        ├── controller/
        ├── dto/          # record
        ├── entity/
        ├── repository/
        └── service/
```

## 변경 이력

### v1.0.1 (2026-02-18)

**신규 기능**
- 에이전트 4종 추가: `dba-expert`, `devops-engineer`, `product-manager`, `qa-monitor`
- 스킬 3종 추가: `/pipeline` (9단계 개발 파이프라인), `/plan-plus` (브레인스토밍 강화 계획), `/qa` (Zero-Script QA)
- `demokit-system/` 시스템 아키텍처 문서 추가

**버그 수정 (27건)**
- Race condition 방지를 위한 `withFileLock` 유틸리티 도입
- PDCA iterate→report 탈출 조건 누락 수정
- Gradle 파서 regex→brace-depth 블록 추출로 안정성 향상
- Convention checker RestClient 오탐 방지, N+1 per-annotation 검사
- Task ID 충돌 방지, chain-builder iterate phase 누락 수정
- Context-fork conflict 감지, context-hierarchy 중복 항목 방지
- Stop handler, post-bash 등 스크립트 로직 수정
- 기타 TOCTOU race, atomic write, null guard 등 안정성 개선

### v1.0.0

- 최초 릴리즈

## 라이선스

MIT
