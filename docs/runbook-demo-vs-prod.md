# Runbook: Demo vs Production

## Demo Mode

- delegate mode: ON (or low teammates)
- phase pre/post scripts: OFF
- transition hints: ON
- 목표: 속도/안정성

## Production Mode

- delegate mode: OFF
- teammates: 2~3 (SingleModule), 5 (MSA)
- phase pre/post scripts: 필요 시 ON
- 목표: 품질/추적성

## 빠른 전환 체크

- `team.levelOverrides` 확인
- `team.performance` 확인
- `developmentPipeline.phaseScripts` 확인
