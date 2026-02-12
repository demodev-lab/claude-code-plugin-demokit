---
name: api-docs
description: 이 스킬은 사용자가 "API 문서", "Swagger", "SpringDoc", "api-docs"를 요청할 때 사용합니다. SpringDoc/Swagger 기반 API 문서화 설정을 생성합니다.
---

# /api-docs - API 문서화

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/api-docs — SpringDoc/Swagger API 문서화 설정 생성

사용법:
  /api-docs

예시:
  /api-docs

관련 명령:
  /controller — REST Controller 생성
  /security   — Spring Security 설정 생성
```

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
