# Architecture Overview

demokit의 런타임 구조를 빠르게 이해하기 위한 문서.

## Core Layers

1. **Skills** (`skills/*`)
   - 사용자 명령 인터페이스
2. **Hooks** (`hooks/hooks.json`, `scripts/*`)
   - Tool/Stop/TaskCompleted 이벤트 후처리
3. **Domain Libs** (`lib/*`)
   - pdca/team/pipeline/memory/core
4. **Config** (`demodev.config.json`)
   - 오케스트레이션/성능/권한 정책

## System Map (Mermaid)

```mermaid
flowchart TB
    subgraph Input[User Input Layer]
      U[Developer Command]
      CC[Claude Code]
    end

    subgraph Command[Command Layer]
      SK[Skills\n33 commands]
      CMD[commands/*.md]
    end

    subgraph Hook[Hook Layer]
      HH[hooks/hooks.json]
      PRE[PreToolUse]
      POST[PostToolUse]
      STOP[Stop]
      TC[TaskCompleted]
    end

    subgraph Runtime[Runtime Scripts]
      S1[scripts/unified-*.js]
      S2[scripts/pipeline-phase-*.js]
      S3[scripts/phase-1~9-*.js]
    end

    subgraph Domain[Domain Libraries]
      CORE[lib/core]
      PDCA[lib/pdca]
      TEAM[lib/team]
      PIPE[lib/pipeline]
      TASK[lib/task]
    end

    subgraph State[State Files]
      F1[(.pdca/status.json)]
      F2[(.pipeline/status.json)]
      F3[(.demodev/team-state.json)]
    end

    U --> CC --> SK
    CMD --> SK
    SK --> HH
    HH --> PRE --> S1
    HH --> POST --> S1
    HH --> STOP --> S2
    HH --> TC --> S2
    S2 --> S3

    S1 --> CORE
    S1 --> TASK
    S2 --> PIPE
    S2 --> TEAM
    S2 --> PDCA

    CORE --> F1
    PDCA --> F1
    PIPE --> F2
    TEAM --> F3
```

## Runtime Sequence (Mermaid)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Skill as Skill Command
    participant Hook as Hook Runtime
    participant Lib as Domain Libs
    participant File as Status Files

    Dev->>Skill: /pdca do feature
    Skill->>Hook: Tool calls + events
    Hook->>Lib: team/pdca/pipeline logic
    Lib->>File: read/write status JSON
    Lib-->>Hook: next action / hints
    Hook-->>Skill: structured output
    Skill-->>Dev: guidance + follow-up command
```

## Important Data Files

- `.pdca/status.json` : PDCA 상태
- `.pipeline/status.json` : 파이프라인 상태
- `.demodev/team-state.json` : 팀 상태

## Runtime Characteristics

- hook 스크립트는 프로세스 단위로 독립 실행
- 상태 공유는 파일(JSON) 기반
- 성능 최적화는 캐시 + fan-out 제어 + timeout 관리가 핵심
