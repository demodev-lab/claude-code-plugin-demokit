---
name: review
description: 코드 리뷰 (읽기 전용)
user_invocable: true
arguments:
  - name: target
    description: "리뷰 대상 (파일 경로, 도메인명, 또는 'all')"
    required: false
---

# /review - 코드 리뷰

## 실행 절차

1. **리뷰 대상 결정**:
   - 파일 경로 지정 시 해당 파일만
   - 도메인명 지정 시 해당 도메인 전체
   - `all` 또는 미지정 시 전체 프로젝트
2. **읽기 전용**: 파일 수정 금지 (Read, Glob, Grep만 사용)
3. **체크리스트 기반 리뷰** (code-reviewer agent 참조):
   - 아키텍처/구조
   - Entity/Repository/Service/Controller 패턴
   - 보안
   - Best Practices (2025/2026)
   - DRY 위반
4. **결과 출력**: 심각도별 분류 (높음/중간/제안)

## 관련 Agent
- code-reviewer
