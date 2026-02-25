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

분석·도구
  /erd          — Mermaid ERD 다이어그램 생성
  /changelog    — Git 기반 CHANGELOG 자동 생성
  /properties   — Spring Boot 설정 관리 (프로파일 분리, 검증)

테스트
  /test         — 단위/통합/슬라이스 테스트 코드 생성

워크플로우
  /pdca         — PDCA 워크플로우 (plan/design/do/analyze/iterate/report/archive/cleanup)
  /pipeline     — Spring Boot 9단계 개발 파이프라인
  /plan-plus    — 5단계 브레인스토밍 강화 계획 (--deep 지원)
  /loop         — 작업 완료까지 자동 반복 실행
  /cancel-loop  — 활성화된 자율 반복 루프 취소

품질/분석
  /review       — 정적 코드 분석 (아키텍처/패턴/보안) [--deep]
  /review full  — 통합 품질 파이프라인 (리뷰+최적화+QA) [--fix] [--deep]
  /optimize     — 성능 최적화 분석 (N+1/인덱스/트랜잭션) [--fix]
  /qa           — 동적 품질 검증 (빌드/테스트/로그) [build|test|log|summary]

Git
  /commit       — 변경사항을 논리적 단위로 스마트 커밋
  /commit-push  — 커밋 후 원격 저장소에 푸시
  /push         — 현재 브랜치를 원격 저장소에 푸시
  /pr           — Pull Request 생성

자세한 사용법: /{name} help
```
