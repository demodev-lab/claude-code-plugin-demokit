---
name: enterprise
description: |
  bkit Enterprise 프로파일 호환 가이드.
  MSA/대규모 협업 환경의 보수적 품질 중심 설정을 안내합니다.
user-invocable: true
allowed-tools:
  - Read
---

# /enterprise (Profile Guide)

Enterprise는 **품질/추적성 우선** 모드입니다.

## 추천 설정

- `team.levelOverrides.MSA.maxTeammates = 5`
- `team.levelOverrides.MSA.delegateMode = false`
- `developmentPipeline.phaseScripts.transitionEnabled = true`

## 언제 쓰나

- 다수 팀 협업
- 릴리즈 직전 안정화
- 운영 리스크 높은 프로젝트
