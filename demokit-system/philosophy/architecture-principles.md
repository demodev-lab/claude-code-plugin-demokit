# Architecture Principles

`demokit` 설계 원칙 문서.

## 1) Domain-first

- Spring Boot에서 도메인 계층(Entity/Repository/Service)을 우선 설계한다.
- Controller는 도메인/서비스 계층이 정리된 뒤 연결한다.
- PDCA `do` 단계에서 팀 작업은 도메인 의존성 순서(Repository → Service → Controller)를 따른다.

## 2) Config-driven Orchestration

- 실행 전략은 코드 하드코딩보다 `demodev.config.json`을 우선한다.
- team 구성/패턴/성능 옵션은 설정으로 조정 가능해야 한다.
- 레벨별 정책(`team.levelOverrides`)은 공통 기본값을 덮어쓴다.

## 3) Safety by Default

- 위험 명령은 deny/ask 정책으로 기본 차단한다.
- Hook은 timeout(ms) 필수, validator를 통해 사전 검증한다.
- 성능 최적화는 안전 검증(테스트/검증 스크립트)을 통과해야 반영한다.

## 4) Observable Workflows

- 주요 워크플로우는 상태 파일 기반으로 관측 가능해야 한다.
  - PDCA: `.pdca/status.json`
  - Pipeline: `.pipeline/status.json`
- phase 전환/진행률은 상태 파일을 기준으로 계산한다.

## 5) Progressive Decomposition

- 복잡한 흐름은 phase 전용 모듈로 분해해 가시성을 높인다.
- 공통 로직은 shared helper로 유지해 중복을 줄인다.
- 문서(`demokit-system`)는 코드 구조와 1:1 대응을 지향한다.

## 관련 문서
- [[core-mission]]
- [[context-engineering]]
- [[../components/team-orchestration]]
- [[../components/pipeline-phase-scripts]]
