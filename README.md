# demodev-be

Spring Boot 백엔드 특화 Claude Code 플러그인. PDCA 방법론 기반의 체계적인 개발 워크플로우를 제공한다.

## 설치

플러그인 저장소를 클론한 뒤 `--plugin-dir` 옵션으로 로드한다.

```bash
git clone https://github.com/demodev-lab/claude-code-plugin-be.git
claude --plugin-dir /path/to/claude-code-plugin-be
```

### 요구사항

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) >= 1.0.0
- Node.js (hooks/scripts 실행용)

## 빠른 시작

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

- **기술 스택**: Spring Boot 3.5.10 + Java 21 + Gradle (Groovy DSL)
- **핵심 철학**: DRY 원칙, 클린 코드, SRP(단일 책임 원칙), Spring Boot 2025/2026 Best Practices
- **자동화**: 코드 생성 → 컨벤션 검증 → 코드 리뷰 → Gap 분석 → 자동 수정까지 전 과정 자동화

## 프로젝트 구조

```
demodev-be/
├── .claude-plugin/
│   └── plugin.json            # 플러그인 메타데이터
├── agents/                    # 11개 전문 에이전트
├── hooks/                     # 이벤트 훅 (세션 시작, 파일 검증 등)
├── lib/                       # 핵심 라이브러리 모듈
├── output-styles/             # 출력 스타일 (Monolith / MSA / PDCA)
├── scripts/                   # 훅 실행 스크립트
├── skills/                    # 24개 슬래시 커맨드
├── templates/                 # 코드 및 문서 템플릿
└── demodev.config.json        # 프로젝트 설정 및 Best Practices
```

## Skills (슬래시 커맨드)

자주 쓰는 작업을 커맨드 하나로 실행한다.

### 코드 생성

| 커맨드 | 설명 |
|--------|------|
| `/crud {Domain}` | Entity, Repository, Service, Controller, DTO 일괄 생성 |
| `/entity {Domain}` | JPA Entity 생성 (BaseEntity 상속, `create()`/`update()`) |
| `/repository {Domain}` | Repository 생성 (default `getById()`, QueryDSL 선택) |
| `/service {Domain}` | Service 생성 (CRUD 메서드, DRY 패턴) |
| `/controller {Domain}` | REST Controller 생성 (POST→201, DELETE→204) |
| `/dto {Domain}` | Request/Response DTO 생성 (`record` 필수) |
| `/exception {Domain}` | 도메인 예외 + GlobalExceptionHandler (ProblemDetail) |

### 설정/인프라

| 커맨드 | 설명 |
|--------|------|
| `/init` | 프로젝트 감지 및 초기화 (구조 분석, 모던 패턴 체크) |
| `/config {type}` | Spring 설정 클래스 생성 (JPA, Web, Cache, QueryDSL 등) |
| `/security {type}` | Spring Security 설정 (JWT / OAuth2) |
| `/gradle {action}` | Gradle 의존성 관리 (add, remove, check, update) |
| `/docker` | Dockerfile + docker-compose.yml 생성 |
| `/cache {type}` | 캐시 설정 생성 |
| `/migration` | DB 마이그레이션 설정 |

### 품질 관리

| 커맨드 | 설명 |
|--------|------|
| `/test {Domain}` | 테스트 코드 생성 (unit, integration, controller) |
| `/review` | 읽기 전용 코드 리뷰 (9개 체크리스트) |
| `/api-docs` | API 문서 생성 |

### PDCA 워크플로우

| 커맨드 | 설명 |
|--------|------|
| `/pdca plan {feature}` | 요구사항 정의 + API/Entity 초안 |
| `/pdca design {feature}` | DB 스키마 상세 + API 상세 + 패키지 구조 |
| `/pdca do {feature}` | Entity → Repo → Service → Controller → DTO → Test 구현 |
| `/pdca analyze {feature}` | 설계-구현 Gap 분석 + Match Rate 산출 |
| `/pdca iterate {feature}` | Match Rate < 90% 시 자동 수정 반복 (최대 5회) |
| `/pdca report {feature}` | 완료 보고서 생성 |
| `/pdca status` | 현재 PDCA 상태 조회 |
| `/pdca next` | 다음 단계 안내 |

### Git 운영

| 커맨드 | 설명 |
|--------|------|
| `/commit` | 변경사항 커밋 |
| `/push` | 원격 푸시 |
| `/commit-push` | 커밋 + 푸시 |
| `/pr` | Pull Request 생성 |

### 자율 반복

| 커맨드 | 설명 |
|--------|------|
| `/loop` | 자율 반복 루프 (완료 또는 max-iterations까지 반복) |
| `/cancel-loop` | 루프 즉시 취소 |

## Agents (전문 에이전트)

작업 유형에 따라 자동으로 전문 에이전트가 할당된다.

| 에이전트 | 모델 | 역할 |
|----------|------|------|
| spring-architect | opus | 시스템 아키텍처 설계, PDCA Plan/Design 문서 작성 |
| domain-expert | sonnet | JPA Entity, Repository, QueryDSL |
| api-expert | sonnet | REST Controller, DTO, 예외 처리 |
| service-expert | sonnet | 비즈니스 로직, 트랜잭션 관리 |
| security-expert | opus | Spring Security, JWT, OAuth2 |
| infra-expert | sonnet | Docker, Gradle, 설정 관리 |
| test-expert | sonnet | 단위/통합/슬라이스 테스트 |
| code-reviewer | sonnet | 읽기 전용 코드 리뷰 (9개 체크리스트) |
| gap-detector | opus | PDCA Analyze - 설계-구현 Gap 분석 |
| pdca-iterator | sonnet | Match Rate < 90% 시 자동 Gap 수정 반복 |
| report-generator | haiku | PDCA 완료 보고서 생성 |

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

## Hooks (자동화)

파일 작성, 명령 실행 등 이벤트에 반응하여 자동으로 검증/제안을 수행한다.

| 이벤트 | 동작 |
|--------|------|
| Session Start | 프로젝트 분석 (build.gradle 파싱, 레벨 감지, PDCA 상태 로드) |
| Pre Write/Edit | Java 컨벤션 검증 (네이밍, 패키지 위치, 필수 어노테이션, 금지 패턴) |
| Post Write/Edit | 관련 파일 생성 제안 |
| Pre Bash | 위험 명령 경고 |
| Post Bash | 빌드/테스트 결과 파싱 및 에러 요약 |
| User Prompt | 의도 감지 → Skill 자동 트리거 ("엔티티 만들어줘" → `/entity`) |
| Stop | Loop 활성 시 종료 가로채기 → 작업 계속 |
| Context Compaction | PDCA/Loop 상태 보존 |

## Output Styles

프로젝트 유형에 따라 자동으로 출력 스타일이 결정된다.

| 스타일 | 적용 조건 |
|--------|-----------|
| `demodev-monolith` | 단일 모듈, 단일 데이터베이스 구조 |
| `demodev-msa` | 멀티모듈 구조, Spring Cloud 의존성 존재 |
| `demodev-pdca-guide` | PDCA 워크플로우 Phase별 응답 형식 |

## 사용 예시

### 1. 프로젝트 초기화

```
/init
```

build.gradle을 분석하여 프로젝트 정보(버전, 의존성, 패키지 구조)를 자동 감지한다.

### 2. 도메인 CRUD 일괄 생성

```
/crud User
```

User 도메인의 Entity, Repository, Service, Controller, DTO를 한 번에 생성한다.

### 3. PDCA 기반 기능 개발

```
/pdca plan 회원관리
/pdca design 회원관리
/pdca do 회원관리
/pdca analyze 회원관리
/pdca iterate 회원관리
/pdca report 회원관리
```

### 4. 코드 리뷰

```
/review
```

9개 체크리스트(아키텍처, Entity, Repository, Service, Controller/DTO, 보안, Best Practices, DRY, 클린 코드/SRP)를 기반으로 리뷰한다.

### 5. 자율 반복 루프

```
/loop 테스트 전부 통과시켜줘
```

테스트가 모두 통과할 때까지 자동으로 수정-실행을 반복한다.

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

## 라이선스

MIT
