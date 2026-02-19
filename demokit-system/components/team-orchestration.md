# Team Orchestration

팀 오케스트레이션 구성과 레벨별 override/delegate 전략.

## 핵심 파일

- `lib/team/team-config.js`
- `lib/team/orchestrator.js`
- `lib/team/coordinator.js`
- `lib/team/hooks.js`
- `demodev.config.json > team`

## 설정 계층

우선순위 (높음 → 낮음):

1. `team.levelOverrides.<Level>` (직접 레벨)
2. `team.levelOverrides.<Profile>` (호환 매핑 레벨)
3. `team.performance`
4. `team.phaseTeams`
5. `team.maxTeammates`
6. 기본값(`DEFAULT_PHASE_TEAMS`)

## Level 호환 매핑

`team.levelProfileMap`으로 demokit 레벨을 bkit 프로파일로 매핑할 수 있다.

기본값:
- `SingleModule -> Dynamic`
- `MultiModule -> Dynamic`
- `Monolith -> Dynamic`
- `MSA -> Enterprise`

## Delegate Mode

`delegateMode=true`일 때 동작:

- phase 패턴을 강제로 `leader`로 전환
- 실행 멤버를 단일 담당자로 축소
  - 우선순위: `phase.lead` → `phase.members[0]`
- `maxParallel=1`로 제한

사용 목적:
- 데모/긴급 대응에서 오케스트레이션 오버헤드 최소화
- 긴 컨텍스트 fan-out 방지

## Level Overrides 예시

```json
{
  "team": {
    "delegateMode": false,
    "levelProfileMap": {
      "SingleModule": "Dynamic",
      "MSA": "Enterprise"
    },
    "levelOverrides": {
      "SingleModule": {
        "delegateMode": false,
        "maxTeammates": 3
      },
      "Dynamic": {
        "maxTeammates": 3
      },
      "Enterprise": {
        "maxTeammates": 5
      }
    }
  }
}
```

## 성능 튜닝 포인트

- `team.performance.phaseMemberCap`
- `team.performance.phasePatternOverride`
- `team.performance.phaseMaxParallel`
- `team.performance.emitTransitionHints`

## 검증

- `npm run validate:plugin -- --verbose`
- `npm run validate:hooks`
- `npm test -- --runInBand`

## 관련 문서
- [[overview]]
- [[../triggers/priority-rules]]
- [[../scenarios/team-delegate-mode]]
