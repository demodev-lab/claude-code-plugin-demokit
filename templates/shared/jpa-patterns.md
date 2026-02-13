# JPA / Hibernate 패턴 가이드

## 연관관계 매핑
- `@ManyToOne(fetch = FetchType.LAZY)` — 기본값이 EAGER이므로 반드시 LAZY 지정
- `@OneToMany(mappedBy = "parent")` — 양방향 시 mappedBy로 주인 명시
- `@ManyToMany` 지양 → 중간 Entity로 풀어서 `@OneToMany` + `@ManyToOne`
- 연관관계 편의 메서드: 양방향 동기화를 Entity 내부에 단일 정의

## Fetch 전략
- **기본 원칙**: 모든 연관관계 `FetchType.LAZY`
- **조회 최적화**: 필요한 경우만 `@EntityGraph` 또는 `JOIN FETCH`
- **DTO 프로젝션**: 읽기 전용 조회 시 Interface-based Projection 또는 QueryDSL `Projections.constructor()`

## N+1 문제 해결
1. `@EntityGraph(attributePaths = {"관계필드"})` — Repository 메서드에 선언
2. `JOIN FETCH` — JPQL/QueryDSL에서 직접 페치 조인
3. `@BatchSize(size = 100)` — 컬렉션 배치 로딩
4. DTO 프로젝션 — 연관관계 자체를 로딩하지 않음

## Hibernate 6.6+ 패턴
- `@SQLRestriction("deleted = false")` — `@Where` deprecated 대체
- `@SoftDelete` — Hibernate 6.4+ 네이티브 소프트 삭제
- `@TimeZoneStorage(NORMALIZE_UTC)` — 시간대 정규화
- `@JdbcTypeCode(SqlTypes.JSON)` — JSON 컬럼 매핑

## QueryDSL (OpenFeign fork 6.12)
- **설정**: `JPAQueryFactory` Bean 등록 (`common/config/QuerydslConfig`)
- **패턴**: `{Name}RepositoryCustom` (인터페이스) + `{Name}RepositoryImpl` (구현)
- **조건**: `BooleanExpression` 재사용 메서드 분리 (null 반환 시 자동 무시)
- **프로젝션**: `Projections.constructor()` → record DTO 직접 프로젝션
- **페이징**: `PageableExecutionUtils.getPage()` → count 쿼리 최적화
- **안티패턴**:
  - 단순 쿼리에 QueryDSL 사용 금지 → 쿼리 메서드 또는 `@Query` 우선
  - `BooleanBuilder` 남용 → `BooleanExpression` 메서드 분리
  - `fetchResults()` 사용 금지 → deprecated, `fetch()` + count 쿼리 분리
  - `@QueryProjection` DTO 사용 금지 → QueryDSL 의존성 전파 방지

## Entity 설계 패턴
```java
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 정적 팩토리
    public static Order create(User user, ...) { ... }

    // 비즈니스 메서드
    public void updateStatus(OrderStatus status) { ... }
}
```

## Repository 패턴
```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    // 조회+예외 default 메서드
    default Order getById(Long id) {
        return findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }

    // 쿼리 메서드
    List<Order> findByUserIdAndStatus(Long userId, OrderStatus status);
}
```

## 쿼리 전략 (복잡도별)
| 복잡도 | 방법 |
|--------|------|
| 단순 | Spring Data 쿼리 메서드 (`findByName`) |
| 중간 | `@Query` JPQL |
| 복잡/동적 | QueryDSL (`JPAQueryFactory` + Custom Repository) |
