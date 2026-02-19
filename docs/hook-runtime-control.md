# Hook Runtime Control

## Timeout Policy

모든 hook command는 ms 단위 timeout을 명시한다.

권장:
- lightweight: 1500~3000
- standard: 5000
- heavy summary/report: 10000

## Validation

- `scripts/validate-hooks.js`에서 timeout/스크립트 경로 점검
- `scripts/validate-plugin.js`에서 hooks/skills/metadata 점검

## Operational Tips

- PreToolUse/PostToolUse 훅은 핫패스이므로 가볍게 유지
- TaskCompleted/Stop 훅에 무거운 로직 집중
- 문제가 생기면 hook을 단계적으로 비활성화하여 원인 분리
