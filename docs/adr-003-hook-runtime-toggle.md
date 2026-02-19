# ADR-003: Hook Runtime Toggle Policy

- Status: Accepted
- Date: 2026-02-20

## Context

bkit 대비 demokit은 hook 이벤트/스크립트 단위 런타임 제어가 약했다.
운영 중 특정 훅만 끄고 싶을 때 코드 수정 없이 제어가 필요했다.

## Decision

- `hooks.runtime.events.*` + `hooks.runtime.scripts.*`를 도입한다.
- 주요 hook scripts는 실행 시작 시 runtime policy를 확인한다.
- 기본값은 안전 측면에서 true, 고비용 보조 스크립트는 false 가능.

## Consequences

- 운영 유연성 상승
- 설정 잘못 시 예상치 못한 비활성화 가능성
- validator + runbook 문서 동반 필요
