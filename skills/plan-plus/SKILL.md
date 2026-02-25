---
name: plan-plus
description: 이 스킬은 사용자가 "plan-plus", "브레인스토밍", "강화 계획", "요구사항 분석"을 요청할 때 사용합니다. 5단계 브레인스토밍 강화 계획 수립.
---

# /plan-plus - 브레인스토밍 강화 계획

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/plan-plus — 5단계 브레인스토밍 강화 계획

사용법:
  /plan-plus {feature}
  /plan-plus {feature} --deep

단계:
  1. Context Explore   - 기존 코드/도메인 탐색 (병렬 Wave)
  2. Intent Discover   - 사용자 의도 + NFR 발견
  3. Alternatives      - 대안 도출 (--deep: Council 병렬)
  4. YAGNI Review      - 불필요한 기능 제거 (Adversarial)
  5. Plan Generate     - 최종 Plan 문서 생성 → .pdca/ 저장

플래그:
  --deep  Stage 3에서 spring-architect + api-expert + dba-expert
          Council 병렬 토론으로 심화 대안 분석

예시:
  /plan-plus user-management
  /plan-plus order-payment --deep

관련 명령:
  /pdca design — 다음 단계: 상세 설계
  /pdca plan   — 기본 계획 수립
  /pipeline    — 9단계 개발 파이프라인
```

## HARD-GATE
**계획 승인 전 코드 작성 금지.** 5단계를 모두 완료하고 사용자 승인을 받은 후에만 구현을 시작한다.

## --deep 플래그 감지
1. 인자에서 `--deep` 존재 여부를 파싱한다.
2. `--deep`이 있으면 `deepMode = true`로 설정하고, feature 이름에서 `--deep`을 제거한다.
3. `deepMode`에 따라 Stage 3의 실행 방식이 달라진다 (단독 vs Council 병렬).

## 보안 조건부 활성화
feature 이름에 아래 키워드가 포함되면 `securityMode = true`로 설정한다:
`auth`, `authentication`, `login`, `payment`, `order`, `user-management`, `user`, `member`, `permission`, `role`, `admin`, `token`, `oauth`, `jwt`

`securityMode = true`일 때:
- Stage 1: security-expert가 병렬 Wave에 추가된다.
- Stage 2: security-expert가 NFR 보안 항목을 보강한다.

## 인라인 체크포인트
각 Stage 완료 후 아래 형식으로 사용자에게 진행 상황을 보고하고, 다음 Stage 진행 여부를 확인받는다:
```
[Stage X/5: {단계명} 완료]
- 요약 1줄
- 요약 2줄
→ 다음 Stage로 진행할까요?
```

## 확인 질문 형식
> 컨벤션: `templates/shared/ask-user-convention.md` 참조

사용자에게 확인 질문을 할 때는 **반드시 `AskUserQuestion` 도구를 사용**한다. 줄글 질문 금지.

## 실행 절차

### Stage 1: Context Explore (컨텍스트 탐색)
**담당**: spring-architect(Coordinator) + domain-expert + api-expert (병렬 Wave)
**조건부**: `securityMode = true`이면 security-expert 추가

**Wave 병렬 탐색**:
- **spring-architect**: 프로젝트 구조, 빌드 설정, 공통 패턴 분석
- **domain-expert**: 기존 도메인 모델, Entity 관계, 비즈니스 규칙 탐색
- **api-expert**: 기존 API 패턴, DTO 구조, 엔드포인트 컨벤션 분석
- **security-expert** (조건부): 인증/인가 구조, 보안 설정 분석

**산출물**: 컨텍스트 요약 (기존 도메인 목록, 사용 패턴, 기술 스택, 보안 현황)

**체크포인트**: `[Stage 1/5: Context Explore 완료]`

### Stage 2: Intent Discover (의도 발견)
**담당**: product-manager (Lead)
**조건부**: `securityMode = true`이면 security-expert가 보안 NFR 보강

1. 사용자 요청에서 핵심 의도 추출
2. 암묵적 요구사항 발견 (사용자가 명시하지 않았지만 필요한 것)
3. 비즈니스 규칙 정리
4. **NFR 도출**: 성능, 보안, 확장성 요구사항을 테이블로 정리
5. **`AskUserQuestion` 도구로 확인 질문** — 구현 방향 확정에 필요한 결정 사항을 선택형으로 질문한다 (줄글 질문 금지)

**산출물**: 요구사항 목록 (MoSCoW 분류) + NFR 테이블

**체크포인트**: `[Stage 2/5: Intent Discover 완료]`

### Stage 3: Alternatives (대안 탐색)
**담당**:
- 기본 모드: spring-architect 단독
- `--deep` 모드: spring-architect(Coordinator) + api-expert + dba-expert (Council 병렬)

**기본 모드**:
1. 최소 2개, 최대 3개 구현 방안 도출
2. 각 방안의 장단점 비교 (테이블 형식)
3. 기술적 트레이드오프 분석
4. 각 방안에 API 힌트 + 데이터 모델 힌트 포함 (경량, 상세는 /pdca design에서)
5. 권장 방안 선택 및 근거

**--deep Council 병렬 모드**:
- **spring-architect**: 아키텍처 관점 대안 도출
- **api-expert**: API 설계 관점 대안 평가 + API 힌트 생성
- **dba-expert**: 데이터 모델 관점 대안 평가 + 데이터 모델 힌트 생성
- Coordinator(spring-architect)가 3인 결과를 종합하여 권장안 확정

**산출물**: 대안 비교표 + 권장안 (API/데이터 모델 힌트 포함)

**체크포인트**: `[Stage 3/5: Alternatives 완료]`

### Stage 4: YAGNI Review
**담당**: product-manager(Lead) + test-expert(필수)

**Adversarial 검토** — "기능 범위(Stage 2) ≠ 구현 복잡도(Stage 4)":
- **product-manager**: 비즈니스 가치 관점에서 Must 항목만 1차 구현 범위로 확정
- **test-expert**: 구현 복잡도 관점에서 테스트 가능성, 검증 비용 평가

1. Must 항목만 1차 구현 범위로 확정
2. Should/Could 항목 중 과도한 추상화 제거
3. "지금 필요하지 않은" 기능을 **Non-Goals**로 명시적 제외
4. 제외 사유 기록 (비즈니스 가치 + 구현 복잡도 양면)

**산출물**: 최종 구현 범위 (포함/Non-Goals 목록)

**체크포인트**: `[Stage 4/5: YAGNI Review 완료]`

### Stage 5: Plan Generate (Plan 문서 생성)
**담당**: spring-architect(Pre-flight) → product-manager(Lead)

**Pre-flight 체크리스트** (spring-architect):
- [ ] Stage 1 컨텍스트가 권장안에 반영되었는가?
- [ ] Stage 2 NFR이 구현 방향에 포함되었는가?
- [ ] Stage 3 권장안이 Stage 4에서 축소/변경되지 않았는가? (변경 시 사유 명시)
- [ ] Non-Goals가 명확히 문서화되었는가?
- [ ] 구현 방향이 /pdca design으로 이어질 수 있는 수준인가?

**미충족 항목이 있으면**: 해당 Stage로 회귀하여 보완한다.

**Pre-flight 통과 후** (product-manager):
1. `templates/plan-plus.template.md` 기반으로 최종 문서 생성
2. `.pdca/{feature}/plan.md`에 저장
3. PDCA 상태 자동 초기화 (`plan` phase, status: `in-progress`)
4. 사용자에게 승인 요청

**산출물**: Plan 문서 (`.pdca/{feature}/plan.md`, 승인 대기)

**PDCA 연동**:
- 출력 경로: `.pdca/{feature}/plan.md` (PDCA deliverable glob 패턴에 자동 매칭)
- 승인 후 안내: `> 다음: /pdca design {{feature}}`
