---
name: demokit
description: |
  demokit 플러그인 도움말 허브.
  사용 가능한 핵심 명령과 추천 워크플로우를 한 번에 보여준다.

  Triggers: demokit, demokit help, demokit 명령어, demokit 기능, 도움말
user-invocable: true
allowed-tools:
  - Read
  - Skill
---

# demokit Commands Hub

아래 도움말을 그대로 표시한다.

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  demokit - Spring Boot PDCA Toolkit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

핵심 워크플로우
  /pdca plan <feature>       기능 계획 수립
  /pdca design <feature>     설계 문서 생성
  /pdca do <feature>         구현 가이드 / 실행
  /pdca analyze <feature>    설계-구현 gap 분석
  /pdca iterate <feature>    자동 개선 반복
  /pdca report <feature>     완료 보고서 생성
  /pdca archive <feature>    작업 기록을 아카이브로 이동
  /pdca cleanup              완료/임시 문서 정리
  /pdca status               현재 상태 조회
  /pdca next                 다음 단계 제안
  /superwork <구현내용>       전력투입(설계/구현/리뷰/QA) 오케스트레이션

생성/개발
  /crud <Domain>             CRUD 일괄 생성
  /entity <Domain>
  /repository <Domain>
  /service <Domain>
  /controller <Domain>
  /dto <Domain>

테스트
  /test <Domain|all>

품질/분석
  /review [target] [--deep]     정적 코드 리뷰 (--deep: 보안 심층)
  /review full [target] [--fix] [--deep]  통합 품질 파이프라인
  /optimize [target] [--fix]    성능 최적화 (N+1/인덱스/트랜잭션)
  /qa [build|test|log|summary]  동적 품질 검증 (빌드/테스트/로그)

운영
  /pipeline <feature>        9단계 파이프라인 가이드
  /plan-plus <feature> [--deep]  5단계 브레인스토밍 강화 계획
  /loop <task>               반복 실행
  /cancel-loop               loop 중단

스타일/문서
  /output-style-setup        output style 설치/적용 안내

호환 alias (bkit)
  /code-review               = /review
  /zero-script-qa            = /qa
  /development-pipeline      = /pipeline
  /starter /dynamic /enterprise
  /phase-1-schema ... /phase-9-deployment

권장 시작 순서
  1) /init
  2) /pdca plan <feature>
  3) /pdca design <feature>
  4) /pdca do <feature>
  5) /pdca analyze <feature>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
