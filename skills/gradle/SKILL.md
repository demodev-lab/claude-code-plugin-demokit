---
name: gradle
description: Gradle 의존성 관리 및 빌드 설정
user_invocable: true
arguments:
  - name: action
    description: "작업 (add, remove, check, update)"
    required: false
  - name: dependency
    description: "의존성 (예: spring-boot-starter-security)"
    required: false
---

# /gradle - 의존성 관리

## 실행 절차

1. **build.gradle 분석**: 현재 의존성 목록 파악
2. **작업 수행**:
   - `add`: 의존성 추가 + 올바른 scope (implementation/testImplementation/annotationProcessor)
   - `remove`: 의존성 제거
   - `check`: 누락된 필수/권장 의존성 체크
   - `update`: 버전 업데이트 안내
3. **QueryDSL 의존성** 추가 시:
   - `io.github.openfeign.querydsl:querydsl-jpa:6.12` (OpenFeign fork)
   - `io.github.openfeign.querydsl:querydsl-apt:6.12:jpa` (annotationProcessor)
   - `com.querydsl` 사용 금지 안내
4. **필수 의존성 안내**: spring-boot-starter-web, data-jpa, validation, lombok

## 관련 Agent
- infra-expert (Phase 3)
