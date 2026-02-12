---
name: loop
description: 이 스킬은 사용자가 "loop", "자율 반복", "자동 반복"을 요청할 때 사용합니다. 작업 완료까지 자동으로 반복 실행하는 루프를 시작합니다.
---

# /loop - 자율 반복 루프

> Ralph Wiggum 스타일: Stop hook으로 Claude 종료를 가로채서 같은 prompt를 재실행.
> 작업 완료까지 자동으로 반복하며, 매 반복마다 이전 결과를 확인하고 개선.

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/loop — 작업 완료까지 자동 반복 실행

사용법:
  /loop {prompt} [--max-iterations N] [--completion-promise "..."]

파라미터:
  prompt  실행할 작업 프롬프트 (필수)

옵션:
  --max-iterations      최대 반복 횟수 (기본 10)
  --completion-promise  완료 신호 문자열 (기본 LOOP_DONE)

예시:
  /loop User 도메인 CRUD 구현 + 테스트 작성
  /loop 전체 테스트 통과시켜줘 --max-iterations 30
  /loop 인증 시스템 구현 --completion-promise "AUTH_COMPLETE"

관련 명령:
  /cancel-loop  — 루프 즉시 취소
  /pdca iterate — 설계-구현 Gap 반복 개선
```

## 동작 원리

```
1. /loop 실행 → 루프 상태 활성화
2. Claude가 작업 수행
3. Claude가 멈추려 하면 Stop hook이 가로챔
4. 같은 prompt를 재주입 → Claude가 이전 결과를 보고 계속 작업
5. completion promise 감지 또는 max-iterations 도달 시 종료
```

## 실행 절차

### 1. 루프 활성화
사용자 prompt를 파싱하여 아래 명령을 Bash로 실행:

```bash
node scripts/loop-ctl.js start \
  --prompt "{사용자가 지정한 작업 프롬프트}" \
  --max-iterations {횟수, 기본 10} \
  --completion-promise "{완료 신호, 기본 LOOP_DONE}"
```

### 2. 작업 시작
루프 활성화 후 즉시 prompt에 명시된 작업을 시작한다.

### 3. 매 반복마다 수행할 것
- 이전 반복에서 작성한 코드/파일 확인
- git diff 또는 파일 읽기로 현재 상태 파악
- 빌드/테스트 실행하여 문제 확인
- 발견된 문제 수정
- 새 기능 추가 (아직 남은 것이 있다면)

### 4. 종료 조건
아래 중 하나를 만족하면 루프가 종료된다:

1. **완료 신호**: 응답에 completion promise 문자열을 포함
   - 기본값: `LOOP_DONE`
   - 모든 작업이 완료되었을 때만 포함할 것
2. **최대 반복**: max-iterations 도달 (안전장치)
3. **수동 취소**: `/cancel-loop` 실행

### 5. 완료 시
작업이 모두 끝나면:
1. 최종 결과를 요약
2. 응답에 completion promise 문자열을 포함 (예: `LOOP_DONE`)
3. 루프가 자동으로 종료됨

## 사용 예시

```bash
# 기본 사용
/loop User 도메인 CRUD 구현 + 테스트 작성 + 빌드 통과시켜줘

# 반복 횟수 지정
/loop Order API 전체 구현 --max-iterations 30

# 완료 신호 커스텀
/loop 인증 시스템 구현 --completion-promise "AUTH_COMPLETE"

# 테스트 통과까지 반복
/loop 전체 테스트 통과시켜줘. 실패하는 테스트를 수정하고 ./gradlew test 통과할 때까지 반복

# 코드 리뷰 + 수정 반복
/loop 코드 리뷰 후 발견된 문제 모두 수정. 더 이상 수정할 것이 없을 때 종료
```

## 적합한 작업

**적합:**
- 명확한 완료 기준이 있는 작업 (테스트 통과, 빌드 성공)
- 반복적 개선이 필요한 작업 (코드 품질 개선, 리팩토링)
- 여러 파일에 걸친 대규모 구현
- 무인 실행이 가능한 작업 (밤새 실행)

**부적합:**
- 사람의 판단/디자인 결정이 필요한 작업
- 완료 기준이 모호한 작업
- 일회성 단순 작업

## 상태 확인
```bash
node scripts/loop-ctl.js status
```

## 관련 명령
- `/cancel-loop` - 루프 즉시 취소
- `/pdca iterate` - PDCA 설계-구현 Gap 반복 개선 (설계 기반)
