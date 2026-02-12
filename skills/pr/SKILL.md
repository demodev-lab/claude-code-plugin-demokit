---
name: pr
description: 이 스킬은 사용자가 "PR", "pr", "Pull Request", "풀 리퀘스트"를 요청할 때 사용합니다. dev 브랜치 기준으로 PR 템플릿을 생성합니다.
---

# /pr - Pull Request 생성

## 실행 절차

### 1. 정보 수집 (병렬)
다음 명령을 **병렬로** 실행하여 정보를 수집한다:
- `git branch --show-current` — 현재 브랜치 + 이슈 번호 추출
- `git log dev..HEAD --oneline` — 커밋 이력 분석
- `git diff dev...HEAD --stat` — 변경 파일 목록

이슈 번호 추출 규칙:
- 브랜치명에서 `/` 뒤의 첫 번째 연속 숫자를 이슈 번호로 사용
- 예: `feature/33-chat` → `33`, `fix/127-login-bug` → `127`
- 숫자가 없으면 이슈 번호 없이 진행

**dev 브랜치가 없는 경우:**
- `main` 또는 `master`로 fallback
- "dev 브랜치가 없어 main을 기준으로 분석합니다." 안내 출력

### 2. PR 제목 생성
- `title` 인자 있으면 그대로 사용
- 없으면 변경사항 분석 기반 자동 생성
- 형식: `{Label}: {Title} #{이슈번호}`
- Label: `feat`, `fix`, `refactor`, `chore`, `docs` 등

### 3. PR 템플릿 출력

**출력 절대 규칙:**
- 반드시 ```` ```markdown ```` 코드 블록으로 감싸서 출력 (렌더링 방지)
- `- [ ]` 체크박스, `##` 헤더가 raw text로 보여야 함
- PR 양식만 출력, 부연 설명 금지

아래 양식을 **정확히** 사용한다. `{placeholder}`를 실제 값으로 치환:

```
PR 제목: {Label}: {Title} #{이슈번호}

```markdown
## #️⃣ Issue Number
- #{이슈번호}

## ☑️PR Checklist
- [ ] `.github/conventions.md`의 컨벤션을 준수했습니다.
- [ ] 변경 사항에 대한 테스트가 추가되었습니다.
- [ ] 문서가 추가되었거나 업데이트 되었습니다.

## 📌 What is the current behavior?
{dev 기준 현재 동작 설명}

## ✨ What is the new behavior?
- {변경사항 1}
- {변경사항 2}

## ⚠️Does this PR introduce a breaking change?
- [ ] Yes
- [ ] No

## 💬 Other information
{기타 참고사항, 없으면 "없음"}

## 🔒 closing issue
close #{이슈번호}
```
```
