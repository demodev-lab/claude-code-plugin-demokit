---
name: controller
description: 이 스킬은 사용자가 "Controller 생성", "컨트롤러", "controller"를 요청할 때 사용합니다. REST Controller를 생성합니다.
---

# /controller - REST Controller 생성

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/controller — REST Controller 생성

사용법:
  /controller {Name}

파라미터:
  Name  PascalCase 도메인명 (필수)

예시:
  /controller User
  /controller Order

관련 명령:
  /service — Service 레이어 생성
  /crud    — CRUD 일괄 생성
```

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
