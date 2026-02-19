# Compatibility Command Map (bkit -> demokit)

bkit에서 자주 쓰던 명령을 demokit에서 어떻게 대응하는지 정리.

## Direct Alias

| bkit-style command | demokit canonical |
|---|---|
| `/code-review` | `/review` |
| `/zero-script-qa` | `/qa` |
| `/development-pipeline` | `/pipeline` |

## Profile Guides

| bkit-style profile | demokit config anchor |
|---|---|
| `/starter` | `team.levelOverrides.SingleModule` + `delegateMode=true` |
| `/dynamic` | `team.levelOverrides.SingleModule` / `team.maxTeammates` |
| `/enterprise` | `team.levelOverrides.MSA` |

## Phase Guide Aliases

- `/phase-1-schema`
- `/phase-2-convention`
- `/phase-3-mockup`
- `/phase-4-api`
- `/phase-5-design-system`
- `/phase-6-ui-integration`
- `/phase-7-seo-security`
- `/phase-8-review`
- `/phase-9-deployment`

위 명령은 모두 `/pipeline status` + `/pipeline next` 흐름을 안내하는 호환 가이드입니다.

## Recommended Migration Flow

1. `/bkit` 또는 `/demokit`으로 허브 확인
2. 기존 alias 명령으로 진입
3. 팀이 안정되면 canonical(`/review`, `/qa`, `/pipeline`)로 통일
