---
name: phase-9-deployment
description: |
  bkit phase-9 호환 alias 가이드.
  현재 파이프라인 단계(Deployment) 진행에 필요한 체크포인트를 제공합니다.
user-invocable: true
allowed-tools:
  - Read
  - Skill
---

# /phase-9-deployment (Compatibility Alias)

이 명령은 demokit `/pipeline` 기반 phase 운영을 위한 호환 가이드입니다.

## 현재 단계
- Phase 9: Deployment

## 권장 명령
1. `/pipeline status`
2. 현재 단계 작업 수행
3. 완료 시 `/pipeline next`

## 체크포인트
- 산출물/테스트/리뷰 기준을 충족했는지 확인
- 다음 단계 전환 전에 주요 리스크를 기록
