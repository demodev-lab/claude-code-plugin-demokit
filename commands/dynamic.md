---
name: dynamic
description: |
  bkit Dynamic 프로파일 호환 가이드.
  SingleModule/MultiModule/Monolith의 기본 운영 프로파일을 안내합니다.
user-invocable: true
allowed-tools:
  - Read
---

# /dynamic (Profile Guide)

Dynamic은 **품질/속도 균형** 모드입니다.

## 추천 설정

- `team.levelOverrides.SingleModule.maxTeammates = 3`
- `team.performance.phaseMemberCap.do.SingleModule = 3`
- `team.performance.phaseMaxParallel.do.SingleModule = 2~3`

## 언제 쓰나

- 일반 제품 개발
- 백엔드 기능 확장
- PDCA 반복 개선
