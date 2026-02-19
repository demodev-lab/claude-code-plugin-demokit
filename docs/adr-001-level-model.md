# ADR-001: Topology Level + Profile Compatibility

- Status: Accepted
- Date: 2026-02-20

## Context

demokit은 Spring 아키텍처 중심 레벨(`SingleModule`, `MSA` 등)을 사용하고,
bkit은 운영 성숙도 중심 프로파일(`Dynamic`, `Enterprise`)을 사용한다.

## Decision

- demokit의 topology 레벨 모델은 유지한다.
- `team.levelProfileMap`을 도입해 bkit 프로파일과 호환 매핑한다.
- override resolution은 다음 우선순위를 따른다:
  1) direct level override
  2) mapped profile override
  3) default

## Consequences

- 기존 demokit 사용자 경험 유지
- bkit 이관 시 설정 재사용성 향상
- 문서/운영 난이도는 소폭 증가
