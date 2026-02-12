---
name: push
description: 현재 브랜치를 원격에 푸시
user_invocable: true
arguments: []
---

# /push - 원격 푸시

## 실행 절차

### 1. 미커밋 변경사항 확인
```bash
git status
```
커밋되지 않은 변경사항이 있으면 경고:
```
⚠ 커밋되지 않은 변경사항이 있습니다. 먼저 /commit을 실행하세요.
```
사용자가 그래도 진행하겠다고 하면 계속.

### 2. 현재 브랜치 확인
```bash
git branch --show-current
```

### 3. main/master 보호
현재 브랜치가 `main` 또는 `master`이면:
```
⚠ main/master 브랜치에 직접 푸시하려고 합니다. 계속하시겠습니까?
```
사용자 확인 필요.

### 4. 원격 트래킹 확인 및 푸시
```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

- **트래킹 브랜치 있음**: `git push`
- **트래킹 브랜치 없음**: `git push -u origin <현재브랜치>`

### 5. 결과 출력
```
✓ 푸시 완료: origin/<브랜치명>
```
