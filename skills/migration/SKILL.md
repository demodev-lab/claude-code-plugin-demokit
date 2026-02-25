---
name: migration
description: 이 스킬은 사용자가 "마이그레이션", "migration", "Flyway", "Liquibase"를 요청할 때 사용합니다. DB 마이그레이션 파일을 생성합니다.
---

# /migration - DB 마이그레이션

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/migration — DB 마이그레이션 파일 생성

사용법:
  /migration {description} [--type flyway|liquibase]

파라미터:
  description  마이그레이션 설명 (필수)

옵션:
  --type  flyway(기본), liquibase

예시:
  /migration create_users_table
  /migration add_email_column --type liquibase

관련 명령:
  /entity — JPA Entity 생성
  /crud   — CRUD 일괄 생성
```

## 사용자 선택 (--type 미지정 시)
> 컨벤션: `templates/shared/ask-user-convention.md` 참조

`--type` 없이 실행하면 **`AskUserQuestion` 도구**로 마이그레이션 도구를 질문한다:
- question: "어떤 마이그레이션 도구를 사용할까요?"
- header: "마이그레이션"
- options:
  - `Flyway (Recommended)` — SQL 기반, 간단하고 직관적. Spring Boot 기본 지원
  - `Liquibase` — XML/YAML 기반, 롤백 지원이 강력. 복잡한 스키마 관리에 적합

## 실행 절차

### Flyway (기본)
1. **파일 생성**: `src/main/resources/db/migration/V{timestamp}__{description}.sql`
2. **Entity 기반**: 기존 Entity를 분석하여 DDL 생성
3. **네이밍**: `V1__create_users_table.sql`, `V2__add_email_column.sql`
4. **의존성 확인**: `spring-boot-starter-data-jpa` + `flyway-core`

### Liquibase
1. **파일 생성**: `src/main/resources/db/changelog/changes/{timestamp}-{description}.yaml`
2. **master changelog** 참조 추가

## 관련 Agent
- domain-expert
