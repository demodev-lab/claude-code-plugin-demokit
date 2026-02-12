---
name: dto
description: Request/Response DTO 생성 (record)
user_invocable: true
arguments:
  - name: name
    description: "도메인명 (PascalCase, 예: User)"
    required: true
  - name: fields
    description: "필드 정의"
    required: false
---

# /dto - DTO 생성

## 실행 절차

1. **반드시 Java `record`** 사용 (class 금지)
2. **파일 생성**:
   - `domain/{name}/dto/Create{Name}Request.java` (record + Bean Validation)
   - `domain/{name}/dto/Update{Name}Request.java` (record + Bean Validation)
   - `domain/{name}/dto/{Name}Response.java` (record + `from()` 정적 팩토리)
3. **Bean Validation**: record 컴포넌트에 직접 선언 (`@NotBlank`, `@Email` 등)
4. **Response.from()**: Entity→DTO 변환 단일 정의 (DRY)

## 관련 Agent
- api-expert

## 관련 템플릿
- `templates/code/dto.template.java`
