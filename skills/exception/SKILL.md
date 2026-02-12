---
name: exception
description: 이 스킬은 사용자가 "예외 처리", "exception", "GlobalExceptionHandler"를 요청할 때 사용합니다. 도메인 예외 및 GlobalExceptionHandler를 생성합니다.
---

# /exception - 예외 처리 설정

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/exception — 도메인 예외 및 GlobalExceptionHandler 생성

사용법:
  /exception {Name}

파라미터:
  Name  PascalCase 도메인명 (필수)

예시:
  /exception User
  /exception Order

관련 명령:
  /crud   — CRUD 일괄 생성
  /entity — JPA Entity 생성
```

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
