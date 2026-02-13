# 테스트 패턴 가이드

## Given-When-Then 패턴
```java
@Test
@DisplayName("사용자 생성 시 ID가 반환된다")
void should_returnId_when_createUser() {
    // given
    CreateUserRequest request = new CreateUserRequest("홍길동", "hong@example.com");

    // when
    UserResponse response = userService.create(request);

    // then
    assertThat(response.id()).isNotNull();
    assertThat(response.name()).isEqualTo("홍길동");
}
```

## 슬라이스 테스트
| 레이어 | 어노테이션 | 용도 |
|--------|-----------|------|
| Repository | `@DataJpaTest` | JPA 관련 Bean만 로드 |
| Service | `@ExtendWith(MockitoExtension.class)` | Spring 컨텍스트 없이 단위 테스트 |
| Controller | `@WebMvcTest` + `@AutoConfigureMockMvc` | MVC 레이어만 로드 |
| 통합 | `@SpringBootTest` + `@ServiceConnection` + Testcontainers | 전체 통합 테스트 |

## @MockitoBean (Spring Boot 3.4+)
- `@MockBean` deprecated → `@MockitoBean` 사용
- `@SpyBean` deprecated → `@MockitoSpyBean` 사용

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;
}
```

## Testcontainers
```java
@SpringBootTest
@Testcontainers
class UserIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");
}
```
- `@ServiceConnection`: DataSource 자동 설정 (수동 `@DynamicPropertySource` 불필요)
- 테스트 간 DB 격리: `@Transactional` 또는 `@Sql`

## 네이밍 컨벤션
- 클래스명: `{ClassName}Test`
- 메서드명: `should_{기대결과}_when_{조건}` 또는 한글 `@DisplayName`
- 한글 `@DisplayName` 권장 (가독성 우선)

## Service 단위 테스트 패턴
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @InjectMocks
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    @Test
    @DisplayName("존재하지 않는 사용자 조회 시 예외 발생")
    void should_throwException_when_userNotFound() {
        // given
        given(userRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> userService.findById(1L))
            .isInstanceOf(UserNotFoundException.class);
    }
}
```

## Repository 테스트 패턴
```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("이메일로 사용자 조회")
    void should_findUser_when_emailExists() {
        // given
        User user = User.create("홍길동", "hong@example.com");
        userRepository.save(user);

        // when
        Optional<User> found = userRepository.findByEmail("hong@example.com");

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("홍길동");
    }
}
```

## 테스트 원칙
- 각 테스트는 독립적으로 실행 가능
- 테스트 간 상태 공유 금지
- 외부 의존성은 Mock 또는 Testcontainers로 격리
- 테스트 데이터는 테스트 내부에서 생성 (공유 fixture 최소화)
- AssertJ 사용 (`assertThat()` 체이닝)
