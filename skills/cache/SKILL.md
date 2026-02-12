---
name: cache
description: 캐싱 전략 설정 (Caffeine/Redis)
user_invocable: true
arguments:
  - name: provider
    description: "캐시 제공자 (caffeine, redis). 기본: caffeine"
    required: false
---

# /cache - 캐싱 전략

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
