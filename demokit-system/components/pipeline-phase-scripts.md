# Pipeline Phase Scripts

9단계 파이프라인 phase 전용 stop 스크립트 구조.

## 목적

- phase별 처리 코드를 분리해 가시성 향상
- Stop 훅에서 현재 phase에 맞는 메시지/후속 액션 힌트 제공
- 공통 로직과 phase별 로직 분리

## 구성

공통:
- `scripts/pipeline-phase-stop-common.js`
- `scripts/pipeline-phase-stop.js` (dispatcher)

phase 전용:
- `scripts/phase-1-schema-stop.js`
- `scripts/phase-2-convention-stop.js`
- `scripts/phase-3-infra-stop.js`
- `scripts/phase-4-feature-stop.js`
- `scripts/phase-5-integration-stop.js`
- `scripts/phase-6-testing-stop.js`
- `scripts/phase-7-performance-stop.js`
- `scripts/phase-8-review-stop.js`
- `scripts/phase-9-deployment-stop.js`

## 실행 흐름

1. `Stop` 이벤트 발생
2. `pipeline-phase-stop.js`가 `.pipeline/status.json`의 현재 phase 확인
3. 해당 phase 전용 스크립트 로드
4. 완료 신호(task text)가 감지되면 다음 액션 힌트 출력

## 설계 원칙

- phase 스크립트는 가능한 한 side-effect 없이 힌트/가이드만 제공
- 상태 전이는 `/pipeline next` 명령으로 명시적 수행
- phase별 로직은 파일 분리, 공통 파싱/판정은 common에 집중

## 관련 문서
- [[overview]]
- [[../scenarios/pdca-do-performance]]
