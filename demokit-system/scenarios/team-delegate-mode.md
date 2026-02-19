# Team Delegate Mode Scenario

Team Delegate Mode 운영 시나리오.

## 언제 쓰나

- 팀 시연/데모에서 속도와 일관성이 중요할 때
- 단일 담당자가 빠르게 결과를 내야 할 때
- fan-out으로 인한 rate limit/응답 지연을 줄여야 할 때

## 설정 예시

```json
{
  "team": {
    "delegateMode": false,
    "levelOverrides": {
      "SingleModule": {
        "delegateMode": true,
        "maxTeammates": 1
      }
    }
  }
}
```

## 기대 동작

- 해당 레벨에서 phase 실행이 single leader 형태로 축소
- task queue는 유지하되 실행 주체는 단일화
- 병렬도는 `maxParallel=1`

## 트레이드오프

장점:
- 속도/예측 가능성 향상
- 로그/디버깅 단순화

단점:
- 병렬 전문가 검토 감소
- 복잡한 기능에서 품질 검토 깊이가 낮아질 수 있음

## 운영 팁

- 데모 중에는 delegate mode ON
- 본 개발/리뷰에서는 delegate mode OFF + council/swarm 복구

## 관련 문서
- [[pdca-do-performance]]
- [[../components/team-orchestration]]
- [[../triggers/priority-rules]]
