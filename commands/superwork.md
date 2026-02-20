---
name: superwork
description: |
  구현 요청을 받으면 설계→구현→리뷰→QA까지 팀 오케스트레이션으로
  동시 집약 처리하는 고성능 슈퍼 워크모드.
  팀 구성은 현재 `team` 설정 기반으로 병렬 후보를 자동 산출하며,
  `/pdca` 파이프라인으로 이어집니다.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Skill
---

# /superwork (Team Orchestrator)

```text
/superwork <구현내용>
```

`구현내용` 한 건을 **최고 성능 팀 협업 모드**로 처리한다.

## 동작 가이드

1. **요건 정리**
   - 구현 목표, 범위, 성공 조건을 한 번에 정의한다.
   - 산출물 경계(파일/모듈/테스트 범위)를 명확히 한다.
   - 자동으로 Plan 템플릿이 생성돼 작업 단위를 체크리스트화한다.

2. **병렬 팀 투입**
   - 아키텍처/설계, 핵심 구현, 보안·성능 점검, 테스트/QA를
     가능한 병렬 태스크로 분할해 team 오케스트레이션으로 동시 실행한다.
   - `/superwork`는 입력 내용을 기준으로 병렬 그룹(동시 수행 가능 태스크)을 제안한다.
   - `/pdca` 정석 순서는 `/pdca plan` → `/pdca design` → `/pdca do` → `/pdca analyze` → `/pdca iterate`(조건부) → `/pdca report` → `/pdca status`/`/pdca next` 입니다.

3. **통합 검증**
   - 구현 결과를 병합하고 충돌/중복/품질 리스크를 정리한다.
   - 테스트, 리뷰, 보안/성능 점검을 끝까지 완료한다.
   - `/pdca analyze`/`/pdca iterate` 연동으로 gap-rate 개선까지 반복 제안한다.

4. **성과 정리**
   - 최종 요약, 미해결 리스크, 후속 작업을 정리해 다음 명령으로 이어갈 수 있게 한다.
   - `/pdca report` 및 `/pdca status`/`/pdca next`와 연동해 다음 단계 이동을 점검한다.

## 실행 템플릿 자동 생성

- `/superwork` 입력 즉시 내부 엔진이 다음을 생성한다.
  - 요청 분해 템플릿 (`Plan/Design/Do/Analyze/Iterate/Report`)
  - 병렬 태스크 그룹 제안
  - `/pdca` 연동 커맨드 체인
  - `/pdca do`에 바로 붙여 쓰는 체크리스트 템플릿

```text
/superwork 회원가입 API 구현
/superwork "결제 취소 예외 처리 보강"
```

## `/pdca do` 실행 체크리스트 예시

```text
/pdca do 회원가입-api-구현
- [ ] 1. Entity + Repository 구현 (domain-expert)
- [ ] 2. Service 핵심 로직 구현 (service-expert)
- [ ] 3. DTO/요청-응답 스펙 및 검증 (api-expert)
...
```

## 권장 체크리스트

- `/pdca plan <구현내용>`
- `/pdca design <구현내용>`
- `/pdca do <구현내용>`
- `/pdca analyze <구현내용>`
- `/pdca iterate <구현내용>`
- `/pdca report <구현내용>`
- `/pdca status`
- `/pdca next`
- `/test all`
- `/review`
- `/qa test`
- `/qa log`

## 팀 성능 튜닝 참고(필요 시)

- 대규모 작업은 `team.delegateMode=false` 및 충분한 `team.maxTeammates` 설정을 우선 확인.
- 병목 구간은 `team.performance.phaseMemberCap`/`team.performance.phaseMaxParallel`로 추가 조절.
