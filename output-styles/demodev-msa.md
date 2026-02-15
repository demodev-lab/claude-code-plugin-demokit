---
name: demodev-msa
description: MSA 아키텍처 기반 Spring Boot 개발 스타일
triggers: msa, microservices, 마이크로서비스, multi-module
---

# demodev-msa Output Style

> Spring Boot 3.5.10 + Java 21 + Gradle (Groovy DSL) + MSA

## 적용 조건
- 프로젝트 레벨이 MSA로 감지된 경우
- 멀티모듈 구조, Spring Cloud 의존성 존재

## 응답 스타일

### 패키지 구조 안내
각 서비스 모듈은 도메인 기반 패키지 구조를 따른다:

```
{service-name}/
└── src/main/java/{basePackage}/
    ├── common/
    │   ├── config/
    │   ├── domain/
    │   │   └── BaseEntity.java
    │   ├── exception/
    │   │   └── GlobalExceptionHandler.java
    │   └── security/
    └── domain/
        └── {domainName}/
            ├── controller/
            ├── dto/          (record)
            ├── entity/
            ├── repository/
            └── service/
```

### MSA 전용 패턴

#### 1. 서비스 간 통신: WebClient + Circuit Breaker
```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final WebClient userServiceClient;

    @CircuitBreaker(name = "userService", fallbackMethod = "getUserFallback")
    @Retry(name = "userService")
    public UserResponse getUser(Long userId) {
        return userServiceClient.get()
                .uri("/api/v1/users/{id}", userId)
                .retrieve()
                .bodyToMono(UserResponse.class)
                .block();
    }

    private UserResponse getUserFallback(Long userId, Throwable t) {
        return UserResponse.unknown(userId);
    }
}
```

#### 2. Circuit Breaker (Resilience4j) 설정
```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      userService:
        sliding-window-type: COUNT_BASED
        sliding-window-size: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 10s
        permitted-number-of-calls-in-half-open-state: 3
  retry:
    instances:
      userService:
        max-attempts: 3
        wait-duration: 500ms
```

**Circuit Breaker 상태 전이:**
- CLOSED → 정상 (요청 통과)
- OPEN → 실패율 초과 (요청 즉시 실패 + fallback)
- HALF_OPEN → 일정 시간 후 제한적 요청 허용

#### 3. Saga 패턴 (분산 트랜잭션)
서비스 간 데이터 일관성을 **Saga 패턴**으로 보장:

**Choreography 방식 (이벤트 기반):**
```java
// OrderService - 주문 생성 후 이벤트 발행
@Transactional
public OrderResponse createOrder(CreateOrderRequest request) {
    var order = Order.create(request);
    orderRepository.save(order);

    // 이벤트 발행 → PaymentService가 구독
    eventPublisher.publish(new OrderCreatedEvent(order.getId(), order.getTotalAmount()));
    return OrderResponse.from(order);
}

// PaymentService - 이벤트 수신
@KafkaListener(topics = "order-created")
public void handleOrderCreated(OrderCreatedEvent event) {
    try {
        paymentService.processPayment(event.orderId(), event.amount());
    } catch (PaymentFailedException e) {
        // 보상 트랜잭션: 주문 취소 이벤트 발행
        eventPublisher.publish(new PaymentFailedEvent(event.orderId()));
    }
}
```

**보상 트랜잭션 원칙:**
- 각 서비스는 자신의 트랜잭션 롤백을 위한 보상 이벤트 처리 필수
- 보상 이벤트는 멱등성(Idempotent) 보장

#### 4. 이벤트 기반 통신 (Kafka)
```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: ${spring.application.name}
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

**이벤트 설계 원칙:**
- 이벤트는 불변 record로 정의
- 이벤트 이름: `{Entity}{PastTenseVerb}Event` (예: OrderCreatedEvent)
- Consumer는 멱등성 보장 (중복 처리 안전)
- Dead Letter Topic 설정 필수

#### 5. API Gateway (Spring Cloud Gateway)
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/v1/users/**
        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/v1/orders/**
```

#### 6. 서비스 디스커버리
- Eureka / Consul 사용
- 각 서비스는 `spring.application.name`으로 등록
- WebClient에서 `lb://service-name` URI 사용

### MSA 공통 원칙
- 서비스별 독립 데이터베이스 (Database per Service)
- API 버저닝 (`/api/v1/`)
- 서비스 간 직접 DB 접근 금지
- ProblemDetail 에러 응답 표준 (서비스 간 통일)
- 각 서비스별 독립 배포 가능
- 동기 호출 시 Circuit Breaker 필수
- 비동기 통신(이벤트)을 기본으로 권장

### Java 21 + Spring Boot 3.5 Best Practices
- Monolith 스타일과 동일: record DTO, ProblemDetail, Virtual Threads, @MockitoBean, @SQLRestriction
- DRY 원칙 동일 적용
- **클린 코드 / SRP 원칙 동일 적용**
- @Transactional 관리 전략 동일 적용 (Service 전용, readOnly 분리)

### 금지 패턴
- Monolith 금지 패턴 모두 동일 적용
- ❌ 서비스 간 직접 DB 접근 → 반드시 API 호출
- ❌ 동기식 서비스 간 호출 시 Circuit Breaker 미적용
- ❌ 분산 트랜잭션 2PC → Saga 패턴 사용
- ❌ 서비스 간 공유 라이브러리에 비즈니스 로직 → 공유는 DTO/이벤트만
- ❌ 단일 Kafka topic에 여러 이벤트 타입 → topic per event type
