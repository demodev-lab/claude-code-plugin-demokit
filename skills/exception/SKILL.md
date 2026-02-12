---
name: exception
description: 이 스킬은 사용자가 "예외 처리", "exception", "GlobalExceptionHandler"를 요청할 때 사용합니다. 도메인 예외 및 GlobalExceptionHandler를 생성합니다.
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
