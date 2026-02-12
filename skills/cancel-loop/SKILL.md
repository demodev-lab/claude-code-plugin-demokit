---
name: cancel-loop
description: 이 스킬은 사용자가 "루프 취소", "cancel-loop", "loop 중지"를 요청할 때 사용합니다. 활성화된 자율 반복 루프를 즉시 취소합니다.
---

# /cancel-loop - 루프 취소

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/cancel-loop — 활성화된 자율 반복 루프 취소

사용법:
  /cancel-loop

예시:
  /cancel-loop

관련 명령:
  /loop — 자동 반복 실행
```

## 실행 절차

### 1. 루프 취소
아래 명령을 Bash로 실행:

```bash
node scripts/loop-ctl.js cancel
```

### 2. 결과 출력
```
Loop가 취소되었습니다.
```

루프가 활성 상태가 아닌 경우에도 안전하게 실행 가능.
