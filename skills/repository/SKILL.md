---
name: repository
description: Spring Data JPA Repository 생성
user_invocable: true
arguments:
  - name: name
    description: "도메인명 (PascalCase, 예: User)"
    required: true
  - name: querydsl
    description: "QueryDSL Custom Repository 포함 여부 (true/false)"
    required: false
---

# /repository - Repository 생성

## 실행 절차

1. **Repository 파일 생성**: `domain/{name}/repository/{Name}Repository.java`
2. **JpaRepository 상속**: `@Repository` 어노테이션 불필요
3. **default getById()**: 조회+예외 패턴 포함
4. **QueryDSL** (--querydsl true 시):
   - `{Name}RepositoryCustom` 인터페이스
   - `{Name}RepositoryImpl` 구현체 (JPAQueryFactory, BooleanExpression 메서드 분리)
   - `{Name}SearchCondition` record DTO
   - `QuerydslConfig` (없으면 생성)

## 관련 Agent
- domain-expert

## 관련 템플릿
- `templates/code/repository.template.java`
