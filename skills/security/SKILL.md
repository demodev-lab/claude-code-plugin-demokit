---
name: security
description: 이 스킬은 사용자가 "Security", "security", "JWT", "OAuth2", "인증"을 요청할 때 사용합니다. Spring Security 설정을 생성합니다 (JWT/OAuth2).
---

# /security - Spring Security 설정

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/security — Spring Security 설정 생성

사용법:
  /security [jwt|oauth2]

옵션:
  jwt     JWT 인증 설정 (기본)
  oauth2  OAuth2 Resource Server 설정

예시:
  /security
  /security jwt
  /security oauth2

관련 명령:
  /config   — Spring 설정 클래스 생성
  /api-docs — API 문서화 설정 생성
```

## 실행 절차

### JWT 인증 (기본)

**Phase 1 — 병렬 파일 생성**
다음 Task들을 **한 메시지에서 동시에 호출**한다:

| Task # | 파일 | 위치 |
|--------|------|------|
| Task 1 | SecurityConfig | `common/security/SecurityConfig.java` |
| Task 2 | JwtProvider | `common/security/JwtProvider.java` |
| Task 3 | JwtAuthFilter | `common/security/JwtAuthFilter.java` |
| Task 4 | JwtProperties | `common/security/JwtProperties.java` |
| Task 5 | AuthController (선택) | `domain/auth/controller/AuthController.java` |

**Phase 2 — 의존성 안내** (순차)
- `spring-boot-starter-security`, `jjwt` 의존성 안내

### OAuth2 Resource Server
1. SecurityConfig + OAuth2 Resource Server 설정
2. `spring-boot-starter-oauth2-resource-server` 의존성

## 관련 Agent
- security-expert
