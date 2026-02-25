---
name: optimize
description: 이 스킬은 사용자가 "최적화", "성능", "optimize", "N+1", "인덱스", "쿼리 최적화"를 요청할 때 사용합니다. 코드 성능 분석 및 최적화를 수행합니다.
---

# /optimize - 성능 최적화 분석

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/optimize — 성능 최적화 분석 및 개선

사용법:
  /optimize [target] [--fix]

파라미터:
  target  최적화 대상 (선택, 기본 전체)
          도메인명, 파일경로, all
  --fix   분석 후 자동 수정 (선택, 기본 분석만)

예시:
  /optimize              — 전체 분석
  /optimize User         — User 도메인 최적화
  /optimize User --fix   — User 도메인 분석 + 자동 수정

관련 명령:
  /review   — 코드 리뷰
  /qa       — 동적 품질 검증
  /erd      — ERD 다이어그램
```

## 심각도 기준
🔴 Critical — 즉시 수정 (N+1 쿼리, 누락 인덱스로 인한 풀스캔)
🟡 Warning  — 수정 권장 (트랜잭션 범위 과다, readOnly 누락)
🟢 Info     — 선택적 개선 (Projection 최적화, 페이징 개선)

## 실행 절차

**담당 에이전트**: domain-expert (코드 레벨) + dba-expert (DB 레벨, 병렬)

### 1단계: 프로젝트 스캔
- Entity, Repository, Service 파일 전체 수집
- application.yml JPA 설정 확인

체크포인트: [1/6 완료: 프로젝트 스캔]

### 병렬 분석 (Task A + Task B 동시 실행)

**Task A (domain-expert):**

#### 2단계: N+1 문제 분석
다음 패턴을 탐지:
- **Entity**: `@OneToMany`/`@ManyToMany` 없이 `FetchType.LAZY` 미지정
- **Repository**: `findAll()` 후 연관 Entity 접근 패턴
- **Service**: 루프 내 `findBy*` 호출
- **QueryDSL**: `fetchJoin()` 미사용

출력:
```
[N+1] User.orders — @OneToMany without FetchType.LAZY
  해결: fetch = FetchType.LAZY + @BatchSize(size = 100)
  또는: @EntityGraph(attributePaths = {"orders"})
```

체크포인트: [2/6 완료: N+1 분석]

#### 4단계: 트랜잭션 분석
- `@Transactional` 범위 확인 (불필요하게 넓은 범위)
- 읽기 전용 메서드에 `@Transactional(readOnly = true)` 미적용
- Controller에 `@Transactional` 사용 여부

출력:
```
[Transaction] UserService.getUser() — readOnly = true 누락
  해결: @Transactional(readOnly = true) 추가
```

체크포인트: [4/6 완료: 트랜잭션 분석]

**Task B (dba-expert):**

#### 3단계: 인덱스 분석
- `@Query`/QueryDSL에서 WHERE 조건 컬럼 추출
- `findBy*` 쿼리 메서드의 조건 컬럼 분석
- 복합 인덱스 필요 여부 판단

출력:
```
[인덱스] Order.userId + Order.status — 복합 인덱스 권장
  @Table(indexes = @Index(name = "idx_order_user_status", columnList = "user_id, status"))
```

체크포인트: [3/6 완료: 인덱스 분석]

#### 5단계: 쿼리 최적화
- `SELECT *` 대신 필요한 컬럼만 Projection
- 불필요한 Entity 전체 로드
- 페이징 없는 대량 조회

체크포인트: [5/6 완료: 쿼리 최적화]

### 6단계: 결과 보고서
두 Task 결과를 통합하여 보고서 생성:

```markdown
## 성능 최적화 보고서

| 카테고리 | 심각도 | 건수 |
|----------|--------|------|
| N+1 문제 | 🔴 Critical | N건 |
| 인덱스 누락 | 🔴 Critical | N건 |
| 트랜잭션 범위 | 🟡 Warning | N건 |
| 쿼리 최적화 | 🟢 Info | N건 |

### 상세 내역
(각 항목별 문제-해결 방안)
```

체크포인트: [6/6 완료: 보고서 생성]

### --fix 옵션 시
> 컨벤션: `templates/shared/ask-user-convention.md` 참조

분석 완료 후 수정 예정 항목을 출력하고 **`AskUserQuestion` 도구**로 확인받는다:

```
[수정 예정 항목]
- UserService.getUser() @Transactional(readOnly=true) 추가
- Order.user FetchType.LAZY 추가
```

- question: "위 항목을 자동 수정할까요?"
- header: "자동 수정"
- options:
  - `전체 수정 (Recommended)` — 모든 항목 자동 수정
  - `선택 수정` — 수정할 항목을 직접 지정
  - `취소` — 수정하지 않고 보고서만 유지

사용자 확인 후 코드 자동 수정:
- Entity에 `FetchType.LAZY` 추가
- Service 읽기 메서드에 `@Transactional(readOnly = true)` 추가
- 인덱스는 `@Table(indexes = ...)` 또는 Flyway migration 제안

## 다음 단계 안내
```
→ --fix 완료 후 → /qa build로 빌드 검증을 권장합니다
```
