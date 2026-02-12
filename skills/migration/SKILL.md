---
name: migration
description: DB 마이그레이션 파일 생성 (Flyway/Liquibase)
user_invocable: true
arguments:
  - name: tool
    description: "마이그레이션 도구 (flyway, liquibase). 기본: flyway"
    required: false
  - name: description
    description: "마이그레이션 설명 (예: 'create_users_table')"
    required: true
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
