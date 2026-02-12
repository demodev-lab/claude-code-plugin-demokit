---
name: cache
description: 이 스킬은 사용자가 "캐시", "cache", "Caffeine", "Redis 캐시"를 요청할 때 사용합니다. Caffeine 또는 Redis 기반 캐싱 전략을 설정합니다.
---

# /cache - 캐싱 전략

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/cache — 캐싱 전략 설정

사용법:
  /cache [caffeine|redis]

옵션:
  caffeine  Caffeine 로컬 캐시 (기본)
  redis     Redis 분산 캐시

예시:
  /cache
  /cache caffeine
  /cache redis

관련 명령:
  /config — Spring 설정 클래스 생성
  /gradle — Gradle 의존성 관리
```

## 실행 절차

### Caffeine (로컬 캐시, 기본)
1. **CacheConfig**: `common/config/CacheConfig.java`
   - `@EnableCaching`
   - `CaffeineCacheManager` Bean
   - 캐시별 TTL, 최대 크기 설정
2. **의존성**: `com.github.ben-manes.caffeine:caffeine`
3. **사용법 안내**: `@Cacheable`, `@CacheEvict`, `@CachePut`

### Redis
1. **CacheConfig**: RedisCacheManager 설정
2. **RedisConfig**: RedisTemplate, ConnectionFactory
3. **의존성**: `spring-boot-starter-data-redis`
4. **Docker Compose**: Redis 서비스 추가 안내

## 관련 Agent
- service-expert
