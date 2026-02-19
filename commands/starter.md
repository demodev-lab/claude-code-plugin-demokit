---
name: starter
description: |
  bkit Starter 프로파일 호환 가이드.
  데모/초기 세팅에 적합한 경량 팀 실행 전략을 안내합니다.
user-invocable: true
allowed-tools:
  - Read
---

# /starter (Profile Guide)

Starter는 **속도 우선** 모드입니다.

## 추천 설정

- `team.levelOverrides.SingleModule.delegateMode = true`
- `team.levelOverrides.SingleModule.maxTeammates = 1`
- `team.performance.emitTransitionHints = false`

## 언제 쓰나

- 빠른 데모
- API 스켈레톤 초기 작성
- rate limit 여유가 작을 때
