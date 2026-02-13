# Spring Boot 컨벤션 가이드

## 패키지 구조 (도메인 기반)
```
{basePackage}/
├── common/
│   ├── config/          # 공통 설정 (@Configuration)
│   ├── exception/       # GlobalExceptionHandler, 커스텀 예외
│   ├── security/        # SecurityConfig, 인증/인가
│   └── domain/          # BaseEntity, 공통 Enum
└── domain/
    └── {domainName}/
        ├── entity/      # JPA Entity
        ├── repository/  # Spring Data JPA Repository
        ├── service/     # 비즈니스 로직 (@Service)
        ├── controller/  # REST API (@RestController)
        └── dto/         # Request/Response record
```

## 네이밍 컨벤션
| 레이어 | 패턴 | 예시 |
|--------|------|------|
| Entity | `{Name}` | `User`, `Order` |
| Repository | `{Name}Repository` | `UserRepository` |
| Service | `{Name}Service` | `UserService` |
| Controller | `{Name}Controller` | `UserController` |
| Request DTO | `Create{Name}Request` / `Update{Name}Request` | `CreateUserRequest` |
| Response DTO | `{Name}Response` | `UserResponse` |
| Exception | `{Name}Exception` | `UserNotFoundException` |
| Config | `{Name}Config` | `SecurityConfig` |

## 필수 어노테이션
- **Entity**: `@Entity`, `@Getter`, `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
- **Service**: `@Service`, `@RequiredArgsConstructor`
- **Controller**: `@RestController`, `@RequestMapping`, `@RequiredArgsConstructor`
- **Config**: `@Configuration`
- **DTO**: record (어노테이션 불필요, Bean Validation 직접 선언)

## DRY 패턴
- `BaseEntity`: `createdAt`/`updatedAt` 공통 필드 단일 정의
- `Entity.create()` 정적 팩토리: 생성 로직 Entity 내부 단일 정의
- `Entity.update()` 비즈니스 메서드: setter 대신 의미 있는 메서드
- `Repository.getById()` default 메서드: 조회+예외 로직 단일 정의
- `Response.from()` 정적 팩토리: Entity→DTO 변환 단일 정의
- `GlobalExceptionHandler`: 예외→HTTP 응답 매핑 단일 정의
- `@ConfigurationProperties record`: 설정값 단일 소스

## Clean Code / SRP
- 메서드: 하나의 작업만 수행, 15줄 이내 권장
- 이름만으로 의도가 드러나야 함 (주석 의존 최소화)
- 중첩 깊이 2단계 이내 → early return 또는 메서드 추출
- 매직 넘버/문자열 금지 → 상수 또는 Enum
- **Controller**: HTTP 요청/응답 처리만 (비즈니스 로직 금지)
- **Service**: 비즈니스 로직만 (HTTP, 영속성 세부사항 분리)
- **Repository**: 데이터 접근만
- **Entity**: 도메인 규칙과 자기 자신의 상태 관리만
- **DTO**: 데이터 전달만 (로직 금지, 변환용 정적 팩토리 허용)

## 의존성 방향
```
Controller → Service → Repository → Entity
                ↗
DTO ──────────
```
- 단방향 의존성 엄수
- Domain Entity는 다른 도메인에 의존하지 않음
- 도메인 간 통신은 Service 레이어를 통해서만 수행
