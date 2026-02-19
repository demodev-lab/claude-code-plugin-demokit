---
name: bkit
description: |
  bkit 호환 도움말 허브.
  bkit 또는 demokit 호출을 사용하는 기존 사용자에게 일치된 진입점을 제공합니다.
user-invocable: true
allowed-tools:
  - Read
  - Skill
---

# bkit Functions (Demokit Compatibility)

`/bkit`은 `demokit` 플러그인의 동일한 명령 허브를 보여줍니다.

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  bkit / demokit Help Hub
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

생성/개발
  /crud <Domain>             CRUD 일괄 생성
  /entity <Domain>
  /repository <Domain>
  /service <Domain>
  /controller <Domain>
  /dto <Domain>

품질/안정화
  /test <Domain|all>
  /review <path|domain>
  /qa [build|test|log]
  /optimize <domain>

운영
  /pipeline <feature>        9단계 파이프라인 가이드
  /plan-plus <feature>       브레인스토밍 강화 계획
  /loop <task>               반복 실행
  /cancel-loop               loop 중단

스타일/문서
  /output-style-setup        output style 설치/적용 안내

호환 alias
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

`/bkit`은 앞으로도 유지되며, `/demokit`으로 동일한 기능을 사용할 수 있습니다.
