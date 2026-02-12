---
name: controller
description: REST Controller 생성
user_invocable: true
arguments:
  - name: name
    description: "도메인명 (PascalCase, 예: User)"
    required: true
---

# /controller - REST Controller 생성

## 실행 절차

1. **Controller 파일 생성**: `domain/{name}/controller/{Name}Controller.java`
2. **@RestController + @RequestMapping("/api/v1/{names}")** (복수형)
3. **HTTP 메서드 매핑**:
   - POST → 201 Created + Location header
   - GET → 200 (직접 반환)
   - PUT → 200 (직접 반환)
   - DELETE → 204 No Content
4. **@Valid** record DTO 검증
5. **var** 지역 변수 타입 추론

## 관련 Agent
- api-expert

## 관련 템플릿
- `templates/code/controller.template.java`
