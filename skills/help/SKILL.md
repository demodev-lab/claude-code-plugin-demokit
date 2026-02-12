---
name: help
description: 이 스킬은 사용자가 "help", "도움말", "demo-dev help", "명령어 목록"을 요청할 때 사용합니다. 사용 가능한 전체 커맨드 목록을 카테고리별로 보여줍니다.
---

# /help - 전체 커맨드 목록

아래 도움말을 출력하고 실행을 중단한다:

```
사용 가능한 커맨드
━━━━━━━━━━━━━━━━━━━━

프로젝트
  /init         — Spring Boot 프로젝트 감지 및 초기화

도메인 CRUD
  /crud         — 도메인 CRUD 일괄 생성 (Entity, Repository, Service, Controller, DTO)
  /entity       — JPA Entity 생성
  /repository   — Spring Data JPA Repository 생성
  /service      — Service 레이어 생성
  /controller   — REST Controller 생성
  /dto          — Java record 기반 Request/Response DTO 생성

설정·인프라
  /exception    — 도메인 예외 및 GlobalExceptionHandler 생성
  /config       — Spring 설정 클래스 생성
  /security     — Spring Security 설정 생성 (JWT/OAuth2)
  /cache        — 캐싱 전략 설정 (Caffeine/Redis)
  /gradle       — Gradle 의존성 관리
  /docker       — Docker/Docker Compose 설정 생성
  /api-docs     — SpringDoc/Swagger API 문서화 설정 생성
  /migration    — DB 마이그레이션 파일 생성

테스트·리뷰
  /test         — 단위/통합/슬라이스 테스트 코드 생성
  /review       — 코드 리뷰 수행

워크플로우
  /pdca         — PDCA 워크플로우 관리 (Plan → Design → Do → Analyze → Iterate → Report)
  /loop         — 작업 완료까지 자동 반복 실행
  /cancel-loop  — 활성화된 자율 반복 루프 취소

Git
  /commit       — 변경사항을 논리적 단위로 스마트 커밋
  /commit-push  — 커밋 후 원격 저장소에 푸시
  /push         — 현재 브랜치를 원격 저장소에 푸시
  /pr           — Pull Request 생성

자세한 사용법: /{name} help
```
