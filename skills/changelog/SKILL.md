---
name: changelog
description: 이 스킬은 사용자가 "변경 로그", "changelog", "릴리즈 노트"를 요청할 때 사용합니다. Git 커밋 이력 기반으로 CHANGELOG를 생성합니다.
---

# /changelog - 변경 로그 생성

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/changelog — Git 기반 CHANGELOG 생성

사용법:
  /changelog [range]

파라미터:
  range  커밋 범위 (선택)
         tag..HEAD, v1.0.0..v2.0.0, --since="1 week ago"

예시:
  /changelog                    — 최근 릴리즈 이후 변경사항
  /changelog v1.0.0..HEAD       — v1.0.0 이후 변경사항
  /changelog --since="1 week"   — 최근 1주 변경사항

관련 명령:
  /commit   — 커밋 생성
  /pr       — PR 생성
```

## 실행 절차

1. **Git 이력 수집**:
   - `git log` 으로 커밋 이력 조회
   - range 미지정 시 가장 최근 태그 이후 커밋
   - 태그 없으면 최근 20개 커밋

2. **커밋 분류** (Conventional Commits 기준):
   | prefix | 카테고리 |
   |--------|----------|
   | feat | 새 기능 |
   | fix | 버그 수정 |
   | refactor | 리팩토링 |
   | docs | 문서 |
   | test | 테스트 |
   | chore | 기타 |

3. **CHANGELOG 생성**:
   ```markdown
   ## [Unreleased] - 2025-xx-xx

   ### 새 기능
   - 사용자 인증 기능 추가 (#12)

   ### 버그 수정
   - 주문 금액 계산 오류 수정 (#15)

   ### 리팩토링
   - UserService 쿼리 최적화
   ```

4. **출력**: 마크다운 형식으로 출력 (파일 생성은 사용자 확인 후)
