# /demokit

`demokit` 기능 허브 커맨드 문서.

## 빠른 시작

1. `/help` — 전체 커맨드 목록
2. `/init` — 프로젝트 초기화/분석
3. `/crud User` — 도메인 CRUD 생성
4. `/pdca plan feature-name` — PDCA 시작

## 자주 쓰는 커맨드

- 생성: `/crud`, `/entity`, `/repository`, `/service`, `/controller`, `/dto`
- 품질: `/test`, `/review`, `/qa`, `/optimize`
- 워크플로우: `/pdca`, `/pipeline`, `/loop`, `/plan-plus`
- Git: `/commit`, `/commit-push`, `/push`, `/pr`

## 추천 순서

- 신규 기능: `/pdca plan -> /pdca design -> /pdca do -> /pdca analyze`
- 단순 CRUD: `/crud {Domain}` 후 `/test`
- 안정화: `/review` + `/qa`

## 참고

출력 스타일 설정은 `/output-style-setup` 문서를 참고.
