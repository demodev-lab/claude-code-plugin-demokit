# Report: {{featureName}}

> 생성일: {{createdAt}}
> 완료일: {{completedAt}}
> 최종 Match Rate: {{finalMatchRate}}%

---

## 요약

- **기능**: {{featureName}}
- **PDCA 반복 횟수**: {{iterationCount}}회
- **생성된 파일**: {{fileCount}}개
- **최종 Match Rate**: {{finalMatchRate}}%

---

## 생성된 파일 목록

```
{{#files}}
{{path}}
{{/files}}
```

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
{{#apis}}
| {{method}} | {{path}} | {{description}} |
{{/apis}}

---

## PDCA 이력

| 단계 | 시작 | 완료 | 비고 |
|------|------|------|------|
{{#phases}}
| {{phase}} | {{startedAt}} | {{completedAt}} | {{note}} |
{{/phases}}

---

## 적용된 패턴

- Java 21 record DTO
- ProblemDetail (RFC 9457) 에러 응답
- Repository default 메서드 패턴
- BaseEntity 상속 (DRY)
- Entity.create()/update() 비즈니스 메서드
- Response.from() 정적 팩토리
{{#hasQuerydsl}}
- QueryDSL Custom Repository (BooleanExpression 메서드 분리)
{{/hasQuerydsl}}

---

## 코드 품질

| 항목 | 상태 |
|------|------|
| DRY 패턴 적용 | {{dryStatus}} |
| Clean Code / SRP | {{srpStatus}} |
| Spring Boot 3.5 Best Practices | {{bpStatus}} |
| Bean Validation 적용 | {{validationStatus}} |

---

## 테스트 결과

| 테스트 유형 | 통과 | 실패 | 건너뜀 |
|------------|------|------|--------|
{{#testResults}}
| {{type}} | {{passed}} | {{failed}} | {{skipped}} |
{{/testResults}}

---

## 다음 단계

1. 성능 테스트 및 최적화
2. 보안 검토
3. 프로덕션 배포 준비
