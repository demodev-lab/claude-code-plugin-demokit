# Command Cookbook

처음 쓰는 사람이 바로 따라 할 수 있는 실전 시나리오 모음.

---

## A) 신규 기능 개발 (정석)

```text
/init
/pdca plan 회원관리
/pdca design 회원관리
/pdca do 회원관리
/pdca analyze 회원관리
/pdca iterate 회원관리   (필요 시)
/pdca report 회원관리
```

검증:

```text
/test all
/review
```

---

## B) 빠른 CRUD 생성

```text
/crud User
/test User
/review domain:user
```

## C) 초고속 전력 투입(모든 자원)

```text
/superwork 회원가입 API 구현
/superwork 결제 취소 예외 처리 보강
```

권장 흐름:

1. `/superwork`로 전체 범위를 분할
2. `/pdca` 기반 단계별 산출물 정리
3. `/superwork`가 붙여준 `/pdca` 정석 체인과 체크리스트로 Plan/Design/Do/Analyze/Report를 순차 실행
4. Analyze 결과가 낮으면 `/pdca iterate`로 Gap 보강, 아니면 `/pdca report`로 종료
5. 결과를 `/review`와 `/qa`로 검증

---

## D) 성능 이슈 핫픽스

```text
/qa build
/qa test
/qa log
/optimize user
/pdca analyze user-optimization
```

---

## E) 파이프라인 기반 운영

```text
/pipeline user-management
/pipeline status
/pipeline next
```

### 시각 흐름

```mermaid
flowchart LR
  S[/pipeline feature/] --> ST[/pipeline status/]
  ST --> NX[/pipeline next/]
  NX --> ST
```

---

## F) bkit에서 넘어온 팀용 호환 명령

```text
/bkit
/code-review
/zero-script-qa
/development-pipeline
/phase-1-schema ... /phase-9-deployment
```

호환 맵:
- [Compatibility Command Map](./compatibility-command-map.md)
