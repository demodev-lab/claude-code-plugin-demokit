# PDCA Do Performance Playbook

PDCA `do` 단계가 느릴 때 점검하는 표준 절차.

## 증상

- `/pdca do`에서 응답이 길게 지연됨
- TaskCompleted/Stop 이후 다음 단계 힌트가 늦게 도착
- 팀원 fan-out으로 컨텍스트가 과도하게 커짐

## 1차 점검

1. Team mode/레벨 확인
2. `team.levelOverrides`에서 현재 레벨 delegate 설정 확인
3. `team.performance` 값 확인
   - memberCap
   - patternOverride
   - maxParallel
   - emitTransitionHints

## 2차 점검

- `pdca.doStickyCacheTtlMs` 확인 (기본 15000)
- deliverable 탐색 경로가 과도한지 확인
- hooks timeout/ms 설정 확인

## 권장 빠른 처방

SingleModule 기준:

- `delegateMode=true`
- `maxTeammates=1`
- `do` 패턴 `leader`
- `do` `maxParallel=1`
- `emitTransitionHints=false`

## 확인 명령

```bash
npm run validate:plugin -- --verbose
npm run validate:hooks
npm test -- --runInBand
```

## 관련 문서
- [[feature-delivery-flow]]
- [[team-delegate-mode]]
- [[../components/team-orchestration]]
