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
1. **서비스 간 통신**: WebClient (동기/비동기)
   - Feign Client 대신 WebClient 사용
   - Circuit Breaker (Resilience4j) 적용
2. **API Gateway**: Spring Cloud Gateway
3. **서비스 디스커버리**: Eureka / Consul
4. **분산 설정**: Spring Cloud Config / Consul KV
5. **메시징**: Kafka / RabbitMQ (이벤트 기반 통신)

### MSA 공통 원칙
- 서비스별 독립 데이터베이스
- API 버저닝 (/api/v1/)
- 서비스 간 직접 DB 접근 금지
- ProblemDetail 에러 응답 표준 (서비스 간 통일)
- 각 서비스별 독립 배포 가능

### Java 21 + Spring Boot 3.5 Best Practices
- Monolith 스타일과 동일: record DTO, ProblemDetail, Virtual Threads, @MockitoBean, @SQLRestriction
- DRY 원칙 동일 적용
- **클린 코드 / SRP 원칙 동일 적용**

### 금지 패턴
- Monolith 금지 패턴 모두 동일 적용
- 추가: 서비스 간 직접 DB 접근 금지
- 추가: 동기식 서비스 간 호출 시 Circuit Breaker 필수
