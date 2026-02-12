---
name: commit-push
description: 이 스킬은 사용자가 "커밋 푸시", "commit-push", "커밋하고 푸시"를 요청할 때 사용합니다. 변경사항을 커밋한 후 원격 저장소에 푸시합니다.
---

# /commit-push - 커밋 + 푸시

## 실행 절차

### Phase 1: 커밋 (/commit 절차 전체 수행)

1. `git status` + `git diff` + `git diff --cached` 로 변경사항 분석
2. `message` 인자 있으면 → 전체를 하나로 커밋
3. 없으면 → 논리적 그룹으로 분류 → 사용자 확인 → 그룹별 커밋
4. 커밋 메시지 규칙: `/commit` 스킬과 동일

커밋 실패 시 여기서 중단.

### Phase 2: 푸시 (/push 절차 수행, 미커밋 경고 생략)

1. 현재 브랜치 확인
2. main/master면 경고 + 사용자 확인
3. 원격 트래킹 확인 → 없으면 `git push -u origin <branch>`
4. `git push` 실행

### 결과 출력

```
✓ 커밋 완료 (N개)
  abc1234 feat: User 엔티티 및 Repository 추가
  def5678 chore: Redis 의존성 추가

✓ 푸시 완료: origin/<브랜치명>
```

## 커밋 메시지 규칙

- `/commit` 스킬과 동일
- `Co-Authored-By`, `Generated with Claude Code`, AI 관련 문구 **절대 포함 금지**
