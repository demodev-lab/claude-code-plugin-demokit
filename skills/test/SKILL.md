---
name: test
description: 테스트 코드 생성 (단위/통합/슬라이스)
user_invocable: true
arguments:
  - name: name
    description: "도메인명 (PascalCase, 예: User)"
    required: true
  - name: type
    description: "테스트 종류 (unit, integration, controller, all). 기본: all"
    required: false
---

# /test - 테스트 생성

## 실행 절차

### unit (Service 단위 테스트)
- `{Name}ServiceTest.java`
- `@ExtendWith(MockitoExtension.class)`, `@Nested`, BDDMockito, AssertJ

### integration (Repository 통합 테스트)
- `{Name}RepositoryTest.java`
- `@DataJpaTest`, TestEntityManager

### controller (Controller 슬라이스 테스트)
- `{Name}ControllerTest.java`
- `@WebMvcTest`, `@MockitoBean` (not @MockBean), MockMvc
- ProblemDetail 검증 포함

### all (기본)
- 위 3개 모두 생성

## 필수 패턴
- `@MockitoBean` 사용 (`@MockBean` 금지, Spring Boot 3.4+)
- `@Nested` 메서드별 그룹화
- `@DisplayName` 한글 권장
- AssertJ assertions
- `var` 지역 변수
- text block으로 JSON 요청 본문

## 관련 Agent
- test-expert

## 관련 템플릿
- `templates/code/test-unit.template.java`
- `templates/code/test-integration.template.java`
- `templates/code/test-controller.template.java`
