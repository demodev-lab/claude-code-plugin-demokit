---
name: test
description: 이 스킬은 사용자가 "테스트 생성", "test", "테스트 코드"를 요청할 때 사용합니다. 단위/통합/슬라이스 테스트 코드를 생성합니다.
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
다음 3개 Task를 **한 메시지에서 동시에 호출**하여 병렬 생성:
- Task 1 (test-expert): Service 단위 테스트 — {Name}ServiceTest.java
- Task 2 (test-expert): Repository 통합 테스트 — {Name}RepositoryTest.java
- Task 3 (test-expert): Controller 슬라이스 테스트 — {Name}ControllerTest.java

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
