---
name: security
description: Spring Security 설정 (JWT/OAuth2)
user_invocable: true
arguments:
  - name: type
    description: "인증 방식 (jwt, oauth2, basic)"
    required: false
---

# /security - Spring Security 설정

## 실행 절차

### JWT 인증 (기본)
1. **SecurityConfig**: `common/security/SecurityConfig.java`
   - SecurityFilterChain Bean (Lambda DSL)
   - Stateless 세션, CSRF 비활성화
2. **JwtProvider**: `common/security/JwtProvider.java`
   - 토큰 생성/검증/파싱
3. **JwtAuthFilter**: `common/security/JwtAuthFilter.java`
   - OncePerRequestFilter 상속
4. **JwtProperties**: `common/security/JwtProperties.java`
   - `@ConfigurationProperties record` (secret, expiration 등)
5. **AuthController**: `domain/auth/controller/AuthController.java` (선택)
6. **의존성 안내**: `spring-boot-starter-security`, `jjwt`

### OAuth2 Resource Server
1. SecurityConfig + OAuth2 Resource Server 설정
2. `spring-boot-starter-oauth2-resource-server` 의존성

## 관련 Agent
- security-expert
