---
name: pdca
description: PDCA 워크플로우 관리 (Plan → Design → Do → Analyze → Iterate → Report)
user_invocable: true
arguments:
  - name: command
    description: "하위 명령 (plan, design, do, analyze, iterate, report, status, next)"
    required: true
  - name: feature
    description: 기능명 (kebab-case 권장, 예: user-management)
    required: false
---

# /pdca - PDCA 워크플로우

## 하위 명령

### /pdca plan {feature}
**요구사항 정의 + API 초안 + 데이터 모델 초안**

1. feature명으로 PDCA 상태 파일 생성 (`.pdca/{feature}.status.json`)
2. spring-architect 에이전트 호출
3. 사용자와 대화형으로 요구사항 수집:
   - 핵심 기능 목록
   - 사용자 역할 (Role)
   - 외부 시스템 연동 여부
4. Plan 문서 생성 (`.pdca/{feature}/plan.md`):
   - 요구사항 목록
   - API 엔드포인트 초안 (Method + Path + 설명)
   - Entity 초안 (이름 + 주요 필드)
   - 기술적 고려사항
5. 상태 업데이트: plan → completed

### /pdca design {feature}
**DB 스키마 상세 + API 상세 + 패키지 구조**

1. Plan 문서 로드 및 확인
2. spring-architect + domain-expert + api-expert 에이전트 협업
3. Design 문서 생성 (`.pdca/{feature}/design.md`):
   - DB 테이블 스키마 (컬럼, 타입, 제약조건, 인덱스)
   - API 상세 스펙 (Request Body, Response Body, 상태 코드)
   - Entity 관계도
   - 패키지별 클래스 목록
   - 구현 순서
4. 상태 업데이트: design → completed

### /pdca do {feature}
**Entity → Repo → Service → Controller → DTO → Test 구현**

1. Design 문서 로드
2. 구현 순서대로 코드 생성:
   - Entity + Repository (domain-expert)
   - Service (service-expert)
   - Controller + DTO (api-expert)
   - Test (test-expert)
3. 각 단계 완료 시 상태 업데이트
4. 상태 업데이트: do → completed

### /pdca analyze {feature}
**설계 vs 구현 Gap 분석**

1. Design 문서와 실제 구현 코드 비교
2. gap-detector 에이전트 호출
3. Match Rate 산출:
   - API 엔드포인트 (30%): 설계된 엔드포인트가 모두 구현되었는지
   - DB 스키마 (25%): 설계된 테이블/컬럼이 Entity에 반영되었는지
   - DTO 필드 (15%): 설계된 Request/Response 필드가 DTO에 있는지
   - 에러 처리 (15%): 설계된 에러 케이스가 처리되는지
   - 비즈니스 규칙 (15%): 설계된 로직이 Service에 구현되었는지
4. 분석 보고서 생성 (`.pdca/{feature}/analysis.md`)
5. 상태 업데이트: analyze → completed, matchRate 기록

### /pdca iterate {feature}
**Match Rate < 90% 시 자동 수정 반복**

1. 분석 결과에서 Gap 항목 추출
2. Gap 항목별 자동 수정 실행 (pdca-iterator 에이전트)
3. 수정 후 다시 analyze 실행
4. Match Rate ≥ 90% 또는 최대 5회 반복 시 종료
5. 반복 보고서 생성 (`.pdca/{feature}/iteration-report.md`)
6. 상태 업데이트: iterate → completed

### /pdca report {feature}
**완료 보고서**

1. 전체 PDCA 과정 요약
2. report-generator 에이전트 호출
3. 최종 보고서 생성 (`.pdca/{feature}/report.md`):
   - 기능 요약
   - 구현된 API 목록
   - DB 스키마
   - 최종 Match Rate
   - 소요 시간
4. 상태 업데이트: report → completed

### /pdca status
**현재 PDCA 상태 조회**

- 모든 활성 feature의 현재 phase 표시
- 각 phase별 진행률
- 마지막 업데이트 시간

### /pdca next
**다음 단계 안내**

- 현재 feature의 다음 수행할 phase 안내
- 필요한 선행 조건 확인
- 실행 명령 제안

## Match Rate 가중치
| 항목 | 가중치 |
|------|--------|
| API 엔드포인트 | 30% |
| DB 스키마 | 25% |
| DTO 필드 | 15% |
| 에러 처리 | 15% |
| 비즈니스 규칙 | 15% |

## 사용 예시
```
/pdca plan user-management
/pdca design user-management
/pdca do user-management
/pdca analyze user-management
/pdca iterate user-management
/pdca report user-management
/pdca status
/pdca next
```

## 관련 라이브러리
- `lib/pdca/status.js` - 상태 관리
- `lib/pdca/phase.js` - Phase 전이 규칙
- `lib/pdca/level.js` - 레벨별 가이드
