---
name: pdca
description: 이 스킬은 사용자가 "PDCA", "pdca plan", "pdca design", "pdca do", "pdca analyze", "pdca iterate", "pdca report", "pdca status", "pdca next"를 요청할 때 사용합니다. PDCA 워크플로우 관리 (Plan → Design → Do → Analyze → Iterate → Report).
---

# /pdca - PDCA 워크플로우

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/pdca — PDCA 워크플로우 관리

사용법:
  /pdca {subcommand} {feature}

하위 명령:
  plan      요구사항 정의 + API 초안 + 데이터 모델 초안
  design    DB 스키마 상세 + API 상세 + 패키지 구조
  do        Entity → Repo → Service → Controller → DTO → Test 구현
  analyze   설계 vs 구현 Gap 분석
  iterate   Match Rate < 90% 시 자동 수정 반복
  report    완료 보고서 생성
  status    현재 PDCA 상태 조회
  next      다음 단계 안내
  archive   완료된 feature 아카이브
  cleanup   완료된 모든 feature 일괄 아카이브
  force-stop  PDCA 미완료 차단 해제 (강제 종료)

예시:
  /pdca plan user-management
  /pdca design user-management
  /pdca do user-management
  /pdca status
  /pdca next
  /pdca force-stop
  /pdca archive user-management
  /pdca cleanup

관련 명령:
  /crud — CRUD 일괄 생성
  /test — 테스트 코드 생성
  /loop — 자동 반복 실행
```

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
2. **병렬 설계** — 다음 Task들을 한 메시지에서 동시에 호출:
   - Task 1 (domain-expert): DB 스키마 상세 설계 (테이블, 컬럼, 제약조건, 인덱스)
   - Task 2 (api-expert): API 상세 스펙 (Request/Response Body, 상태 코드)
3. spring-architect가 결과를 통합하여 Design 문서 생성 (`.pdca/{feature}/design.md`):
   - DB 테이블 스키마
   - API 상세 스펙
   - Entity 관계도
   - 패키지별 클래스 목록
   - 구현 순서
4. 상태 업데이트: design → completed

### /pdca do {feature}
**Entity → Repo → Service → Controller → DTO → Test 구현**

1. Design 문서 로드
2. Phase별 병렬 구현:
   **Phase 1 (순차)**: Entity + Repository (domain-expert)
   **Phase 2 (병렬)** — 한 메시지에서 동시에 호출:
   - Task 1 (service-expert): Service
   - Task 2 (api-expert): Controller + DTO
   **Phase 3 (순차)**: Test (test-expert)
3. 각 단계 완료 시 상태 업데이트
4. 상태 업데이트: do → completed

### /pdca force-stop
**PDCA 미완료 차단 해제**

PDCA가 진행 중일 때 종료(Stop)가 차단됩니다. 강제로 종료하려면 이 명령을 사용합니다.

1. `.pdca/.force-stop` 마커 파일 생성
2. 다음 Stop 시 차단이 해제되어 정상 종료됨
3. 마커 파일은 사용 후 자동 삭제

### /pdca analyze {feature}
**설계 vs 구현 Gap 분석**

0. **빌드/테스트 검증** (pdca.verificationEnabled가 true일 때만):
   - `lib/pdca/verify.ts`(컴파일: `dist/lib/pdca/verify.js`)로 빌드 도구 자동 감지
   - Bash로 빌드/테스트 명령 실행 (gradle: `./gradlew test`, maven: `./mvnw test`, npm: `npm test`)
   - 결과를 `.pdca/{feature}/verification.json`에 저장
   - 빌드 실패 시 경고 표시 후 gap 분석은 계속 진행
1. Design 문서와 실제 구현 코드 비교
2. **병렬 Gap 분석** — 다음 Task들을 한 메시지에서 동시에 호출:
   - Task 1: API 엔드포인트 + DTO 필드 일치율 분석
   - Task 2: DB 스키마 + Entity 일치율 분석
   - Task 3: 비즈니스 규칙 + 에러 처리 일치율 분석
3. 결과 통합하여 Match Rate 산출:
   - API 엔드포인트 (30%): 설계된 엔드포인트가 모두 구현되었는지
   - DB 스키마 (25%): 설계된 테이블/컬럼이 Entity에 반영되었는지
   - DTO 필드 (15%): 설계된 Request/Response 필드가 DTO에 있는지
   - 에러 처리 (15%): 설계된 에러 케이스가 처리되는지
   - 비즈니스 규칙 (15%): 설계된 로직이 Service에 구현되었는지
4. **품질 보조 지표** (선택적 표시):
   - /review: 🔴 Critical N건, 🟡 Warning N건 (마지막 실행 결과)
   - /qa: BUILD SUCCESS/FAILED, 테스트 통과율 N%
5. 분석 보고서 생성 (`.pdca/{feature}/analysis.md`)
6. 상태 업데이트: analyze → completed, matchRate 기록

→ 빌드/테스트 검증이 필요하면: /qa

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

### /pdca archive {feature}
**완료된 feature 아카이브**

1. feature의 status.json + 관련 문서를 `.pdca/_archive/{feature}_{timestamp}/`로 이동
2. `listFeatures()`에서 제외되어 상태 조회 시 표시되지 않음
3. 아카이브된 데이터는 삭제되지 않고 보관됨

### /pdca cleanup
**완료된 모든 feature 일괄 아카이브**

1. report 단계가 completed인 모든 feature를 자동으로 아카이브
2. 아카이브 결과 요약 출력
3. `.pdca/` 디렉토리 정리

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
- `lib/pdca/archive.js` - 아카이브/클린업
