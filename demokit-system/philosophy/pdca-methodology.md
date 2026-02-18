# PDCA Methodology

## 개요

PDCA(Plan-Do-Check-Act)를 소프트웨어 개발에 맞게 확장한 6단계 방법론.

```
Plan → Design → Do → Analyze → Iterate → Report
                      ↑          ↓
                      ←← (반복) ←←
```

## 6단계

### 1. Plan (계획)
- 요구사항 정의
- API 엔드포인트 초안
- 데이터 모델 초안
- 담당: spring-architect, product-manager

### 2. Design (설계)
- DB 스키마 상세 설계
- API 상세 (Request/Response DTO)
- 패키지 구조 확정
- 담당: spring-architect, api-expert, domain-expert

### 3. Do (구현)
- Entity → Repository → Service → Controller → DTO → Test
- Spring Boot 레이어 의존성 순서대로 구현
- 담당: domain-expert, service-expert, api-expert

### 4. Analyze (분석)
- 설계 vs 구현 Gap 분석
- Match Rate 계산 (5개 항목 가중 평균)
- 담당: gap-detector, code-reviewer, test-expert

### 5. Iterate (반복)
- Match Rate < 90% 시 자동 수정 반복
- 최대 5회 반복
- 담당: pdca-iterator

### 6. Report (보고)
- 완료 보고서 생성
- 생성 파일 목록, API 요약, PDCA 이력
- 담당: report-generator

## Match Rate 계산

| 항목 | 가중치 |
|------|--------|
| API 엔드포인트 | 30% |
| DB 스키마 | 25% |
| DTO 필드 | 15% |
| 에러 처리 | 15% |
| 비즈니스 규칙 | 15% |

## Check-Act 반복 루프

Analyze 단계에서 Match Rate가 임계값(90%) 미만이면:
1. Gap 리포트에서 불일치 항목 추출
2. 불일치 유형별 수정 전략 결정
3. 코드 자동 수정
4. 재분석 (Analyze 재실행)
5. 90% 이상 또는 최대 반복 도달 시 종료

## 관련 문서
- [[core-mission]] — 핵심 미션
- [[context-engineering]] — 컨텍스트 엔지니어링
- [[../components/overview]] — 컴포넌트 총괄
