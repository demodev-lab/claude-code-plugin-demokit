---
name: superwork
description: 이 스킬은 사용자가 "/superwork <구현내용>"을 요청할 때 사용합니다.
---

# /superwork - Superwork Team Orchestrator

`/superwork <구현내용>` 한 번의 요청으로 구현 업무를 **Plan → Design → Do → Analyze → Iterate → Report** 흐름으로
자동 분해해 병렬 실행 후보를 제시하고, `/pdca` 파이프라인과 연동된 실행안을 즉시 제공합니다.

## 동작 모델

1. 구현 요청에서 핵심 키워드를 추출해 작업 규모를 판정합니다.
2. 각 Phase별 산출물 템플릿을 생성합니다.
3. 팀 설정(`demodev.config.json`의 `team` 설정) 기반으로 병렬 제안(Task 그룹)을 생성합니다.
4. `/pdca` 연계 명령을 순차적으로 제안합니다.

## 권장 사용법

```text
/superwork 회원가입 API 구현
```

권장 2차 동작:

```text
/pdca plan 회원가입-api-구현
/pdca design 회원가입-api-구현
/pdca do 회원가입-api-구현
```

작은 작업이면 `/pdca plan` → `/pdca do`로 축약해도 됩니다.

## `/pdca do` 체크리스트 연계

`/superwork`에서 생성된 `Do` 단계 태스크는 곧바로 `/pdca do <feature>`와 함께 실행할 수 있는 체크리스트 템플릿 형태로 제공됩니다.
복사해 붙여넣은 뒤, 항목 단위로 구현 진행하면서 `/pdca analyze`로 바로 넘어가면 됩니다.
