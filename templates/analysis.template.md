# Analysis: {{featureName}}

> 생성일: {{createdAt}}
> 상태: {{status}}
> Design 참조: `.pdca/{{featureName}}/design.md`

---

## Match Rate 요약

| 항목 | 가중치 | 매칭률 | 상태 |
|------|--------|--------|------|
| API 엔드포인트 | 30% | {{apiRate}}% | {{apiStatus}} |
| DB 스키마 | 25% | {{dbRate}}% | {{dbStatus}} |
| DTO 필드 | 15% | {{dtoRate}}% | {{dtoStatus}} |
| 에러 처리 | 15% | {{errorRate}}% | {{errorStatus}} |
| 비즈니스 규칙 | 15% | {{ruleRate}}% | {{ruleStatus}} |
| **총 Match Rate** | **100%** | **{{totalRate}}%** | **{{totalStatus}}** |

---

## Gap 상세

{{#gaps}}
### {{category}} ({{rate}}%)
- 설계: {{total}}개
- 구현: {{matched}}개
- 누락: {{missing}}개

**누락 항목:**
{{#missingItems}}
- {{description}}
{{/missingItems}}
{{/gaps}}

---

## 권장 조치

{{#recommendations}}
- [ ] {{description}}
{{/recommendations}}

---

## 다음 단계
{{#needsIteration}}
→ Match Rate {{totalRate}}% < 90% → `/pdca iterate {{featureName}}` 으로 자동 수정
{{/needsIteration}}
{{^needsIteration}}
→ Match Rate {{totalRate}}% ≥ 90% → `/pdca report {{featureName}}` 으로 완료 보고서 생성
{{/needsIteration}}
