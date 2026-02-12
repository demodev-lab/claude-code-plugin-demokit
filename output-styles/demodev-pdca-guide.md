# PDCA 가이드 Output Style

> PDCA 워크플로우 진행 시 사용하는 응답 스타일

---

## Phase별 응답 형식

### Plan Phase

```
## 📋 Plan: {feature}

### 요구사항
| # | 요구사항 | 우선순위 | 비고 |
|---|---------|---------|------|
| 1 | ...     | 필수    |      |

### API 초안
| Method | Path | 설명 | Request | Response |
|--------|------|------|---------|----------|

### 데이터 모델 초안
| Entity | 주요 필드 | 관계 |
|--------|----------|------|

### 다음 단계
`/pdca design {feature}` 로 상세 설계를 진행하세요.
```

### Design Phase

```
## 📐 Design: {feature}

### DB 스키마
| 테이블 | 컬럼 | 타입 | 제약조건 | 설명 |
|--------|------|------|---------|------|

### API 상세
| # | Method | Path | Request Body | Response | Status |
|---|--------|------|-------------|----------|--------|

### 패키지 구조
{basePackage}/domain/{name}/
├── {Name}.java          (Entity)
├── {Name}Repository.java
├── {Name}Service.java
├── {Name}Controller.java
└── dto/
    ├── {Name}Request.java
    └── {Name}Response.java

### 예외 처리
| 상황 | HTTP Status | ProblemDetail type |
|------|------------|-------------------|

### 다음 단계
`/pdca do {feature}` 로 구현을 시작하세요.
```

### Do Phase

```
## 🔨 Do: {feature}

### 구현 순서
Phase 1 (순차):
1. ☐ Entity + BaseEntity 상속
2. ☐ Repository + Custom (QueryDSL)

Phase 2 (병렬 — 한 메시지에서 동시에 Task 호출):
3. ☐ Service + 트랜잭션 경계
4. ☐ DTO (record) + Response.from()
5. ☐ Controller + @Valid
6. ☐ 예외 처리 (ProblemDetail)

Phase 3 (순차):
7. ☐ 테스트

### 진행 상황
| 단계 | 파일 | 상태 |
|------|------|------|
| Entity | {Name}.java | ✅ 완료 |
| Repository | {Name}Repository.java | 🔄 진행중 |
| ... | | ☐ 대기 |
```

### Analyze Phase

```
## 🔍 Analyze: {feature}

### Match Rate: {rate}%

| 카테고리 | 가중치 | 설계 | 구현 | 일치율 |
|----------|--------|------|------|--------|
| API 엔드포인트 | 30% | {n}개 | {m}개 | {x}% |
| DB 스키마 | 25% | {n}개 | {m}개 | {x}% |
| DTO 필드 | 15% | {n}개 | {m}개 | {x}% |
| 에러 처리 | 15% | {n}개 | {m}개 | {x}% |
| 비즈니스 규칙 | 15% | {n}개 | {m}개 | {x}% |

### Gap 목록
| # | 카테고리 | 설계 내용 | 구현 상태 | 심각도 |
|---|---------|----------|----------|--------|

### 판정
- Match Rate ≥ 90%: ✅ **통과** → `/pdca report {feature}`
- Match Rate < 90%: ⚠️ **미달** → `/pdca iterate {feature}`
```

### Iterate Phase

```
## 🔄 Iterate: {feature} (반복 {n}/{max})

### 수정 대상 (우선순위순)
| # | Gap | 수정 파일 | 조치 |
|---|-----|----------|------|

### 수정 결과
| # | 수정 전 | 수정 후 | 상태 |
|---|--------|--------|------|

### 재분석 결과
- 이전 Match Rate: {before}%
- 현재 Match Rate: {after}%
- 변화: +{diff}%
```

### Report Phase

```
## 📊 Report: {feature}

### 요약
| 항목 | 값 |
|------|-----|
| Feature | {feature} |
| 최종 Match Rate | {rate}% |
| 반복 횟수 | {n}회 |
| 생성 파일 수 | {count}개 |

### 생성 파일 목록
| 파일 | 유형 | 설명 |
|------|------|------|

### API 목록
| Method | Path | 설명 |
|--------|------|------|

### 품질 체크
- [x] BaseEntity 상속
- [x] DTO record 사용
- [x] ProblemDetail 에러 처리
- [x] Response.from() 패턴
- [x] @Transactional 적용
- [x] 테스트 작성
```

---

## 상태 표시

```
### PDCA 현재 상태
| Feature | Phase | Match Rate | 진행 |
|---------|-------|------------|------|
| user-management | Do | - | 🔄 진행중 |
| order | Plan | - | ☐ 대기 |
```

---

## 컨벤션 참조 테이블

| 항목 | 규칙 |
|------|------|
| Entity | BaseEntity 상속, @SQLRestriction soft delete |
| Repository | JpaRepository + Custom (QueryDSL) |
| Service | @Service + @Transactional(readOnly=true) 기본 |
| Controller | @RestController + @RequestMapping("/api/v1/{domain}") |
| DTO | Java record 필수, Response.from() 팩토리 |
| 에러 | ProblemDetail (RFC 9457) + GlobalExceptionHandler |
| 쿼리 | 단순→메서드쿼리, 중간→@Query, 복잡→QueryDSL |
| 테스트 | @MockitoBean, @Nested, BDDMockito |
