---
name: development-pipeline
description: |
  bkit 호환 alias 명령.
  demokit의 /pipeline을 사용해 9단계 개발 파이프라인을 운영합니다.
user-invocable: true
allowed-tools:
  - Read
  - Skill
---

# /development-pipeline (Compatibility Alias)

`/development-pipeline`는 demokit의 `/pipeline`과 동일한 목적의 호환 명령입니다.

## 사용 가이드

- 시작: `/pipeline <feature>`
- 상태: `/pipeline status`
- 다음 단계: `/pipeline next`

## 9단계 요약

Schema → Convention → Infra → Feature → Integration → Testing → Performance → Review → Deployment
