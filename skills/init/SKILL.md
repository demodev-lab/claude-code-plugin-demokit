---
name: init
description: 이 스킬은 사용자가 "프로젝트 초기화", "init", "프로젝트 분석"을 요청할 때 사용합니다. Spring Boot 프로젝트를 감지하고 초기화합니다.
---

# /init - 프로젝트 초기화

> 기본 스택: Spring Boot 3.5.10 + Java 21 + Gradle (Groovy DSL)

## 실행 절차

### 1. 프로젝트 감지 + 구조 분석 (병렬)
다음 Task들을 **한 메시지에서 동시에 호출**한다:
- Task 1: `build.gradle` 파싱 — Spring Boot 버전, Java 버전, 의존성 목록 추출
- Task 2: `@SpringBootApplication` 클래스에서 base package 감지 + 도메인 디렉토리 탐색
- Task 3: 설정 파일 확인 (application.yml / application.properties)

### 2. 모던 패턴 체크 (병렬)
다음 Task들을 **한 메시지에서 동시에 호출**한다:
- Task 1: Virtual Threads + ProblemDetail + open-in-view 설정 확인
- Task 2: spring-boot-starter-validation 의존성 + record DTO 사용 여부 확인
- Task 3: 프로젝트 레벨 판별 (Monolith / MSA)

### 3. 결과 출력 (순차)
아래 형식으로 프로젝트 정보를 요약:

```
프로젝트 분석 결과
━━━━━━━━━━━━━━━━━━━━
Spring Boot: {version}
Java: {version}
Build Tool: Gradle (Groovy)
Base Package: {basePackage}
레벨: {Monolith|MSA}

의존성
- spring-boot-starter-web
- spring-boot-starter-data-jpa
- ...

프로젝트 구조
- domain/      (존재/미생성)
- repository/  (존재/미생성)
- ...

모던 패턴 점검
- Virtual Threads: (활성화/비활성화)
- ProblemDetail:   (활성화/비활성화)
- open-in-view:    (true/false)
- Validation:      (의존성 있음/없음)

추천 작업
- /crud {DomainName}: CRUD 일괄 생성
- /pdca plan {feature}: PDCA 워크플로우 시작
```

### 5. 누락 사항 안내
- 필수 의존성 미포함 시 안내 (예: spring-boot-starter-validation)
- Virtual Threads 미활성화 시 설정 안내
- ProblemDetail 미활성화 시 설정 안내
- `open-in-view=true` (기본값) 시 false 설정 안내
- base package 미감지 시 수동 설정 안내

## 사용 예시
```
/init
/init ./backend
```

## 관련 Agent
- spring-architect (프로젝트 분석 지원)

## 관련 라이브러리
- `lib/spring/gradle-parser.js` - build.gradle 파싱
- `lib/spring/project-analyzer.js` - 프로젝트 구조 분석
