---
name: review
description: 이 스킬은 사용자가 "코드 리뷰", "review", "리뷰"를 요청할 때 사용합니다. 읽기 전용 모드로 코드 리뷰를 수행합니다.
---

# /review - 코드 리뷰

## 실행 절차

1. **리뷰 대상 결정**:
   - 파일 경로 지정 시 해당 파일만
   - 도메인명 지정 시 해당 도메인 전체
   - `all` 또는 미지정 시 전체 프로젝트
2. **읽기 전용**: 파일 수정 금지 (Read, Glob, Grep만 사용)
3. **병렬 리뷰** — 다음 Task들을 한 메시지에서 동시에 호출 (모두 읽기 전용):
   - Task 1: 아키텍처/구조 + Entity/Repository 패턴 리뷰
   - Task 2: Service/Controller/DTO 패턴 + Best Practices 리뷰
   - Task 3: 보안 + DRY 위반 + 클린 코드/SRP 리뷰
4. **결과 통합**: 3개 Task 결과를 심각도별 분류하여 단일 리뷰 보고서로 출력 (높음/중간/제안)

## 관련 Agent
- code-reviewer
