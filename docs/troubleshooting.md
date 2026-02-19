# Troubleshooting

## 1) PDCA do가 느림

- team fan-out 값 확인
- delegate mode / phaseMemberCap 확인
- doStickyCacheTtlMs 확인

## 2) Hook 관련 이상

```bash
npm run validate:hooks
npm run validate:plugin -- --verbose
```

## 3) 파이프라인 phase 힌트 안 나옴

- `.pipeline/status.json` 존재 여부 확인
- `developmentPipeline.phaseScripts.transitionEnabled` 확인
- TaskCompleted 이벤트가 실제 발생하는지 확인

## 4) 레벨 오버라이드 미적용

- `team.levelOverrides.<Level>` 키 확인
- `team.levelProfileMap` 매핑 확인
- config 우선순위(project > session > user > plugin) 확인
