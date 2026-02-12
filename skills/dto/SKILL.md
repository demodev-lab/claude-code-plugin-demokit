---
name: dto
description: 이 스킬은 사용자가 "DTO 생성", "Request/Response", "dto"를 요청할 때 사용합니다. Java record 기반 Request/Response DTO를 생성합니다.
---

# /dto - DTO 생성

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/dto — Java record 기반 Request/Response DTO 생성

사용법:
  /dto {Name} [fields]

파라미터:
  Name    PascalCase 도메인명 (필수)
  fields  필드 목록 (선택, 형식: name:String, email:String)

예시:
  /dto User name:String, email:String
  /dto Order orderNumber:String, totalAmount:BigDecimal

관련 명령:
  /entity — JPA Entity 생성
  /crud   — CRUD 일괄 생성
```

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
