---
name: crud
description: 도메인 CRUD 일괄 생성 (Entity, Repository, Service, Controller, DTO)
user_invocable: true
arguments:
  - name: domainName
    description: 도메인명 (PascalCase, 예: User, Order, Product)
    required: true
  - name: fields
    description: "필드 정의 (예: 'name:String, email:String, age:Integer')"
    required: false
---

# /crud - 도메인 CRUD 일괄 생성

> Spring Boot 3.5.10 + Java 21 모던 패턴 적용

## 실행 절차

### 1. 입력 검증
- domainName이 PascalCase인지 확인
- 프로젝트 base package가 감지되었는지 확인
- 이미 존재하는 도메인인지 확인

### 2. 필드 분석
- fields가 제공된 경우 파싱
- fields가 없으면 사용자에게 필드 입력 요청
- 필드별 타입 → JPA 컬럼 타입 매핑

### 3. 파일 생성 순서
아래 순서로 6개 파일을 생성:

모든 파일은 `domain/{domainName}/` 하위에 레이어별 패키지로 생성:

1. **Entity** (`domain/{domainName}/entity/{DomainName}.java`)
   - BaseEntity 상속 (createdAt, updatedAt)
   - @Entity, @Getter, @NoArgsConstructor(access = PROTECTED)
   - 필드별 @Column 매핑
   - `@Builder` private 생성자에 적용

2. **Repository** (`domain/{domainName}/repository/{DomainName}Repository.java`)
   - JpaRepository<{DomainName}, Long> 상속
   - `@Repository` 어노테이션 불필요
   - default 메서드로 `getById()` 패턴 제공
   - Interface-based Projection 주석으로 가이드

3. **Service** (`domain/{domainName}/service/{DomainName}Service.java`)
   - @Service, @RequiredArgsConstructor
   - 조회 메서드에 `@Transactional(readOnly = true)`
   - 변경 메서드에 `@Transactional`
   - CRUD: create, findById, findAll(Pageable), update, delete
   - record DTO 사용

4. **Controller** (`domain/{domainName}/controller/{DomainName}Controller.java`)
   - @RestController, @RequestMapping("/api/v1/{domains}")
   - POST → 201 Created + Location header
   - GET → 200 (직접 반환, ResponseEntity 미사용)
   - PUT → 200 (직접 반환)
   - DELETE → 204 No Content
   - `@Valid` record DTO 검증

5. **Request DTO** (`domain/{domainName}/dto/Create{DomainName}Request.java`, `Update{DomainName}Request.java`)
   - **반드시 Java `record`** 사용
   - Bean Validation 어노테이션 직접 선언
   ```java
   public record CreateUserRequest(
       @NotBlank String name,
       @Email @NotBlank String email
   ) {}
   ```

6. **Response DTO** (`domain/{domainName}/dto/{DomainName}Response.java`)
   - **반드시 Java `record`** 사용
   - Entity → Response 변환 정적 메서드 `from()`
   ```java
   public record UserResponse(Long id, String name, String email, LocalDateTime createdAt) {
       public static UserResponse from(User user) {
           return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
       }
   }
   ```

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
