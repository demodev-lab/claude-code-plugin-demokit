# PDCA Performance Guide

PDCA `do` 지연을 줄이기 위한 실전 튜닝 가이드.

## 1) Team fan-out 제어

- `team.maxTeammates`
- `team.performance.phaseMemberCap.do`
- `team.performance.phaseMaxParallel.do`

## 2) Pattern 조정

- 품질 우선: `swarm/council`
- 속도 우선: `leader` + delegate mode

## 3) Deliverables 캐시

- `pdca.doStickyCacheTtlMs` 기본 15000ms
- TTL이 짧을수록 최신 반영, 길수록 속도 우세

## 4) Hook 경량화

- `team.performance.emitTransitionHints=false`
- 불필요한 pre/post phase scripts off

## 5) 검증

```bash
npm run validate:plugin -- --verbose
npm run validate:hooks
npm test -- --runInBand
```
