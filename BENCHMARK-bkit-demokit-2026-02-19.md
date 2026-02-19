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

