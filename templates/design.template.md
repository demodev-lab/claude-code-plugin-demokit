# Design: {{featureName}}

> 생성일: {{createdAt}}
> 상태: {{status}}
> Plan 참조: `.pdca/{{featureName}}/plan.md`

---

## 1. DB 스키마

### {{tableName}} 테이블
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
{{#columns}}
| {{name}} | {{type}} | {{constraints}} | {{description}} |
{{/columns}}

### 인덱스
{{#indexes}}
- `idx_{{tableName}}_{{columns}}`: {{description}}
{{/indexes}}

### 연관관계 매핑
```
{{entityRelationDiagram}}
```

---

## 2. API 상세 스펙

{{#apis}}
### {{method}} {{path}}
- **설명**: {{description}}
- **인증**: {{auth}}

**Request**
{{#hasRequestBody}}
```json
{{requestBody}}
```
{{/hasRequestBody}}

**Response ({{successStatus}})**
```json
{{responseBody}}
```

**에러 응답**
| 상태 코드 | 코드 | 설명 |
|-----------|------|------|
{{#errors}}
| {{status}} | {{code}} | {{message}} |
{{/errors}}

---
{{/apis}}

## 3. 패키지 구조

```
{{basePackage}}/
├── common/
│   ├── config/
│   ├── domain/
│   │   └── BaseEntity.java
│   ├── exception/
│   │   └── GlobalExceptionHandler.java
│   └── security/
└── domain/
    └── {{domainName}}/
        ├── controller/
        │   └── {{EntityName}}Controller.java
        ├── dto/
        │   ├── Create{{EntityName}}Request.java    (record)
        │   ├── Update{{EntityName}}Request.java    (record)
        │   └── {{EntityName}}Response.java         (record)
        ├── entity/
        │   └── {{EntityName}}.java
        ├── exception/
        │   └── {{EntityName}}NotFoundException.java
        ├── repository/
        │   └── {{EntityName}}Repository.java
        └── service/
            └── {{EntityName}}Service.java
```

---

## 4. 구현 순서

1. [ ] Entity: `{{EntityName}}.java`
2. [ ] Repository: `{{EntityName}}Repository.java`
3. [ ] Service: `{{EntityName}}Service.java`
4. [ ] Request DTO: `{{EntityName}}Request.java`
5. [ ] Response DTO: `{{EntityName}}Response.java`
6. [ ] Controller: `{{EntityName}}Controller.java`
7. [ ] Exception: `{{EntityName}}NotFoundException.java`
8. [ ] Test: `{{EntityName}}ServiceTest.java`
9. [ ] Test: `{{EntityName}}ControllerTest.java`

---

## 5. 비즈니스 규칙
{{#businessRules}}
- **{{name}}**: {{description}}
{{/businessRules}}

---

## 다음 단계
→ `/pdca do {{featureName}}` 으로 구현 진행
