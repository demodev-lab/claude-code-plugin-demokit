# Plan: {{featureName}}

> 생성일: {{createdAt}}
> 상태: {{status}}

---

## 1. 요구사항

### 핵심 기능
{{#requirements}}
- [ ] {{description}}
{{/requirements}}

### 사용자 역할
{{#roles}}
- **{{name}}**: {{description}}
{{/roles}}

### 비기능 요구사항
- 성능: {{performanceRequirement}}
- 보안: {{securityRequirement}}

---

## 2. API 엔드포인트 초안

| Method | Path | 설명 | 비고 |
|--------|------|------|------|
{{#endpoints}}
| {{method}} | {{path}} | {{description}} | {{note}} |
{{/endpoints}}

---

## 3. 데이터 모델 초안

### {{entityName}}
| 필드 | 타입 | 설명 | 제약조건 |
|------|------|------|----------|
{{#fields}}
| {{name}} | {{type}} | {{description}} | {{constraints}} |
{{/fields}}

### 연관관계
{{#relations}}
- {{from}} → {{to}}: {{type}} ({{description}})
{{/relations}}

---

## 4. 기술적 고려사항
{{#considerations}}
- {{item}}
{{/considerations}}

---

## 5. 외부 의존성
{{#externalDeps}}
- **{{name}}**: {{reason}}
{{/externalDeps}}

---

## 다음 단계
→ `/pdca design {{featureName}}` 으로 상세 설계 진행
