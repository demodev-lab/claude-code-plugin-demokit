---
name: docker
description: 이 스킬은 사용자가 "Docker", "docker-compose", "Dockerfile"을 요청할 때 사용합니다. Docker/Docker Compose 설정을 생성합니다.
---

# /docker - Docker 설정

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/docker — Docker/Docker Compose 설정 생성

사용법:
  /docker

예시:
  /docker

관련 명령:
  /gradle — Gradle 의존성 관리
  /init   — 프로젝트 초기화
```

## 실행 절차

### 1. 파일 병렬 생성
다음 Task들을 **한 메시지에서 동시에 호출**한다:
- Task 1: **Dockerfile** (Multi-stage build, Eclipse Temurin JDK 21, non-root user)
- Task 2: **docker-compose.yml** (앱 서비스 + DB 서비스 + 환경 변수 외부화)
- Task 3: **.dockerignore**

### 2. 통합 안내 (순차)
- `spring-boot-docker-compose` 의존성
- `spring.docker.compose.*` 설정 (Spring Boot 3.1+)

## 관련 Agent
- infra-expert (Phase 3)
