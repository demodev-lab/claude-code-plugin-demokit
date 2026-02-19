# Config Recipes (Copy & Paste)

실무에서 바로 쓰는 `demodev.config.json` 레시피 모음.

---

## 1) Starter (데모/속도 최우선)

```json
{
  "team": {
    "delegateMode": false,
    "levelOverrides": {
      "SingleModule": {
        "delegateMode": true,
        "maxTeammates": 1
      }
    },
    "performance": {
      "emitTransitionHints": false,
      "phaseMemberCap": {
        "do": { "SingleModule": 1 }
      },
      "phasePatternOverride": {
        "do": { "SingleModule": "leader" }
      },
      "phaseMaxParallel": {
        "do": { "SingleModule": 1 }
      }
    }
  },
  "developmentPipeline": {
    "phaseScripts": {
      "enabled": true,
      "preEnabled": false,
      "postEnabled": false,
      "stopEnabled": true,
      "transitionEnabled": true,
      "emitOncePerPhase": true
    }
  }
}
```

추천 상황:
- 팀 시연
- 빠른 PoC
- API rate limit 여유가 작을 때

---

## 2) Dynamic (기본 실무 밸런스)

```json
{
  "team": {
    "delegateMode": false,
    "maxTeammates": { "SingleModule": 3 },
    "levelOverrides": {
      "SingleModule": {
        "delegateMode": false,
        "maxTeammates": 3
      },
      "Dynamic": {
        "maxTeammates": 3
      }
    },
    "performance": {
      "emitTransitionHints": false,
      "phaseMemberCap": {
        "do": { "SingleModule": 3, "default": 2 }
      },
      "phasePatternOverride": {
        "do": { "SingleModule": "swarm" }
      },
      "phaseMaxParallel": {
        "do": { "SingleModule": 2 }
      }
    }
  },
  "pdca": {
    "doStickyCacheTtlMs": 15000
  }
}
```

추천 상황:
- 일반 제품 개발
- 신규 기능+리팩토링 병행

---

## 3) Enterprise (품질/추적성 우선)

```json
{
  "team": {
    "delegateMode": false,
    "maxTeammates": { "MSA": 5 },
    "levelOverrides": {
      "MSA": {
        "delegateMode": false,
        "maxTeammates": 5
      },
      "Enterprise": {
        "maxTeammates": 5
      }
    },
    "performance": {
      "emitTransitionHints": true
    }
  },
  "developmentPipeline": {
    "phaseScripts": {
      "enabled": true,
      "preEnabled": true,
      "postEnabled": true,
      "stopEnabled": true,
      "transitionEnabled": true,
      "emitOncePerPhase": true
    }
  }
}
```

추천 상황:
- 다수 팀 협업
- 릴리즈 전 안정화
- 감사를 대비한 추적성 강화

---

## 4) 빠른 스위치 체크리스트

설정 바꾼 뒤:

```bash
npm run validate:plugin -- --verbose
npm run validate:hooks
npm run check:graph-index
npm test -- --runInBand
```

관련 문서:
- [Runbook: Demo vs Production](./runbook-demo-vs-prod.md)
- [Team Orchestration Guide](./team-orchestration-guide.md)
- [PDCA Performance Guide](./pdca-performance-guide.md)
