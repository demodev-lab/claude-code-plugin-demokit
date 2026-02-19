# /output-style-setup

demokit 출력 스타일 적용 가이드.

## 목적

작업 보고/설계 문서의 톤과 구조를 팀 표준에 맞추기.

## 스타일 위치

- `output-styles/demodev-monolith.md`
- `output-styles/demodev-msa.md`
- `output-styles/demodev-pdca-guide.md`

## 적용 방법

1. 프로젝트 특성에 맞는 스타일 파일 선택
2. 초기 세션에서 다음과 같이 명시:
   - "이번 작업은 demodev-monolith 스타일로 보고해줘"
3. PDCA 리포트/리뷰 결과 생성 시 동일 스타일 유지 요청

## 권장 매핑

- 단일 모듈: `demodev-monolith.md`
- MSA/멀티 서비스: `demodev-msa.md`
- 프로세스 중심 문서: `demodev-pdca-guide.md`

## 팁

- 팀 위키에 스타일 1개를 기본값으로 고정하면 리뷰 속도가 빨라집니다.
- 스타일 변경 시 `CHANGELOG.md`에 기준 변경 내역을 기록하세요.
