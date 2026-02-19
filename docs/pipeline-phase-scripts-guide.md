# Pipeline Phase Scripts Guide

## Scripts

### Dispatcher

- `scripts/pipeline-phase-pre.js`
- `scripts/pipeline-phase-post.js`
- `scripts/pipeline-phase-stop.js`
- `scripts/pipeline-phase-transition.js`

### Phase-specific

- `scripts/phase-1-schema-{pre,post,stop}.js`
- ...
- `scripts/phase-9-deployment-{pre,post,stop}.js`

## Hook Integration

- PreToolUse: `pipeline-phase-pre.js`
- PostToolUse: `pipeline-phase-post.js`
- Stop: `pipeline-phase-stop.js`
- TaskCompleted: `pipeline-phase-transition.js`

## Runtime Toggle

`developmentPipeline.phaseScripts`:

- `enabled`
- `preEnabled`
- `postEnabled`
- `transitionEnabled`

기본 권장:
- pre/post: `false`
- transition: `true`

## Phase Runtime Architecture

```mermaid
flowchart LR
    H1[PreToolUse] --> PRE[pipeline-phase-pre.js]
    H2[PostToolUse] --> POST[pipeline-phase-post.js]
    H3[Stop] --> STOP[pipeline-phase-stop.js]
    H4[TaskCompleted] --> TR[pipeline-phase-transition.js]

    PRE --> R[pipeline-phase-runtime.js]
    POST --> R
    STOP --> C[pipeline-phase-stop-common.js]
    TR --> C

    R --> P[phase-N-*-pre/post.js]
    C --> S[phase-N-*-stop.js]
```

## Pipeline Stage Timeline

```mermaid
flowchart TD
    P1[Phase 1 Schema] --> P2[Phase 2 Convention]
    P2 --> P3[Phase 3 Infra]
    P3 --> P4[Phase 4 Feature]
    P4 --> P5[Phase 5 Integration]
    P5 --> P6[Phase 6 Testing]
    P6 --> P7[Phase 7 Performance]
    P7 --> P8[Phase 8 Review]
    P8 --> P9[Phase 9 Deployment]
```
