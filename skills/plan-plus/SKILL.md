---
name: plan-plus
description: 이 스킬은 사용자가 "plan-plus", "브레인스토밍", "강화 계획", "요구사항 분석"을 요청할 때 사용합니다. 6단계 브레인스토밍 강화 계획 수립.
---

# /plan-plus - 브레인스토밍 강화 계획

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/plan-plus — 6단계 브레인스토밍 강화 계획

사용법:
  /plan-plus {feature}

단계:
  1. Context Explore   - 기존 코드/도메인 탐색
  2. Intent Discover   - 사용자 의도 발견
  3. Alternatives      - 대안 2-3개 도출
  4. YAGNI Review      - 불필요한 기능 제거
  5. Incremental Verify - 점진적 검증 계획
  6. Plan Generate     - 최종 Plan 문서 생성

예시:
  /plan-plus user-management
  /plan-plus order-payment

관련 명령:
  /pdca plan — 기본 계획 수립
  /pipeline  — 9단계 개발 파이프라인
```

## HARD-GATE
**계획 승인 전 코드 작성 금지.** 6단계를 모두 완료하고 사용자 승인을 받은 후에만 구현을 시작한다.

## 실행 절차

### Stage 1: Context Explore (컨텍스트 탐색)
**담당 에이전트**: spring-architect

1. 프로젝트 구조 분석 (Glob으로 도메인/패키지 탐색)
2. 기존 유사 도메인이 있는지 확인
3. 현재 의존성/설정 파일 확인
4. 기존 코드 패턴 파악 (entity, service, controller 스타일)

**산출물**: 컨텍스트 요약 (기존 도메인 목록, 사용 패턴, 기술 스택)

### Stage 2: Intent Discover (의도 발견)
**담당 에이전트**: product-manager

1. 사용자 요청에서 핵심 의도 추출
2. 암묵적 요구사항 발견 (사용자가 명시하지 않았지만 필요한 것)
3. 비즈니스 규칙 정리
4. 사용자에게 확인 질문 (필요시)

**산출물**: 요구사항 목록 (MoSCoW 분류)

### Stage 3: Alternatives (대안 탐색)
**담당 에이전트**: spring-architect, domain-expert

1. 최소 2개, 최대 3개 구현 방안 도출
2. 각 방안의 장단점 비교 (테이블 형식)
3. 기술적 트레이드오프 분석
4. 권장 방안 선택 및 근거

**산출물**: 대안 비교표 + 권장안

### Stage 4: YAGNI Review
**담당 에이전트**: product-manager

1. Must 항목만 1차 구현 범위로 확정
2. Should/Could 항목 중 과도한 추상화 제거
3. "지금 필요하지 않은" 기능 명시적 제외
4. 제외 사유 기록

**산출물**: 최종 구현 범위 (포함/제외 목록)

### Stage 5: Incremental Verify (점진적 검증)
**담당 에이전트**: spring-architect

1. 구현 순서 결정 (의존성 그래프 기반)
2. 각 단계별 검증 포인트 정의
3. 테스트 전략 수립 (단위/통합/E2E)
4. 롤백 계획 (실패 시 복구 방법)

**산출물**: 단계별 구현 + 검증 계획

### Stage 6: Plan Generate (Plan 문서 생성)
**담당 에이전트**: product-manager

1. `templates/plan-plus.template.md` 기반으로 최종 문서 생성
2. `.pdca/{feature}/plan-plus.md`에 저장
3. 사용자에게 승인 요청

**산출물**: Plan Plus 문서 (승인 대기)
