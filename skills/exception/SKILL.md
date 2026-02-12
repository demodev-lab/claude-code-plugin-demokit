---
name: exception
description: 도메인 예외 + GlobalExceptionHandler 생성
user_invocable: true
arguments:
  - name: name
    description: "도메인명 (PascalCase, 예: User)"
    required: true
---

# /exception - 예외 처리 설정

## 실행 절차

1. **도메인 예외 생성**: `domain/{name}/exception/{Name}NotFoundException.java`
   - `RuntimeException` 상속
   - `String.formatted()` 메시지
2. **GlobalExceptionHandler** (없으면 생성):
   - `common/exception/GlobalExceptionHandler.java`
   - `@RestControllerAdvice extends ResponseEntityExceptionHandler`
   - ProblemDetail (RFC 9457) 기반
   - 4xx → warn 로그, 5xx → error 로그
3. **ProblemDetail 활성화 안내**: `spring.mvc.problemdetails.enabled=true`

## 관련 Agent
- api-expert

## 관련 템플릿
- `templates/code/exception.template.java`
