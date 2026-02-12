---
name: config
description: 이 스킬은 사용자가 "설정", "config", "JPA 설정", "Web 설정"을 요청할 때 사용합니다. Spring 설정 클래스를 생성합니다 (JPA, Web, Cache, Security, Properties 등).
---

# /config - 설정 관리

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/config — Spring 설정 클래스 생성

사용법:
  /config {type[,type2]}

파라미터:
  type  설정 종류 (필수, 쉼표로 복수 지정 가능)
        jpa, web, cache, querydsl, webclient, properties

예시:
  /config jpa
  /config jpa,web,cache
  /config properties

관련 명령:
  /security — Spring Security 설정 생성
  /cache    — 캐싱 전략 설정
```

## 실행 절차

1. **파일 위치**: `common/config/{Name}Config.java`
2. **지원 설정 종류**:
   - `jpa`: JpaAuditingConfig + BaseEntity
   - `web`: WebConfig (CORS, Interceptor 등)
   - `cache`: CacheConfig (Caffeine/Redis)
   - `querydsl`: QuerydslConfig (JPAQueryFactory Bean)
   - `webclient`: WebClientConfig (Reactor Netty timeout)
   - `properties`: `@ConfigurationProperties record`
3. **병렬 생성**: 여러 설정을 동시에 요청한 경우 (예: `/config jpa,web,cache`), 각 설정 파일을 Task 도구로 **한 메시지에서 동시에 호출**하여 병렬 생성한다.
4. **application.yml 설정 안내** 함께 제공

## 관련 Agent
- infra-expert (Phase 3)

## 관련 템플릿
- `templates/code/config.template.java`
