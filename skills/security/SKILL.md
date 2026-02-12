---
name: security
description: 이 스킬은 사용자가 "Security", "security", "JWT", "OAuth2", "인증"을 요청할 때 사용합니다. Spring Security 설정을 생성합니다 (JWT/OAuth2).
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
