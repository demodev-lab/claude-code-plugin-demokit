# demodev-monolith Output Style

> Spring Boot 3.5.10 + Java 21 + Gradle (Groovy DSL)

## 적용 조건
- 프로젝트 레벨이 Monolith로 감지된 경우
- 단일 모듈, 단일 데이터베이스 구조

## 응답 스타일

### 패키지 구조 안내
도메인 기반 패키지 구조를 따른다 (Package by Feature):

```
{basePackage}/
├── common/                          # 공통 모듈
│   ├── config/                      # 설정 클래스
│   │   ├── JpaAuditingConfig.java
│   │   └── WebClientConfig.java
│   ├── domain/                      # 공통 도메인
│   │   └── BaseEntity.java
│   ├── exception/                   # 전역 예외 처리
│   │   └── GlobalExceptionHandler.java
│   └── security/                    # Spring Security 설정
│       └── SecurityConfig.java
└── domain/                          # 비즈니스 도메인
    ├── user/                        # User 도메인
    │   ├── controller/
    │   │   └── UserController.java
    │   ├── dto/
    │   │   ├── CreateUserRequest.java    (record)
    │   │   ├── UpdateUserRequest.java    (record)
    │   │   └── UserResponse.java         (record)
    │   ├── entity/
    │   │   └── User.java
    │   ├── repository/
    │   │   └── UserRepository.java
    │   └── service/
    │       └── UserService.java
    └── order/                       # Order 도메인
        ├── controller/
        ├── dto/
        ├── entity/
        ├── repository/
        └── service/
```

### Java 21 모던 패턴 (필수)
1. **record**: 모든 DTO는 반드시 `record`로 작성
   ```java
   public record CreateUserRequest(@NotBlank String name, @Email String email) {}
   public record UserResponse(Long id, String name, String email, LocalDateTime createdAt) {
       public static UserResponse from(User user) { ... }
   }
   ```
2. **sealed interface**: 도메인 타입 계층에 활용
   ```java
   public sealed interface NotificationChannel permits EmailChannel, SmsChannel, PushChannel {}
   ```
3. **pattern matching**: switch 표현식, instanceof 패턴 매칭
   ```java
   return switch (channel) {
       case EmailChannel e -> sendEmail(e);
       case SmsChannel s -> sendSms(s);
       case PushChannel p -> sendPush(p);
   };
   ```
4. **var**: 타입 추론이 명확한 지역 변수에 사용

### Spring Boot 3.5 모던 패턴 (필수)
1. **ProblemDetail (RFC 9457)**: 에러 응답 표준
   ```java
   @RestControllerAdvice
   public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
       @ExceptionHandler(UserNotFoundException.class)
       ProblemDetail handleNotFound(UserNotFoundException ex) {
           ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
           pd.setTitle("User Not Found");
           return pd;
       }
   }
   ```
2. **WebClient**: 외부 API 호출 (RestTemplate 사용 금지, 비동기/동기 모두 지원)
   ```java
   // Bean 등록
   @Bean
   WebClient webClient(WebClient.Builder builder) {
       return builder.baseUrl("https://api.example.com").build();
   }

   // 동기 호출
   var result = webClient.get().uri("/users/{id}", id)
       .retrieve().bodyToMono(UserResponse.class).block();

   // 비동기 호출
   Mono<UserResponse> result = webClient.get().uri("/users/{id}", id)
       .retrieve().bodyToMono(UserResponse.class);
   ```
3. **Virtual Threads**: `spring.threads.virtual.enabled=true`
4. **ListCrudRepository**: `Iterable` 대신 `List` 반환
5. **@SQLRestriction**: `@Where` 대체 (Hibernate 6.3+)

### application.yml 필수 설정
```yaml
spring:
  threads:
    virtual:
      enabled: true
  main:
    keep-alive: true
  mvc:
    problemdetails:
      enabled: true
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        default_batch_fetch_size: 100
```

### 클린 코드 / SRP

**기본 원칙**: 유지보수가 쉬운 클린 코드 + SRP(단일 책임 원칙)

| 규칙 | 설명 |
|------|------|
| 메서드 단일 책임 | 하나의 메서드는 하나의 작업만 수행, 15줄 이내 권장 |
| 의도 드러내기 | 메서드/변수명만으로 의도 파악 가능 (주석 의존 최소화) |
| 중첩 최소화 | depth 2단계 이내, 깊어지면 early return 또는 메서드 추출 |
| 매직 값 금지 | 매직 넘버/문자열 → 상수 또는 Enum |
| 죽은 코드 제거 | 불필요한 주석, 사용하지 않는 코드 즉시 제거 |

**SRP 레이어별 책임:**
- **Controller**: HTTP 요청/응답 처리만 (비즈니스 로직 금지)
- **Service**: 비즈니스 로직만 (HTTP, 영속성 세부사항 분리)
- **Repository**: 데이터 접근만
- **Entity**: 도메인 규칙 + 자기 자신의 상태 관리만
- **DTO**: 데이터 전달만 (변환용 `from()` 팩토리는 허용)
- **Config**: 설정만 (비즈니스 로직 금지)

**메서드 설계:**
- `public` 메서드 = **무엇**(what) / `private` 메서드 = **어떻게**(how)
- 파라미터 3개 이하 권장 → 초과 시 객체로 묶기
- boolean 파라미터 지양 → 별도 메서드 분리 또는 Enum

### DRY 원칙 (Don't Repeat Yourself)
모든 지식은 시스템 내에서 **단 하나의 명확한 표현**을 가져야 한다.

| 패턴 | 설명 | 위치 |
|------|------|------|
| `BaseEntity` 상속 | `createdAt`/`updatedAt` 단일 정의 | `common/domain/BaseEntity.java` |
| `Entity.create()` 정적 팩토리 | 생성 로직 Entity 내부 단일 정의 | 각 Entity |
| `Entity.update()` 비즈니스 메서드 | 수정 로직 Entity 내부 캡슐화 | 각 Entity |
| `Repository.getById()` default | 조회+예외 로직 단일 정의 | 각 Repository |
| `Response.from()` 정적 팩토리 | Entity→DTO 변환 단일 정의 | 각 Response DTO |
| `GlobalExceptionHandler` | 예외→HTTP 응답 매핑 단일 정의 | `common/exception/` |
| `ProblemDetail` 표준 | 커스텀 에러 객체 만들지 않음 | RFC 9457 |
| `@ConfigurationProperties record` | 설정값 단일 소스 | `common/config/` |

**DRY 위반 금지:**
- ❌ 여러 Service에서 `findById().orElseThrow()` 반복 → ✅ `Repository.getById()` default 메서드
- ❌ Controller마다 `try-catch` 예외 처리 → ✅ `GlobalExceptionHandler`로 통합
- ❌ Entity→DTO 변환 Service에서 인라인 작성 → ✅ `Response.from()` 사용
- ❌ 모든 Entity에 `createdAt`/`updatedAt` 복붙 → ✅ `BaseEntity` 상속
- ❌ 동일한 검증 로직 여러 DTO에 반복 → ✅ 커스텀 Validation 어노테이션

### Spring Boot 3.5 Best Practices (2025/2026)
| 기능 | Best Practice | 비고 |
|------|---------------|------|
| DTO | `record` (불변, compact) | class 사용 금지 |
| 에러 응답 | `ProblemDetail` (RFC 9457) | 커스텀 에러 객체 금지 |
| HTTP 클라이언트 | `WebClient` (비동기/동기) | RestTemplate/RestClient 금지 |
| Virtual Threads | `spring.threads.virtual.enabled=true` | Spring Boot 3.2+ |
| 테스트 Mock | `@MockitoBean` | @MockBean deprecated (3.4+) |
| Soft Delete | `@SoftDelete` / `@SQLRestriction` | @Where deprecated (6.3+) |
| 설정 | `@ConfigurationProperties record` | 불변 바인딩 |
| Logging | Structured Logging JSON | Spring Boot 3.4+ |
| Repository | `ListCrudRepository` + default 메서드 | Iterable→List |
| Projection | Interface-based Projection | 불필요한 컬럼 조회 방지 |
| Observability | Micrometer Observation API | spring-boot-starter-actuator |
| Docker | `spring.docker.compose.*` | Spring Boot 3.1+ |

### QueryDSL (복잡한 동적 쿼리)

> **OpenFeign fork** 사용: `io.github.openfeign.querydsl` (보안 패치 + 유지보수 활성화)
> `com.querydsl:querydsl-jpa:5.x` 사용 금지

```groovy
// build.gradle
dependencies {
    implementation 'io.github.openfeign.querydsl:querydsl-jpa:6.12'
    annotationProcessor 'io.github.openfeign.querydsl:querydsl-apt:6.12:jpa'
    annotationProcessor 'jakarta.annotation:jakarta.annotation-api'
    annotationProcessor 'jakarta.persistence:jakarta.persistence-api'
}
```

**쿼리 전략 판단 기준:**
| 복잡도 | 방법 | 예시 |
|--------|------|------|
| 단순 | 쿼리 메서드 | `findByName(String name)` |
| 중간 | `@Query` JPQL | JOIN, 서브쿼리 등 |
| 복잡/동적 | **QueryDSL** | 다중 조건 검색, 동적 정렬 |

**Custom Repository 패턴 (필수):**
```java
// 1. Custom 인터페이스
public interface UserRepositoryCustom {
    Page<UserResponse> search(UserSearchCondition condition, Pageable pageable);
}

// 2. 구현체 (반드시 {Name}RepositoryImpl 네이밍)
@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepositoryCustom {
    private final JPAQueryFactory queryFactory;

    @Override
    public Page<UserResponse> search(UserSearchCondition condition, Pageable pageable) {
        var content = queryFactory
                .select(Projections.constructor(UserResponse.class,
                        user.id, user.name, user.email, user.createdAt))
                .from(user)
                .where(nameContains(condition.name()),
                       emailContains(condition.email()))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(user.id.desc())
                .fetch();

        var countQuery = queryFactory
                .select(user.count())
                .from(user)
                .where(nameContains(condition.name()),
                       emailContains(condition.email()));

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    // null 반환 → where()에서 자동 무시 (동적 쿼리 핵심)
    private BooleanExpression nameContains(String name) {
        return name != null ? user.name.containsIgnoreCase(name) : null;
    }

    private BooleanExpression emailContains(String email) {
        return email != null ? user.email.containsIgnoreCase(email) : null;
    }
}

// 3. 메인 Repository에서 Custom 상속
public interface UserRepository extends JpaRepository<User, Long>, UserRepositoryCustom { ... }

// 4. 검색 조건 DTO (record)
public record UserSearchCondition(String name, String email) {}
```

**QueryDSL Best Practices:**
- `BooleanExpression` 메서드 분리 → 조건 재사용 (DRY), null 반환 시 자동 무시
- `Projections.constructor()` → record DTO 직접 프로젝션 (Entity 전체 로드 방지)
- `fetchJoin()` → N+1 문제 방지
- `PageableExecutionUtils.getPage()` → count 쿼리 최적화 (불필요 시 생략)
- `fetch()` + 별도 count 쿼리 → `fetchResults()` deprecated

**QueryDSL 금지 패턴:**
- ❌ `fetchResults()` → deprecated
- ❌ `BooleanBuilder` 남용 → `BooleanExpression` 메서드 분리
- ❌ `@QueryProjection` DTO에 사용 → `Projections.constructor()` 권장
- ❌ 단순 쿼리에 QueryDSL → 쿼리 메서드 우선

### 코드 생성 원칙
1. **단일 모듈**: 모든 코드가 하나의 `src/main/java` 안에 위치
2. **공유 DB**: 하나의 데이터소스, 하나의 트랜잭션 매니저
3. **내부 호출**: Service 간 직접 의존성 주입
4. **단일 설정**: `application.yml` 하나로 관리
5. **통합 예외 처리**: 하나의 `@RestControllerAdvice`로 전역 ProblemDetail 처리

### 응답 포맷
코드 블록에는 항상 전체 패키지 경로를 포함:
```java
// src/main/java/com/example/demo/controller/UserController.java
```

### @Transactional 관리 전략

**기본 원칙**: Service 레이어에서만 사용, Controller/Repository 금지

| 규칙 | 설명 |
|------|------|
| Service 전용 | `@Transactional`은 Service 레이어에서만 선언 |
| readOnly 분리 | 조회 메서드는 `@Transactional(readOnly = true)` 필수 |
| Controller 금지 | Controller에 `@Transactional` 선언 금지 |
| 범위 최소화 | 트랜잭션 범위를 최소한으로 유지 |

**패턴:**
```java
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    // 조회 → readOnly = true (Dirty Checking 비활성화, DB replica 활용)
    @Transactional(readOnly = true)
    public UserResponse getUser(Long id) {
        var user = userRepository.getById(id);
        return UserResponse.from(user);
    }

    // 변경 → 기본 @Transactional
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        var user = User.create(request.name(), request.email());
        userRepository.save(user);
        return UserResponse.from(user);
    }
}
```

**readOnly = true 효과:**
- Hibernate Dirty Checking 비활성화 → 성능 향상
- DB replica(읽기 전용 DB) 자동 라우팅 지원
- 의도하지 않은 데이터 변경 방지

**금지 패턴:**
- ❌ Controller에 `@Transactional` → 트랜잭션 범위 과도
- ❌ `@Transactional` 없이 여러 Repository 호출 → 데이터 정합성 위험
- ❌ 조회 메서드에 `readOnly = true` 누락 → 불필요한 Dirty Checking

### 제안 패턴
- 연관관계: 같은 DB이므로 JPA 연관관계 매핑 적극 활용
- 트랜잭션: `@Transactional`로 서비스 단위 트랜잭션 (조회는 readOnly)
- 캐시: Spring Cache Abstraction + 로컬 캐시 (Caffeine) 우선
- 테스트: `@SpringBootTest` + `@DataJpaTest` + `@WebMvcTest` + `@AutoConfigureMockMvc`

### 금지 패턴
- DTO에 `class` 사용 → 반드시 `record`
- `RestTemplate` 신규 사용 → `WebClient` 사용
- `RestClient` 사용 지양 → `WebClient` 사용
- 커스텀 에러 응답 객체 → `ProblemDetail` 사용
- `@Where` → `@SQLRestriction` 사용
- `@Data` on Entity → `@Getter` + `@NoArgsConstructor` 사용
- `@Repository` on JpaRepository → 불필요 (자동 등록)
- `spring.jpa.open-in-view=true` → 반드시 false
- Spring Cloud 관련 설정 (Eureka, Gateway, Config Server)
- Feign Client for internal calls
- 분산 트랜잭션 (Saga, 2PC)
