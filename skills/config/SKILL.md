---
name: config
description: 이 스킬은 사용자가 "설정", "config", "JPA 설정", "Web 설정"을 요청할 때 사용합니다. Spring 설정 클래스를 생성합니다 (JPA, Web, Cache, Security, Properties 등).
---

# /config - 설정 관리

## 실행 절차

1. **파일 위치**: `common/config/{Name}Config.java`
2. **지원 설정 종류**:
   - `jpa`: JpaAuditingConfig + BaseEntity
   - `web`: WebConfig (CORS, Interceptor 등)
   - `cache`: CacheConfig (Caffeine/Redis)
   - `querydsl`: QuerydslConfig (JPAQueryFactory Bean)
   - `webclient`: WebClientConfig (Reactor Netty timeout)
   - `properties`: `@ConfigurationProperties record`
3. **application.yml 설정 안내** 함께 제공

## 관련 Agent
- infra-expert (Phase 3)

## 관련 템플릿
- `templates/code/config.template.java`
