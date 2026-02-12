---
name: api-docs
description: API 문서화 설정 (SpringDoc/Swagger)
user_invocable: true
arguments: []
---

# /api-docs - API 문서화

## 실행 절차

1. **의존성 추가**: `springdoc-openapi-starter-webmvc-ui`
2. **OpenApiConfig**: `common/config/OpenApiConfig.java`
   - `@OpenAPIDefinition` 또는 `OpenAPI` Bean
   - API 제목, 버전, 설명
   - 서버 URL 설정
3. **Security 스키마** (JWT 사용 시):
   - Bearer Token 인증 스키마 추가
   - `@SecurityRequirement` 전역 적용
4. **application.yml 설정**:
   ```yaml
   springdoc:
     api-docs:
       path: /api-docs
     swagger-ui:
       path: /swagger-ui.html
       tags-sorter: alpha
       operations-sorter: alpha
   ```
5. **접속 URL 안내**: `http://localhost:8080/swagger-ui.html`

## 관련 Agent
- api-expert
