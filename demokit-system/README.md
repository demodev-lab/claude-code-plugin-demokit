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
│   └── context-engineering.md         ← 컨텍스트 엔지니어링
└── components/
    └── overview.md                    ← 컴포넌트 총괄
```

## 핵심 링크

- [[_GRAPH-INDEX]] — 전체 노드 인덱스
- [[philosophy/core-mission]] — 왜 이 플러그인이 존재하는가
- [[philosophy/pdca-methodology]] — PDCA 개발 방법론
- [[philosophy/context-engineering]] — 훅/스킬/에이전트 계층 구조
- [[components/overview]] — 에이전트 15개, 스킬 32개, 훅 10개 총괄
