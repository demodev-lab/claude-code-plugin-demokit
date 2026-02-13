# API / Controller 패턴 가이드

## ProblemDetail (RFC 9457)
- `spring.mvc.problemdetails.enabled=true` 설정 필수
- 커스텀 에러 응답 객체 만들지 않음 → `ProblemDetail` 표준 사용
- `GlobalExceptionHandler`에서 `@ExceptionHandler`로 도메인 예외 매핑

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ProblemDetail handleNotFound(EntityNotFoundException e) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND, e.getMessage());
        pd.setTitle("리소스를 찾을 수 없습니다");
        return pd;
    }
}
```

## DTO record 패턴
- 모든 DTO는 Java `record`로 작성 (불변, compact)
- Bean Validation 직접 선언
- Entity→DTO 변환은 `Response.from()` 정적 팩토리

```java
public record CreateUserRequest(
    @NotBlank String name,
    @Email String email
) {}

public record UserResponse(
    Long id,
    String name,
    String email
) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}
```

## REST 상태 코드
| 작업 | 메서드 | 상태 코드 |
|------|--------|-----------|
| 목록 조회 | GET | 200 OK |
| 단건 조회 | GET | 200 OK |
| 생성 | POST | 201 Created |
| 수정 | PUT/PATCH | 200 OK |
| 삭제 | DELETE | 204 No Content |
| 입력 오류 | - | 400 Bad Request |
| 미인증 | - | 401 Unauthorized |
| 권한 없음 | - | 403 Forbidden |
| 미존재 | - | 404 Not Found |
| 충돌 | - | 409 Conflict |

## Controller 패턴
```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserResponse> create(
            @RequestBody @Valid CreateUserRequest request) {
        UserResponse response = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable Long id) {
        return userService.findById(id);
    }
}
```

## WebClient (HTTP 클라이언트)
- `RestTemplate` / `RestClient` 사용 금지
- 외부 API 호출 시 `WebClient` 사용 (비동기/동기 모두 지원)
- `@HttpExchange`: 선언적 HTTP 클라이언트 (내부 서비스 호출)

## GlobalExceptionHandler 패턴
- `@RestControllerAdvice` 단일 클래스
- 도메인별 커스텀 예외 → HTTP 상태 코드 매핑
- `MethodArgumentNotValidException` → 400 (필드 에러 목록 포함)
- 예상치 못한 예외 → 500 (상세 정보 숨김, 로깅)
