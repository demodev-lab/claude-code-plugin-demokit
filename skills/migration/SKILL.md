---
name: migration
description: 이 스킬은 사용자가 "마이그레이션", "migration", "Flyway", "Liquibase"를 요청할 때 사용합니다. DB 마이그레이션 파일을 생성합니다.
---

# /migration - DB 마이그레이션

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
