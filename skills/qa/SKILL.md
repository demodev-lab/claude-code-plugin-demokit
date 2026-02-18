---
name: qa
description: 이 스킬은 사용자가 "qa", "품질 분석", "빌드 분석", "로그 분석", "테스트 리포트"를 요청할 때 사용합니다. Zero-Script QA (로그 기반 품질 분석).
---

# /qa - Zero-Script QA

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/qa — Zero-Script QA (로그 기반 품질 분석)

사용법:
  /qa              전체 QA 분석 실행
  /qa build        Gradle 빌드 로그 분석
  /qa test         JUnit 테스트 리포트 분석
  /qa log          애플리케이션 로그 분석
  /qa summary      종합 QA 리포트

예시:
  /qa
  /qa build
  /qa test
  /qa log

관련 명령:
  /test     — 테스트 코드 생성
  /review   — 코드 리뷰
  /pipeline — 개발 파이프라인
```

## 실행 절차

**담당 에이전트**: qa-monitor

### /qa (전체)
1. 빌드 분석 → 테스트 분석 → 로그 분석 순서로 실행
2. 종합 QA 리포트 생성

### /qa build (빌드 분석)
1. Gradle 빌드 실행 (`./gradlew build --console=plain`)
2. 빌드 로그에서 패턴 추출:
   - `BUILD SUCCESSFUL` / `BUILD FAILED`
   - `FAILURE:` 이후 에러 메시지
   - `Deprecated` 경고
   - 컴파일 에러 (`error:` 패턴)
3. 결과 요약 출력

### /qa test (테스트 분석)
1. 테스트 실행 (`./gradlew test --console=plain`)
2. JUnit XML 리포트 파싱 (`build/test-results/test/*.xml`)
3. 분석 항목:
   - 전체/성공/실패/스킵 테스트 수
   - 실패 테스트 상세 (클래스, 메서드, assertion 메시지)
   - 테스트 실행 시간 (느린 테스트 식별)
4. 결과 테이블 출력

### /qa log (로그 분석)
1. 로그 파일 탐색 (`logs/`, `build/`, `*.log`)
2. ERROR/WARN 패턴 추출 및 그룹핑
3. 분석 항목:
   - ERROR 로그: 예외 유형별 카운트, root cause 추출
   - WARN 로그: Deprecated API 사용, 설정 경고
   - Stack trace 최상위 원인 분석
4. 심각도별 분류 출력

### /qa summary (종합 리포트)
1. 빌드/테스트/로그 분석 결과 종합
2. 리포트 형식:

```markdown
## QA 종합 리포트

### 빌드 상태
- 결과: SUCCESS / FAILED
- 경고: N개

### 테스트 상태
- 전체: N / 성공: N / 실패: N / 스킵: N
- 커버리지: N% (측정 가능 시)

### 로그 분석
- ERROR: N건
- WARN: N건

### 권장 조치
1. [Critical] ...
2. [Warning] ...
3. [Info] ...
```
