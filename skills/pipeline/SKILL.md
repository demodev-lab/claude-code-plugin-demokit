---
name: pipeline
description: 이 스킬은 사용자가 "pipeline", "파이프라인", "개발 파이프라인", "9단계"를 요청할 때 사용합니다. Spring Boot 9단계 개발 파이프라인.
---

# /pipeline - Spring Boot 개발 파이프라인

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/pipeline — Spring Boot 9단계 개발 파이프라인

사용법:
  /pipeline {feature}
  /pipeline status
  /pipeline next

단계:
  Phase 1: Schema      - DB 스키마 설계 (dba-expert)
  Phase 2: Convention   - 코드 컨벤션 확인 (spring-architect)
  Phase 3: Infra        - 인프라 설정 (infra-expert)
  Phase 4: Feature      - 핵심 기능 구현 (domain-expert)
  Phase 5: Integration  - 서비스 통합 (service-expert)
  Phase 6: Testing      - 테스트 작성 (test-expert)
  Phase 7: Performance  - 성능 최적화 (dba-expert)
  Phase 8: Review       - 코드 리뷰 (code-reviewer)
  Phase 9: Deployment   - 배포 준비 (devops-engineer)

예시:
  /pipeline user-management
  /pipeline status
  /pipeline next

관련 명령:
  /pdca      — PDCA 워크플로우
  /plan-plus — 브레인스토밍 강화 계획
```

## 실행 절차

### Phase 1: Schema (DB 스키마 설계)
**담당 에이전트**: dba-expert

1. 요구사항 기반 ERD 설계
2. 테이블 정의 (컬럼, 타입, 제약조건)
3. 인덱스 전략 초안
4. Flyway 마이그레이션 스크립트 생성

**산출물**: ERD + 마이그레이션 SQL

### Phase 2: Convention (코드 컨벤션 확인)
**담당 에이전트**: spring-architect

1. 패키지 구조 확인/생성
2. 네이밍 컨벤션 검증
3. 공통 모듈 (BaseEntity, GlobalExceptionHandler) 확인
4. 기존 코드 패턴 분석

**산출물**: 컨벤션 체크리스트 (통과/미통과)

### Phase 3: Infra (인프라 설정)
**담당 에이전트**: infra-expert

1. application.yml 프로파일 설정
2. Docker Compose 설정 (DB, Redis 등)
3. Gradle 의존성 확인/추가
4. 환경 변수 정리

**산출물**: 설정 파일 업데이트

### Phase 4: Feature (핵심 기능 구현)
**담당 에이전트**: domain-expert

1. Entity 구현 (JPA 매핑, 연관관계)
2. Repository 구현 (쿼리 메서드, QueryDSL)
3. DTO 정의 (Request/Response record)
4. 도메인 비즈니스 로직

**산출물**: Entity + Repository + DTO

### Phase 5: Integration (서비스 통합)
**담당 에이전트**: service-expert

1. Service 구현 (비즈니스 로직 조합)
2. Controller 구현 (REST API 엔드포인트)
3. 예외 처리 (커스텀 예외 + GlobalExceptionHandler)
4. API 문서 주석

**산출물**: Service + Controller + Exception

### Phase 6: Testing (테스트 작성)
**담당 에이전트**: test-expert

1. 단위 테스트 (Service: Mockito)
2. 슬라이스 테스트 (Repository: @DataJpaTest, Controller: @WebMvcTest)
3. 통합 테스트 (@SpringBootTest, 필요시 Testcontainers)
4. 테스트 실행 및 통과 확인

**산출물**: 테스트 코드 + 실행 결과

### Phase 7: Performance (성능 최적화)
**담당 에이전트**: dba-expert

1. N+1 쿼리 점검
2. 인덱스 최적화 (EXPLAIN ANALYZE)
3. 쿼리 성능 개선
4. 캐시 적용 여부 검토

**산출물**: 성능 분석 리포트 + 최적화 쿼리

### Phase 8: Review (코드 리뷰)
**담당 에이전트**: code-reviewer

1. Clean Code 원칙 준수 확인
2. Spring Best Practices 적용 확인
3. 보안 취약점 점검 (SQL Injection, XSS 등)
4. 코드 일관성 검증

**산출물**: 리뷰 리포트 (이슈/개선사항)

### Phase 9: Deployment (배포 준비)
**담당 에이전트**: devops-engineer

1. Dockerfile 작성 (멀티스테이지 빌드)
2. GitHub Actions 워크플로우
3. K8s 매니페스트 (필요시)
4. Actuator 헬스체크 설정

**산출물**: 배포 관련 파일
