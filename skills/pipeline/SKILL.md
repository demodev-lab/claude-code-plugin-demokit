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

상태 파일:
  .pipeline/status.json

단계:
  Phase 1: Schema      - DB 스키마 설계 (dba-expert)
  Phase 2: Convention  - 코드 컨벤션 확인 (spring-architect)
  Phase 3: Infra       - 인프라 설정 (infra-expert)
  Phase 4: Feature     - 핵심 기능 구현 (domain-expert)
  Phase 5: Integration - 서비스 통합 (service-expert)
  Phase 6: Testing     - 테스트 작성 (test-expert)
  Phase 7: Performance - 성능 최적화 (dba-expert)
  Phase 8: Review      - 코드 리뷰 (code-reviewer)
  Phase 9: Deployment  - 배포 준비 (devops-engineer)

예시:
  /pipeline user-management
  /pipeline status
  /pipeline next
```

## 핵심 동작 규칙

### 1) `/pipeline {feature}`
feature가 들어오면 아래 명령으로 파이프라인 상태를 시작/갱신한다.

```bash
node scripts/pipeline-ctl.js start "{feature}"
# 또는
node scripts/pipeline-ctl.js start --feature "{feature}"
```

- 상태 파일: `.pipeline/status.json`
- 이미 같은 feature가 진행 중이면 기존 상태를 재사용한다.
- 강제 재시작이 필요하면 `--reset`을 사용한다.

### 2) `/pipeline status`
아래 명령으로 현재 phase/진행률을 조회한다.

```bash
node scripts/pipeline-ctl.js status
```

응답에는 아래를 포함한다:
- 현재 feature
- 현재 phase (id/name/agent)
- 완료/전체 진행률
- 각 phase 상태(pending/in-progress/completed)

### 3) `/pipeline next`
아래 명령으로 자동 전이를 수행한다.

```bash
node scripts/pipeline-ctl.js next
```

전이 규칙:
1. 현재 phase를 completed 처리
2. 다음 phase가 있으면 자동으로 in-progress 전환
3. 마지막 phase면 파이프라인 완료 처리

## 실행 절차 (각 phase에서 할 일)

### Phase 1: Schema (DB 스키마 설계)
**담당 에이전트**: dba-expert

1. 요구사항 기반 ERD 설계
2. 테이블 정의 (컬럼, 타입, 제약조건)
3. 인덱스 전략 초안
4. Flyway 마이그레이션 스크립트 생성

### Phase 2: Convention (코드 컨벤션 확인)
**담당 에이전트**: spring-architect

1. 패키지 구조 확인/생성
2. 네이밍 컨벤션 검증
3. 공통 모듈 (BaseEntity, GlobalExceptionHandler) 확인
4. 기존 코드 패턴 분석

### Phase 3: Infra (인프라 설정)
**담당 에이전트**: infra-expert

1. application.yml 프로파일 설정
2. Docker Compose 설정 (DB, Redis 등)
3. Gradle 의존성 확인/추가
4. 환경 변수 정리

### Phase 4: Feature (핵심 기능 구현)
**담당 에이전트**: domain-expert

1. Entity 구현 (JPA 매핑, 연관관계)
2. Repository 구현 (쿼리 메서드, QueryDSL)
3. DTO 정의 (Request/Response record)
4. 도메인 비즈니스 로직

### Phase 5: Integration (서비스 통합)
**담당 에이전트**: service-expert

1. Service 구현 (비즈니스 로직 조합)
2. Controller 구현 (REST API 엔드포인트)
3. 예외 처리 (커스텀 예외 + GlobalExceptionHandler)
4. API 문서 주석

### Phase 6: Testing (테스트 작성)
**담당 에이전트**: test-expert

1. 단위 테스트 (Service: Mockito)
2. 슬라이스 테스트 (Repository: @DataJpaTest, Controller: @WebMvcTest)
3. 통합 테스트 (@SpringBootTest, 필요시 Testcontainers)
4. 테스트 실행 및 통과 확인

### Phase 7: Performance (성능 최적화)
**담당 에이전트**: dba-expert

1. N+1 쿼리 점검
2. 인덱스 최적화 (EXPLAIN ANALYZE)
3. 쿼리 성능 개선
4. 캐시 적용 여부 검토

> `/optimize` 스킬 실행 (domain-expert + dba-expert 병렬)

### Phase 8: Review (코드 리뷰)
**담당 에이전트**: code-reviewer

1. Clean Code 원칙 준수 확인
2. Spring Best Practices 적용 확인
3. 보안 취약점 점검 (SQL Injection, XSS 등)
4. 코드 일관성 검증

> `/review` 스킬 실행 (code-reviewer, 필요 시 --deep)

### Phase 9: Deployment (배포 준비)
**담당 에이전트**: devops-engineer

1. Dockerfile 작성 (멀티스테이지 빌드)
2. GitHub Actions 워크플로우
3. K8s 매니페스트 (필요시)
4. Actuator 헬스체크 설정
