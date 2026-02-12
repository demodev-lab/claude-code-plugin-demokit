---
name: docker
description: Docker/Docker Compose 설정 생성
user_invocable: true
arguments:
  - name: type
    description: "설정 종류 (dockerfile, compose, both). 기본: both"
    required: false
  - name: db
    description: "데이터베이스 (postgres, mysql, mariadb). 기본: postgres"
    required: false
---

# /docker - Docker 설정

## 실행 절차

1. **Dockerfile** 생성:
   - Multi-stage build (builder + runtime)
   - Eclipse Temurin JDK 21 base image
   - Gradle build → JAR 복사
   - non-root user 실행
2. **docker-compose.yml** 생성:
   - Spring Boot 애플리케이션 서비스
   - DB 서비스 (PostgreSQL 기본)
   - 환경 변수 외부화
3. **Spring Boot Docker Compose 통합** 안내:
   - `spring-boot-docker-compose` 의존성
   - `spring.docker.compose.*` 설정 (Spring Boot 3.1+)
4. **.dockerignore** 생성

## 관련 Agent
- infra-expert (Phase 3)
