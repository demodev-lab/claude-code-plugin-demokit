# Pipeline Phase Scripts

9단계 파이프라인 phase 전용 pre/post/stop/transition 스크립트 구조.

## 목적

- phase별 처리 코드를 분리해 가시성 향상
- Stop/TaskCompleted에서 현재 phase 기준 힌트 제공
- Pre/Post 경량 훅으로 phase 맥락 메타데이터를 일관되게 기록
- 공통 로직과 phase별 로직 분리

## 구성

### 공통 런타임
- `scripts/pipeline-phase-runtime.js`
- `scripts/pipeline-phase-stop-common.js`

### Dispatcher
- `scripts/pipeline-phase-pre.js`
- `scripts/pipeline-phase-post.js`
- `scripts/pipeline-phase-stop.js`
- `scripts/pipeline-phase-transition.js`

### phase 전용 스크립트
- `scripts/phase-1-schema-{pre,post,stop}.js`
- `scripts/phase-2-convention-{pre,post,stop}.js`
- `scripts/phase-3-infra-{pre,post,stop}.js`
- `scripts/phase-4-feature-{pre,post,stop}.js`
- `scripts/phase-5-integration-{pre,post,stop}.js`
- `scripts/phase-6-testing-{pre,post,stop}.js`
- `scripts/phase-7-performance-{pre,post,stop}.js`
- `scripts/phase-8-review-{pre,post,stop}.js`
- `scripts/phase-9-deployment-{pre,post,stop}.js`

## Hook 연결

- `PreToolUse`: `pipeline-phase-pre.js`
- `PostToolUse`: `pipeline-phase-post.js`
- `Stop`: `pipeline-phase-stop.js`
- `TaskCompleted`: `pipeline-phase-transition.js`

## 실행 흐름

1. Hook 이벤트 발생
2. dispatcher가 `.pipeline/status.json`의 `currentPhase` 확인
3. 해당 phase 전용 스크립트 로드
4. stage(pre/post/stop/transition)에 맞는 힌트/메타데이터 출력

## 운영 토글

`demodev.config.json > developmentPipeline.phaseScripts`:

- `enabled`
- `preEnabled`
- `postEnabled`
- `transitionEnabled`

권장 기본값:
- `preEnabled=false`
- `postEnabled=false`
- `transitionEnabled=true`

## 설계 원칙

- phase 스크립트는 가능한 한 side-effect 없이 힌트/가이드만 제공
- 상태 전이는 `/pipeline next` 명령으로 명시적 수행
- phase별 로직은 파일 분리, 공통 파싱/판정은 runtime/common에 집중

## 관련 문서
- [[overview]]
- [[../scenarios/pdca-do-performance]]
