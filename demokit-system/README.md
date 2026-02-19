# demokit-system

Spring Boot 전문 개발 플러그인 **demokit**의 시스템 아키텍처 문서.

이 디렉토리는 Obsidian 그래프 뷰를 통해 플러그인의 전체 구조를 시각적으로 탐색할 수 있도록 설계되었다.

## 구조

```
demokit-system/
├── README.md                          ← 진입점 (현재 파일)
├── _GRAPH-INDEX.md                    ← 전체 노드 인덱스
├── philosophy/
│   ├── core-mission.md                ← 핵심 미션
│   ├── pdca-methodology.md            ← PDCA 방법론
│   ├── context-engineering.md         ← 컨텍스트 엔지니어링
│   └── architecture-principles.md     ← 설계 원칙
├── components/
│   ├── overview.md                    ← 컴포넌트 총괄
│   ├── team-orchestration.md          ← 팀 오케스트레이션 설계
│   └── pipeline-phase-scripts.md      ← phase별 스크립트 구조
├── scenarios/
│   ├── feature-delivery-flow.md       ← 기능 개발 표준 시나리오
│   ├── qa-stabilization-flow.md       ← QA 안정화 시나리오
│   ├── recovery-playbook.md           ← 장애/중단 복구 플레이북
│   ├── pdca-do-performance.md         ← do 성능 점검 플레이북
│   └── team-delegate-mode.md          ← delegate 모드 운영 시나리오
├── triggers/
│   ├── trigger-matrix.md              ← 트리거-대응 매트릭스
│   └── priority-rules.md              ← 트리거 충돌 우선순위
└── testing/
    └── test-checklist.md              ← 테스트 체크리스트
```

## 핵심 링크

- [[_GRAPH-INDEX]] — 전체 노드 인덱스
- [[philosophy/core-mission]] — 왜 이 플러그인이 존재하는가
- [[philosophy/pdca-methodology]] — PDCA 개발 방법론
- [[philosophy/context-engineering]] — 훅/스킬/에이전트 계층 구조
- [[philosophy/architecture-principles]] — 설계 원칙
- [[components/overview]] — 에이전트/스킬/훅 총괄
- [[components/team-orchestration]] — 레벨 override/delegate 모드
- [[components/pipeline-phase-scripts]] — phase 전용 스크립트 구조
- [[scenarios/feature-delivery-flow]] — 기능 개발 표준 시나리오
- [[scenarios/qa-stabilization-flow]] — QA 안정화 시나리오
- [[scenarios/recovery-playbook]] — 장애/중단 복구
- [[scenarios/pdca-do-performance]] — do 성능 점검
- [[scenarios/team-delegate-mode]] — delegate 모드 운영
- [[triggers/trigger-matrix]] — 트리거 매트릭스
- [[triggers/priority-rules]] — 트리거/훅 충돌 우선순위
- [[testing/test-checklist]] — 릴리즈 전 테스트 체크
