# ADR-002: Phase Runtime Hook Dispatchers

- Status: Accepted
- Date: 2026-02-20

## Context

phase별 스크립트 분리를 도입했지만, hook 이벤트별 제어가 없으면 운영 복잡도가 증가한다.

## Decision

- dispatcher(`pipeline-phase-pre/post/stop/transition`)를 두고
  stage별 제어를 runtime에서 통합한다.
- `developmentPipeline.phaseScripts`로 pre/post/stop/transition 토글을 제공한다.
- `emitOncePerPhase`를 기본 true로 하여 메시지 스팸을 줄인다.

## Consequences

- 가시성/유지보수성 향상
- 설정 항목 증가
- 테스트 커버리지 확장 필요
