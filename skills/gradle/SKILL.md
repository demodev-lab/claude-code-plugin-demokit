---
name: gradle
description: 이 스킬은 사용자가 "Gradle", "의존성 추가", "gradle", "빌드 설정"을 요청할 때 사용합니다. Gradle 의존성 관리 및 빌드 설정을 수행합니다.
---

# /gradle - 의존성 관리

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/gradle — Gradle 의존성 관리

사용법:
  /gradle {action} [dependency]

하위 명령:
  add     의존성 추가
  remove  의존성 제거
  check   누락된 필수/권장 의존성 체크
  update  버전 업데이트 안내

예시:
  /gradle add spring-boot-starter-validation
  /gradle remove querydsl
  /gradle check
  /gradle update

관련 명령:
  /init   — 프로젝트 초기화
  /docker — Docker 설정 생성
```

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
