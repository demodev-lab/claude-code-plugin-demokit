# demokit ↔ bkit 벤치마킹 리포트 (2026-02-19)

## 1) 탐색 범위
- 현재 플러그인: `/Users/wongil/Desktop/claude-code-plugin-demokit`
- 비교 대상: `/Users/wongil/Desktop/bkit-claude-code` (repo: https://github.com/popup-studio-ai/bkit-claude-code)
- 비교 관점: hooks/manifest/skills/agents/scripts/docs/검증 체계

---

## 2) 빠른 비교 스냅샷

| 항목 | demokit | bkit | 관찰 포인트 |
|---|---:|---:|---|
| Skills | 33 | 27 | demokit이 Spring Boot 특화 스킬 더 많음 |
| Agents | 16 | 16 | 수량 동일, bkit은 frontmatter/메타 정보가 더 풍부 |
| Scripts | 21 | 45 | bkit은 phase별 세분화 훅 스크립트가 많음 |
| Hooks 이벤트 | 10 | 10 | 이벤트 수는 동일, bkit은 schema+timeout 정교 |
| Output Styles | 3 파일 | 4 파일 | demokit은 파일 존재하지만 plugin.json 노출 설정 없음 |
| System docs | 6 파일 | 20 파일+ | bkit-system이 시나리오/트리거/테스트 문서 더 체계적 |

---

## 3) 벤치마킹하면 좋은 부분 (bkit → demokit)

### A. Hook 설정 안정성 강화
**근거 파일**
- demokit: `hooks/hooks.json`
- bkit: `hooks/hooks.json`

**관찰**
- demokit은 `$schema`, hook `timeout`, `once`(SessionStart)가 없음.
- bkit은 모든 hook command에 timeout이 있고 SessionStart는 `once: true`로 실행 안전성이 높음.

**추천**
1. `hooks/hooks.json`에 schema 추가
2. 각 hook command timeout 지정 (3~10초)
3. SessionStart `once: true` 적용

**효과**
- 훅 무한 대기/중복 실행 리스크 감소

---

### B. Output Style 자동 발견(실사용성)
**근거 파일**
- demokit: `output-styles/*.md`, `.claude-plugin/plugin.json`
- bkit: `.claude-plugin/plugin.json`, `commands/output-style-setup.md`

**관찰**
- demokit은 output style 파일은 존재하지만 `plugin.json`에 `outputStyles` 필드가 없음.
- bkit은 `outputStyles` 연결 + setup 커맨드로 사용자 적용 UX가 명확함.

**추천**
1. demokit `plugin.json`에 `"outputStyles": "./output-styles/"` 추가
2. `/output-style-setup` 성격의 설치 가이드/커맨드 추가

**효과**
- 스타일 발견성/적용률 상승

---

### C. Marketplace 메타데이터 표준화
**근거 파일**
- demokit: `.claude-plugin/marketplace.json`
- bkit: `.claude-plugin/marketplace.json`

**관찰**
- demokit은 `source: "./"`, `metadata.version` 구조 중심.
- bkit은 schema 선언 + `source.url` 기반 배포형 구조.

**추천**
1. 마켓플레이스 JSON schema 준수 구조로 업그레이드
2. 원격 설치 가능한 `source.url` 기반 엔트리 제공

**효과**
- 외부 설치/배포 호환성 향상

---

### D. SessionStart 온보딩/재개 UX 고도화
**근거 파일**
- demokit: `hooks/session-start.js`
- bkit: `hooks/session-start.js`

**관찰**
- demokit은 Spring 분석/PDCA 상태 요약이 강점.
- bkit은 “기존 작업 재개/신규 시작” 유도, 팀모드/출력스타일 추천, 환경 점검 메시지까지 제공.

**추천**
- demokit 강점을 유지하면서, “첫 입력 시 선택형 재개 UX”만 경량으로 도입

**효과**
- 세션 재개 생산성 향상

---

### E. 운영 문서(시나리오/트리거/테스트) 확장
**근거 파일**
- demokit-system/*
- bkit-system/scenarios/*, testing/*, triggers/*

**관찰**
- demokit-system은 철학 중심, 운영 시나리오 문서가 상대적으로 적음.

**추천**
- `demokit-system/scenarios`, `testing`, `triggers` 디렉토리 추가
- 최소 문서: 신규 기능 시작, PDCA 점검, QA 흐름, 트리거 매트릭스

**효과**
- 팀 온보딩/운영 일관성 강화

---

## 4) demokit 자체 보완 포인트

### 1) 사용되지 않는 레거시 스크립트 정리
**후보**
- `scripts/pre-bash.js`, `scripts/post-write.js` (현재 hooks.json에서 미사용)

**추천**
- 제거 또는 `legacy/`로 이동 + README에 deprecated 명시

---

### 2) validator 경고 노이즈 제거
**근거**
- `npm run validate:plugin -- --verbose` 결과:
  - `skill.yaml missing`: `skills/pipeline`, `skills/qa`, `skills/worker`
  - `Unable to parse hook command path: SessionStart...`

**추천**
1. 누락된 `skill.yaml` 3개 추가
2. `lib/core/plugin-validator.js`의 스크립트 경로 파서가 `hooks/` 경로도 파싱하도록 보완

---

### 3) 테스트 사각지대 보완
**근거**
- 현재 Jest 전체 통과(349 tests)지만 커버리지 총 32.97%
- scripts 영역 커버리지 7.84%

**추천 우선순위 테스트**
1. `scripts/stop-handler.js`
2. `scripts/task-completed.js`
3. `hooks/session-start.js`

---

## 5) 우선순위 실행안 (권장)

### Quick Win (1~2일)
1. `plugin.json`에 `outputStyles` 추가
2. `hooks/hooks.json`에 schema+timeout+once 적용
3. `skill.yaml` 3개 보강
4. `plugin-validator` hooks 경로 파싱 보완

### Mid (3~7일)
1. SessionStart 재개 UX(선택형) 경량 도입
2. `demokit-system`에 scenarios/testing/triggers 문서 추가
3. stop/task-completed/session-start 테스트 보강

---

## 6) 결론
- demokit은 **Spring Boot 백엔드 특화성(스킬/설계 규칙/PDCA 흐름)**이 강점.
- bkit에서 가져오면 즉시 효과가 큰 영역은 **운영 안정성(훅 설정), 배포 호환성(마켓플레이스/manifest), 문서 운영 체계**.
- 즉시 적용 가능한 Quick Win 위주로 먼저 반영하면, 사용자 체감 품질과 유지보수성이 빠르게 개선될 가능성이 큼.
