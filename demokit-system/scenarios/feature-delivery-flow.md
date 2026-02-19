# Feature Delivery Flow (PDCA)

신규 기능을 가장 안전하게 전달하기 위한 표준 시나리오.

## 목적
- 요구사항 누락 최소화
- 설계/구현 불일치 조기 발견
- 반복 수정 비용 절감

## 권장 플로우
1. `/init`
2. `/pdca plan {feature}`
3. `/pdca design {feature}`
4. `/pdca do {feature}`
5. `/pdca analyze {feature}`
6. (필요 시) `/pdca iterate {feature}`
7. `/test {feature} all`
8. `/review {feature}`
9. `/pdca report {feature}`

## 완료 조건
- match rate >= 팀 기준(기본 90)
- 테스트 통과
- 리뷰 주요 이슈 해소

## 실패 시 복구
- 분석 단계로 되돌아가 gap 항목 우선 수정
- 범위가 커지면 feature를 하위 feature로 분할
