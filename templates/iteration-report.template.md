# Iteration Report: {{featureName}} (#{{iterationNumber}})

> 생성일: {{createdAt}}
> 이전 Match Rate: {{previousRate}}%
> 현재 Match Rate: {{currentRate}}%
> 개선: +{{improvement}}%

---

## 수정 내역

{{#changes}}
### {{file}}
- **변경 종류**: {{type}}
- **설명**: {{description}}
{{/changes}}

---

## Gap 해소 현황

| 항목 | 이전 | 현재 | 변화 |
|------|------|------|------|
{{#gapChanges}}
| {{category}} | {{previousRate}}% | {{currentRate}}% | {{delta}} |
{{/gapChanges}}

---

## 다음 조치
{{#needsMore}}
→ Match Rate {{currentRate}}% < 90% → 추가 반복 필요
{{/needsMore}}
{{^needsMore}}
→ Match Rate {{currentRate}}% ≥ 90% → `/pdca report {{featureName}}`
{{/needsMore}}
