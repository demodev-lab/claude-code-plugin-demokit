---
name: review
description: 이 스킬은 사용자가 "코드 리뷰", "review", "리뷰"를 요청할 때 사용합니다. 읽기 전용 모드로 코드 리뷰를 수행합니다.
---

# /review - 코드 리뷰

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/review — 코드 리뷰 수행

사용법:
  /review [target]            — 정적 코드 리뷰
  /review [target] --deep     — 심층 보안 분석 포함
  /review full [target]       — 통합 품질 파이프라인 (리뷰+최적화+QA)
  /review full [target] --fix — 통합 품질 + 자동 수정
  /review full [target] --deep --fix — 전체 옵션

파라미터:
  target  리뷰 대상 (선택, 기본 전체)
          파일경로, 도메인명, all
  --deep  보안 심층 분석 포함
  full    통합 품질 파이프라인 모드

예시:
  /review User
  /review all
  /review src/main/java/com/example/domain/user/
  /review User --deep
  /review full User
  /review full User --fix --deep

관련 명령:
  /optimize     — 성능 최적화 분석
  /qa           — 동적 품질 검증
  /pdca analyze — 설계 vs 구현 Gap 분석
```

## 보안 감지 힌트
리뷰 대상에 security/auth/jwt/permission/role/admin/token/oauth 키워드가 포함된 경우:
```
[보안 관련 파일 감지됨] /review --deep으로 심층 보안 분석을 권장합니다
```
(자동 실행 아님, 안내만 출력)

## 심각도 기준
🔴 Critical — 즉시 수정 (빌드 실패, 보안 취약점, 데이터 손실 가능)
🟡 Warning  — 수정 권장 (성능 저하, DRY 위반, Best Practice 미준수)
🟢 Info     — 선택적 개선 (코드 스타일, 가독성, 코드 개선 제안)

## 실행 절차

### 기본 모드 (/review [target])
1. **리뷰 대상 결정**:
   - 파일 경로 지정 시 해당 파일만
   - 도메인명 지정 시 해당 도메인 전체
   - `all` 또는 미지정 시 전체 프로젝트
2. **읽기 전용**: 파일 수정 금지 (Read, Glob, Grep만 사용)
3. **병렬 리뷰** — 다음 Task들을 한 메시지에서 동시에 호출 (모두 읽기 전용):
   - Task 1 (code-reviewer): 아키텍처/구조 + Entity/Repository 패턴 리뷰
   - Task 2 (code-reviewer): Service/Controller/DTO 패턴 + Best Practices 리뷰
   - Task 3 (code-reviewer): DRY 위반 + 클린 코드/SRP 리뷰
4. **결과 통합**: 3개 Task 결과를 심각도별 분류하여 단일 리뷰 보고서로 출력 (🔴 Critical / 🟡 Warning / 🟢 Info)

체크포인트: [Task 1/3 완료] → [Task 2/3 완료] → [Task 3/3 완료] → 통합 보고서

### --deep 모드 (/review --deep [target])
기본 모드 Task 1~3 + 추가:
- Task 4 (security-expert, 병렬): 인증/인가 취약점, SQL Injection, CORS, JWT 설정 심층 분석

체크포인트: [Task 1/4 완료] → [Task 2/4 완료] → [Task 3/4 완료] → [Task 4/4 완료: 보안 분석] → 통합 보고서

### /review full — 통합 품질 파이프라인
Phase 1 (병렬): /review Task 1~3(+4 if --deep) + /optimize Task A(domain-expert) + Task B(dba-expert)
Phase 2 (조건): --fix 시 수정 예정 목록 확인 → optimize --fix 실행
Phase 3 (순차): /qa (build+log 병렬 → test 순차 → summary)
Phase 4: 통합 품질 대시보드 (🔴 N건 / 🟡 N건 / 🟢 N건)

## 다음 단계 안내
리뷰 완료 후 N+1/인덱스 이슈 감지 시:
```
→ /optimize {domain} 실행을 권장합니다
→ /review full --fix로 통합 처리 가능
```

## 관련 Agent
- code-reviewer (기본)
- security-expert (--deep 모드)
