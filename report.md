# 통합 워커 리포트
생성일: 2026-02-19 18:33:19

## 완료된 워커
- worker-1: BENCHMARK-demokit-vs-bkit.md
- worker-2: BENCHMARK-bkit-demokit-2026-02-19.md
- worker-3: .omx/state/team/users-wongil-desktop-bkit-clau/workers/worker-3/task-3-benchmark-report.md

## worker-1 결과
### Source: `BENCHMARK-demokit-vs-bkit.md`

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

---

## worker-2 결과
### Source: `BENCHMARK-bkit-demokit-2026-02-19.md`

# demokit ↔ bkit 벤치마킹 리포트 (2026-02-19)

## 1) 조사 범위
- 현재 플러그인: `/Users/wongil/Desktop/claude-code-plugin-demokit`
- 비교 레퍼런스: `/Users/wongil/Desktop/bkit-claude-code` (https://github.com/popup-studio-ai/bkit-claude-code)

## 2) 빠른 비교 스냅샷

| 항목 | demokit | bkit | 메모 |
|---|---:|---:|---|
| Skills | 33 | 27 | demokit이 Spring Boot 도메인 분화가 더 세밀함 |
| Agents | 15개 정의 + common 문서 1개 | 16 | demokit은 agent 파일 YAML frontmatter 부재 |
| Scripts | 21 | 45 | bkit이 운영/문서화/phase 자동화 스크립트가 풍부 |
| Hooks 이벤트 | 10 | 10 | 이벤트 수는 동일 |
| Hook timeout 지정 | 0/14 | 13/13 | bkit은 timeout/once를 적극 사용 |
| Output Styles | 3 | 4 | bkit은 plugin.json `outputStyles`로 자동 발견 연계 |
| 테스트 | Jest 28 suites, 349 tests (모두 PASS) | test 디렉토리 없음 | demokit 강점 |
| 시스템 문서 세트 | demokit-system 최소셋 | bkit-system 다층 문서(components/scenarios/triggers/testing) | bkit 문서 체계 우세 |

---

## 3) demokit에 바로 벤치마킹하기 좋은 포인트 (우선순위)

### P0. 메타데이터 정합성/기계가독성 강화
**왜 필요한가**
- demokit skills frontmatter는 대부분 `name`, `description` 2개 키 중심.
- demokit agent 파일은 YAML frontmatter가 없어(현재는 본문 규칙 기반) 도구/모델/트리거를 정적으로 검증하기 어려움.

**bkit에서 벤치마킹할 점**
- agent/skill frontmatter에 `model`, `tools`, `user-invocable`, `allowed-tools`, `argument-hint`, `imports` 등 명시.
- 자동 검증/문서/검색 시 신뢰도 상승.

**제안 액션**
1. `agents/*.md`에 최소 frontmatter 스키마 도입 (`name`, `description`, `model`, `tools`, `memory`).
2. `skills/*/SKILL.md`에도 `allowed-tools`, `argument-hint`, `user-invocable`를 점진 도입.
3. `scripts/validate-plugin.js`를 `scripts/validate-hooks.js`와 파서 로직 공유하도록 통합(현재 경고 1건: SessionStart hooks 경로 파싱 한계).

---

### P0. 배포 메타데이터/마켓플레이스 스키마 강화
**왜 필요한가**
- demokit `plugin.json`에는 `outputStyles`가 없어 스타일 자동 발견 UX를 놓치고 있음.
- marketplace 파일에 `$schema`/버전/원격 source 구조가 없어 배포 자동화 확장성이 제한됨.

**bkit에서 벤치마킹할 점**
- `.claude-plugin/plugin.json`에 `outputStyles` 명시.
- `.claude-plugin/marketplace.json`에 `$schema`, 버전, URL source 구조 사용.

**제안 액션**
1. demokit `plugin.json`에 `outputStyles` 필드 추가.
2. marketplace에 `$schema` 및 버전 필드 도입.
3. 배포 채널 확장 시 `source: { source: "url", url: "..." }` 패턴 고려.

---

### P0. 문서 드리프트(실제 구성과 문서 수치 불일치) 자동 감지
**왜 필요한가**
- `demokit-system/components/overview.md`가 Skills 32개로 표기되어 있으나 실제는 33개.

**bkit에서 벤치마킹할 점**
- CHANGELOG/문서에서 버전 단위로 구성 변경(개수 증감)을 기록.

**제안 액션**
1. 컴포넌트 인벤토리 자동 생성 스크립트 추가(agents/skills/scripts/hook count 산출).
2. CI에서 README/overview 숫자와 실제 파일 카운트 일치 검증.

---

### P1. 커스터마이징 가이드/운영 문서 패키지 확장
**왜 필요한가**
- demokit은 README 중심 설명은 강하지만, 조직 커스터마이징 가이드/운영 규약 분리 문서가 상대적으로 약함.

**bkit에서 벤치마킹할 점**
- `CUSTOMIZATION-GUIDE.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `LICENSE`, `NOTICE` 분리 운영.

**제안 액션**
1. `CUSTOMIZATION-GUIDE.md` 추가: `.claude/ override 우선순위, 업데이트 충돌 전략.
2. `CHANGELOG.md` 분리: Keep a Changelog 형식 + 호환 버전 명시.
3. `LICENSE`/`NOTICE` 파일 명시(현재 plugin.json 라이선스 표기만 존재).

---

### P1. 사용자 진입 UX 개선 (명령 discoverability)
**왜 필요한가**
- demokit `/help`는 잘 되어 있으나, bkit처럼 별도 command 엔트리(`/bkit`, `/output-style-setup`)가 있으면 초심자 진입이 더 쉬움.

**bkit에서 벤치마킹할 점**
- `commands/bkit.md`: 전체 기능 카탈로그 허브.
- `commands/output-style-setup.md`: 출력 스타일 설치 자동화.

**제안 액션**
1. `commands/demokit.md` 추가(단일 진입 허브).
2. `commands/output-style-setup.md` 또는 동등 skill 추가.

---

### P2. 시스템 문서 레이어 확장
**왜 필요한가**
- demokit-system은 철학/개요 중심으로 깔끔하지만, 운영 시나리오/트리거 매트릭스/테스트 체크리스트가 부족.

**bkit에서 벤치마킹할 점**
- `bkit-system/scenarios/*`, `triggers/*`, `testing/test-checklist.md`.

**제안 액션**
1. `demokit-system/scenarios/` 추가 (신규 기능, QA, 복구 시나리오).
2. `demokit-system/triggers/trigger-matrix.md` 추가.
3. `demokit-system/testing/test-checklist.md` 추가.

---

### P2. 다국어 트리거 전략 확장 (선택)
**왜 필요한가**
- demokit은 한/영 중심으로 충분히 실용적이지만 글로벌 배포를 고려하면 bkit 수준 다국어 트리거가 유리.

**bkit에서 벤치마킹할 점**
- 8개 언어 트리거 키워드 체계.

**제안 액션**
1. 우선 `help`, `pdca`, `review`, `pipeline` 등 상위 사용 스킬부터 다국어 트리거 확장.
2. 응답 언어 설정(`settings language`) 가이드 문서화.

---

## 4) demokit이 유지해야 할 현재 강점 (복사보다 유지)
1. **Spring Boot 특화 깊이**: `/crud`, `/entity`, `/service`, `/migration` 등 실무형 백엔드 스킬 분해가 뛰어남.
2. **테스트 기반 품질 문화**: Jest 테스트셋이 실제로 동작하며(28 suites, 349 tests pass), 구조 안정성 확보에 유리.
3. **도메인 코드 템플릿 강점**: `templates/code/*.java` 세트가 bkit 대비 백엔드 생성 업무에 직접적.

---

## 5) 추천 실행 순서 (2주 기준)

### Week 1 (빠른 체감)
1. `plugin.json`에 `outputStyles` 추가.
2. `marketplace.json`에 `$schema`/버전 필드 추가.
3. `validate-plugin.js` 훅 경로 파싱 개선(경고 제거).
4. 문서 카운트 자동검증 스크립트 추가.

### Week 2 (중기 정리)
1. 에이전트 frontmatter 최소 스키마 도입.
2. `CHANGELOG.md` + `CUSTOMIZATION-GUIDE.md` + `LICENSE` 추가.
3. `demokit-system`에 scenarios/triggers/testing 문서 보강.

---

## worker-3 결과
### Source: `.omx/state/team/users-wongil-desktop-bkit-clau/workers/worker-3/task-3-benchmark-report.md`

# demokit ↔ bkit 벤치마킹 리포트 (Task 3)

작성일: 2026-02-19

## 1) 비교 범위
- 현재 플러그인: `/Users/wongil/Desktop/claude-code-plugin-demokit`
- 벤치마크 대상: `/Users/wongil/Desktop/bkit-claude-code` (https://github.com/popup-studio-ai/bkit-claude-code)

## 2) 한눈에 비교

| 항목 | demokit | bkit | 시사점 |
|---|---:|---:|---|
| Skills | 33 | 27 | demokit이 도메인 커버는 넓음 |
| Scripts | 21 | 45 | bkit이 런타임/훅 운영 자동화가 더 세분화됨 |
| Hook Events | 10 | 10 | 이벤트 수는 유사, 운영 설정 품질 차이 존재 |
| Output Styles | 3 | 4 | bkit은 manifest 연동까지 포함 |
| 테스트 | 28 (test/) | 0(레포 내 테스트 없음) | demokit 강점 |
| 문서/운영 가이드 | README 중심 | README + CUSTOMIZATION/CONTRIBUTING/AI-NATIVE 문서 | bkit이 운영 관점 문서화 성숙 |

---

## 3) 바로 벤치마킹 추천 (우선순위 순)

### P0-1. 플러그인 메타데이터/호환성 정합성 강화
- **bkit 참고**
  - `.claude-plugin/plugin.json`의 `outputStyles` 노출
  - `.claude-plugin/marketplace.json`의 `$schema`, `source` 구조화
- **demokit 현황**
  - output-styles 디렉토리는 있으나 `.claude-plugin/plugin.json`에 `outputStyles` 없음
  - marketplace에 `$schema` 없음
  - README 요구사항이 `Claude Code >= 1.0.0`인데, 실제로는 `TeammateIdle/SubagentStart/SubagentStop/TaskCompleted` 훅 사용 중
- **권장 보완**
  1. plugin/marketplace manifest 스키마화
  2. `outputStyles` 공개
  3. 실제 훅 요구 버전에 맞춘 최소 Claude Code 버전 명시

### P0-2. hooks.json 운영 안정성(타임아웃/once/스키마) 보강
- **bkit 참고**: `hooks/hooks.json`에 `$schema`, hook별 `timeout`, `SessionStart.once`
- **demokit 현황**: timeout/once 지정 없음
- **권장 보완**
  - Hook별 timeout 표준값 도입
  - SessionStart `once` 적용 검토
  - hooks schema 선언

### P0-3. Config 우선순위(project > session > user > plugin) 실제 동작 일치화
- **bkit 참고**: `lib/permission-manager.js`가 context hierarchy를 실제 권한 계산에 사용
- **demokit 현황**
  - README는 우선순위를 명시하지만, 여러 핵심 경로가 `lib/core/config.js`(plugin 파일 직독) 사용
  - `lib/context-hierarchy.js`는 존재하나 적용 범위가 제한적
- **권장 보완**
  - permission / team / task 분류 / pre-write 등에서 `getHierarchicalConfig` 기반으로 통일
  - README 문구와 런타임 동작 1:1 정합성 확보

### P0-4. Skill 메타데이터 완성도 100% 달성
- **demokit 검증 결과**: `npm run validate:plugin` 경고 4건
  - `skills/pipeline`, `skills/qa`, `skills/worker`의 `skill.yaml` 누락
  - hook command path 파서가 `hooks/session-start.js`를 완전 인식 못함
- **권장 보완**
  - 누락된 skill.yaml 보강
  - validator의 경로 파서(`hooks/`도 env 패턴 인식) 수정

### P1-1. UserPrompt 단계 인지 보강 (의도/기능/팀 제안)
- **bkit 참고**: `scripts/user-prompt-handler.js`
  - 신규 feature 의도 탐지
  - implicit skill/agent 트리거
  - 팀 모드 제안
- **demokit 현황**: 의도 감지/모호성 판별은 있으나, 신규 feature 탐지·팀 추천은 상대적으로 축소
- **권장 보완**
  - 신규 기능/대규모 변경 감지 시 `/pdca`, `/plan-plus`, 팀 모드 제안 자동화

### P1-2. Team 상태 가시성 모델 확장
- **bkit 참고**: `lib/team/state-writer.js`의 진행률/최근 메시지 ring-buffer 중심 구조
- **demokit 현황**: `.demodev/team-state.json` 기반 상태는 있으나 UI/IPC형 가시성 모델은 상대적으로 약함
- **권장 보완**
  - progress snapshot + recent message log를 표준화해 HUD/외부 도구 연동성 확보

### P1-3. 운영 문서 세트 확장
- **bkit 참고**: `CUSTOMIZATION-GUIDE.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `AI-NATIVE-DEVELOPMENT.md`
- **demokit 현황**: README는 풍부하지만 운영/기여/커스터마이징 별도 가이드 분리는 제한적
- **권장 보완**
  - 설치/운영/커스터마이징/기여/문제해결 문서를 분리해 유지보수성 강화

### P2. 온보딩 이원화(Starter + Pro)
- **bkit 참고**: marketplace에서 `bkit` + `bkit-starter` 투트랙 운영
- **demokit 적용 아이디어**
  - `demokit-starter`(입문형) + `demokit`(전문형) 분리하면 사용자 확장에 유리

---

## 4) demokit의 현재 강점 (유지 권장)
1. Spring Boot 특화 분석/검증 체계 (`lib/spring/*`, pre-write convention checker)
2. 테스트 기반 품질 장치(28개 테스트 파일)
3. Team/PDCA 모듈 분리와 state 관리 구조의 확장성

---

## 5) 실행 제안 (2주 단위)

### Week 1 (빠른 정합성)
- plugin/marketplace/hooks 스키마 및 메타데이터 정리
- skill.yaml 누락 제거 + validator 경고 0화
- README 최소 버전/호환성 정정

### Week 2 (런타임 고도화)
- config hierarchy 실사용 통합
- UserPrompt 신규 기능/팀 추천 로직 강화
- team state 가시성(진행률/메시지) 확장

---

## 결론
- demokit은 **Spring Boot 도메인 특화와 테스트 품질**이 강점.
- bkit에서 가장 바로 가져오면 효과 큰 부분은 **운영 메타데이터 정합성(스키마/버전/manifest), hooks 안정성, config hierarchy 실적용, 문서 운영 체계**.
- 위 4가지를 우선 적용하면 배포 안정성과 사용자 신뢰도를 빠르게 끌어올릴 수 있음.

---

