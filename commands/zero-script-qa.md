---
name: zero-script-qa
description: |
  bkit 호환 alias 명령.
  demokit의 /qa를 사용해 빌드/테스트/로그 중심 QA를 수행합니다.
user-invocable: true
allowed-tools:
  - Read
  - Skill
---

# /zero-script-qa (Compatibility Alias)

`/zero-script-qa`는 demokit의 `/qa`와 동일한 목적의 호환 명령입니다.

## 사용 가이드

- 빌드 점검: `/qa build`
- 테스트 점검: `/qa test`
- 로그 점검: `/qa log`

## 권장 흐름

1. `/qa build`
2. `/qa test`
3. `/qa log`
4. `/review` 또는 `/pdca analyze <feature>`
