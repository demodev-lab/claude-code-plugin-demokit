---
name: code-review
description: |
  bkit 호환 alias 명령.
  demokit의 /review 기능으로 코드 리뷰를 수행합니다.
user-invocable: true
allowed-tools:
  - Read
  - Skill
---

# /code-review (Compatibility Alias)

`/code-review`는 demokit의 `/review`와 동일한 목적의 호환 명령입니다.

## 사용 가이드

- 전체 리뷰: `/review`
- 경로 리뷰: `/review src/main/java/...`
- 도메인 리뷰: `/review domain:user`

## 권장 흐름

1. `/test all`
2. `/code-review` (또는 `/review`)
3. `/pdca analyze <feature>`

> 새 프로젝트에서는 `/review`를 기본으로 쓰고,
> bkit에서 넘어오는 팀은 `/code-review` alias를 사용해도 됩니다.
