---
name: commit
description: 이 스킬은 사용자가 "커밋", "commit", "변경사항 커밋"을 요청할 때 사용합니다. 변경사항을 논리적 단위로 분해하여 스마트 커밋을 수행합니다.
---

# /commit - 스마트 커밋

## 실행 절차

### 1. 변경사항 분석
아래 3개 명령을 **병렬로** 실행하여 현재 상태를 파악한다:
```bash
git status
git diff
git diff --cached
```

변경사항이 없으면 "커밋할 변경사항이 없습니다." 출력 후 종료.

### 2. 커밋 방식 결정

**message 인자가 있는 경우:**
- 모든 변경 파일을 하나로 묶어 커밋 → Step 5로 이동

**message 인자가 없는 경우:**
- 변경 파일들을 논리적 그룹으로 분류 → Step 3으로 이동

### 3. 논리적 그룹 분류

변경된 파일들을 아래 기준으로 그룹화:

| 우선순위 | 기준 | 예시 |
|---------|------|------|
| 1 | 동일 도메인 디렉토리 (`domain/{name}/`) | `domain/user/User.java` + `domain/user/UserRepository.java` |
| 2 | 설정 파일 (`application.yml`, `build.gradle`, config 등) | `application.yml`, `build.gradle.kts` |
| 3 | 공통 모듈 (`common/`, `global/`, `shared/`) | `common/exception/ErrorCode.java` |
| 4 | 인프라 (`infra/`, `config/`) | `infra/redis/RedisConfig.java` |
| 5 | 문서 (`.md` 파일) | `README.md`, `CHANGELOG.md` |
| 6 | 기타 | 위에 해당하지 않는 파일 |

**규칙:**
- 테스트 파일은 해당 구현 파일과 같은 그룹에 포함
- 하나의 파일이 여러 그룹에 해당하면 가장 구체적인 그룹에 배치

### 4. 사용자 확인

그룹별 커밋 계획을 표로 제시:

```
| # | 커밋 메시지 | 파일 |
|---|-----------|------|
| 1 | feat: User 엔티티 및 Repository 추가 | domain/user/User.java, domain/user/UserRepository.java |
| 2 | chore: Redis 의존성 추가 | build.gradle.kts |
```

사용자 확인을 받은 후 진행.

### 5. 커밋 실행

그룹별로 순차 실행:
```bash
git add <파일1> <파일2> ...
git commit -m "<type>: <subject>"
```

### 6. 결과 출력

```
✓ 커밋 완료 (N개)
  abc1234 feat: User 엔티티 및 Repository 추가
  def5678 chore: Redis 의존성 추가
```

## 커밋 메시지 규칙

- 형식: `<type>: <subject>`
- type: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`
- subject: 한국어, 명령형
- 이모지 사용 금지
- `Co-Authored-By`, `Generated with Claude Code`, AI 관련 문구 **절대 포함 금지**
- HEREDOC 형식 사용:
```bash
git commit -m "$(cat <<'EOF'
<type>: <subject>
EOF
)"
```
