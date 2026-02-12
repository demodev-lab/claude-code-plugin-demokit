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
