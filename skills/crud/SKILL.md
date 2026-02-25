---
name: crud
description: 이 스킬은 사용자가 "CRUD 만들어줘", "crud 생성", "도메인 생성", "스캐폴딩"을 요청할 때 사용합니다. Entity, Repository, Service, Controller, DTO를 일괄 생성합니다.
---

# /crud - 도메인 CRUD 일괄 생성

> Spring Boot 3.5.10 + Java 21 모던 패턴 적용

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/crud — 도메인 CRUD 일괄 생성 (Entity, Repository, Service, Controller, DTO)

사용법:
  /crud {Name} [fields]

파라미터:
  Name    PascalCase 도메인명 (필수)
  fields  필드 목록 (선택, 형식: name:String, email:String)

예시:
  /crud User
  /crud User name:String, email:String, age:Integer
  /crud Order orderNumber:String, totalAmount:BigDecimal

관련 명령:
  /entity     — JPA Entity 생성
  /test       — 테스트 코드 생성
  /pdca plan  — PDCA 워크플로우 시작
```

## 실행 절차

### 1. 입력 검증
- domainName이 PascalCase인지 확인
- 프로젝트 base package가 감지되었는지 확인
- 이미 존재하는 도메인인지 확인

### 2. 필드 분석
> 컨벤션: `templates/shared/ask-user-convention.md` 참조

- fields가 제공된 경우 파싱
- fields가 없으면 **`AskUserQuestion` 도구**로 추가 옵션을 질문한다:
  - Q1 (header: "QueryDSL"): QueryDSL 동적 쿼리 포함 여부
    - `기본 CRUD만 (Recommended)` — JpaRepository 기본 메서드만 생성
    - `QueryDSL 포함` — 동적 검색/필터링 Custom Repository 함께 생성
  - Q2 (header: "Soft Delete"): 삭제 전략
    - `Hard Delete (Recommended)` — 실제 삭제
    - `Soft Delete` — deleted 플래그 사용, @SQLRestriction 적용
- 필드별 타입 → JPA 컬럼 타입 매핑

### 3. 파일 생성 (병렬 전략)

**Phase 1 — 기반 생성 (순차)**
BaseEntity, GlobalExceptionHandler가 없으면 먼저 생성한다.

**Phase 2 — 독립 레이어 병렬 생성**
다음 작업을 Task 도구로 **한 메시지에서 동시에 호출**한다:

| Task # | 담당 | 생성 파일 |
|--------|------|----------|
| Task 1 | domain-expert | Entity (`domain/{domainName}/entity/{DomainName}.java`), Repository (`domain/{domainName}/repository/{DomainName}Repository.java`) |
| Task 2 | api-expert | CreateRequest DTO (`domain/{domainName}/dto/Create{DomainName}Request.java`), UpdateRequest DTO (`domain/{domainName}/dto/Update{DomainName}Request.java`), Response DTO (`domain/{domainName}/dto/{DomainName}Response.java`) |
| Task 3 | (선택) QueryDSL | CustomRepository, Impl, SearchCondition, QuerydslConfig |

각 파일의 상세 규칙:

- **Entity**: BaseEntity 상속, @Entity, @Getter, @NoArgsConstructor(access = PROTECTED), @Builder private 생성자
- **Repository**: JpaRepository 상속, default 메서드 `getById()` 패턴
- **Request DTO**: 반드시 Java `record`, Bean Validation 어노테이션 직접 선언
- **Response DTO**: 반드시 Java `record`, `from()` 정적 메서드

**Phase 3 — 의존 레이어 병렬 생성**
Phase 2 완료 후, 다음 작업을 **한 메시지에서 동시에 호출**한다:

| Task # | 담당 | 생성 파일 |
|--------|------|----------|
| Task 1 | service-expert | Service (`domain/{domainName}/service/{DomainName}Service.java`) — @Service, @RequiredArgsConstructor, @Transactional |
| Task 2 | api-expert | Controller (`domain/{domainName}/controller/{DomainName}Controller.java`) — @RestController, REST 상태코드 매핑, @Valid |

### 4. QueryDSL Custom Repository (선택)
복잡한 검색/동적 쿼리가 필요한 경우 함께 생성:

- **Custom 인터페이스** (`domain/{domainName}/repository/{DomainName}RepositoryCustom.java`)
- **구현체** (`domain/{domainName}/repository/{DomainName}RepositoryImpl.java`)
  - `JPAQueryFactory` 주입
  - `BooleanExpression` 메서드 분리 (null 반환 → 동적 조건)
  - `Projections.constructor()` record DTO 프로젝션
  - `PageableExecutionUtils.getPage()` 페이징 최적화
- **검색 조건 DTO** (`domain/{domainName}/dto/{DomainName}SearchCondition.java`) (record)
- **QuerydslConfig** (`common/config/QuerydslConfig.java`) 미존재 시 자동 생성

### 5. 추가 자동 생성

- **GlobalExceptionHandler** 미존재 시 자동 생성:
  - `@RestControllerAdvice extends ResponseEntityExceptionHandler`
  - `ProblemDetail` (RFC 9457) 기반 에러 응답
  - `spring.mvc.problemdetails.enabled=true` 설정 안내

- **BaseEntity** 미존재 시 자동 생성:
  - `@MappedSuperclass`, `@EntityListeners(AuditingEntityListener.class)`
  - `@CreatedDate`, `@LastModifiedDate`

### 6. 생성 결과 출력
```
{DomainName} CRUD 스캐폴드 완료

생성된 파일:
  domain/{domainName}/entity/{DomainName}.java
  domain/{domainName}/repository/{DomainName}Repository.java
  domain/{domainName}/service/{DomainName}Service.java
  domain/{domainName}/controller/{DomainName}Controller.java
  domain/{domainName}/dto/Create{DomainName}Request.java  (record)
  domain/{domainName}/dto/Update{DomainName}Request.java   (record)
  domain/{domainName}/dto/{DomainName}Response.java         (record)

적용된 모던 패턴:
  - Java record DTO (불변, compact)
  - ProblemDetail 에러 응답 (RFC 9457)
  - Repository default 메서드 패턴
  - @Builder private 생성자

다음 단계:
  - 필드/관계 수정: 생성된 Entity 편집
  - 테스트 생성: /test {DomainName}
  - 전체 PDCA: /pdca plan {feature}
```

## 사용 예시
```
/crud User
/crud User name:String, email:String, age:Integer
/crud Order orderNumber:String, totalAmount:BigDecimal, status:OrderStatus
```

## 관련 Agent
- domain-expert (Entity 생성)
- api-expert (Controller/DTO 생성)
- service-expert (Service 생성)

## 관련 템플릿
- `templates/code/entity.template.java`
- `templates/code/repository.template.java`
- `templates/code/service.template.java`
- `templates/code/controller.template.java`
- `templates/code/dto.template.java`
