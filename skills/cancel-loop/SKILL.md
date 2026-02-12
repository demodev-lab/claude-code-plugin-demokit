---
name: cancel-loop
description: 이 스킬은 사용자가 "루프 취소", "cancel-loop", "loop 중지"를 요청할 때 사용합니다. 활성화된 자율 반복 루프를 즉시 취소합니다.
---

# /cancel-loop - 루프 취소

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
