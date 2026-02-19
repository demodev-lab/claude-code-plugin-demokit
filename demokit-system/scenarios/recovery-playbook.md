# Recovery Playbook

작업 중단/훅 이슈/상태 꼬임 발생 시 복구 절차.

## 1) 루프 중단
- `/cancel-loop`
- 필요 시 루프 상태 파일 확인

## 2) PDCA 상태 점검
- `/pdca status`
- 잘못된 phase면 최근 산출물(plan/design/analysis) 기준으로 재정렬

## 3) 훅 검증
```bash
npm run validate:plugin -- --verbose
```

## 4) 최소 정상화 기준
- validate 경고/에러 0
- 핵심 테스트 통과
- 다음 작업 명령 1개만 합의 후 재개
