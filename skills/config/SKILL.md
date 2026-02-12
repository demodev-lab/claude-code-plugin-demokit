---
name: config
description: Spring 설정 클래스 생성
user_invocable: true
arguments:
  - name: type
    description: "설정 종류 (jpa, web, cache, security, properties)"
    required: false
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
