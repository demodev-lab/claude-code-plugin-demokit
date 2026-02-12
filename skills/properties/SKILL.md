---
name: properties
description: 이 스킬은 사용자가 "설정", "properties", "yml", "application.yml", "환경 설정"을 요청할 때 사용합니다. Spring Boot 설정 파일을 관리합니다.
---

# /properties - Spring Boot 설정 관리

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/properties — application.yml 설정 관리

사용법:
  /properties [action] [profile]

파라미터:
  action   작업 (선택, 기본 analyze)
           analyze, init, add-profile
  profile  프로파일 (선택)
           dev, test, prod, local

예시:
  /properties                   — 현재 설정 분석
  /properties init              — 기본 application.yml 생성
  /properties add-profile dev   — dev 프로파일 추가

관련 명령:
  /docker   — Docker 설정
  /config   — 프로젝트 설정
```

## 실행 절차

### analyze (기본)
1. `application.yml` / `application.properties` 읽기
2. 프로파일별 설정 파일 확인
3. 다음 항목 검증:
   - `spring.jpa.open-in-view` → 반드시 false
   - `spring.threads.virtual.enabled` → true 권장
   - `spring.mvc.problemdetails.enabled` → true 권장
   - `spring.main.keep-alive` → true 권장 (Virtual Threads)
   - `hibernate.default_batch_fetch_size` → 100 권장
   - 민감 정보 하드코딩 여부 (password, secret, key)
4. 누락/위반 항목 보고

### init
Spring Boot 3.5 Best Practice 기반 `application.yml` 생성:
```yaml
spring:
  threads:
    virtual:
      enabled: true
  main:
    keep-alive: true
  mvc:
    problemdetails:
      enabled: true
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        default_batch_fetch_size: 100
  docker:
    compose:
      lifecycle-management: start-only

logging:
  structured:
    json:
      enabled: true

management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics
```

### add-profile
지정 프로파일에 맞는 설정 파일 생성:
- **dev**: H2 인메모리 DB, ddl-auto=create-drop, SQL 로그
- **test**: Testcontainers 설정, ddl-auto=create
- **prod**: 외부화된 설정, ddl-auto=validate, 운영 로깅
- **local**: docker-compose 연동, ddl-auto=update
