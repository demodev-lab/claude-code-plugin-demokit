# CUSTOMIZATION GUIDE

demokit을 팀/프로젝트 상황에 맞게 커스터마이징하는 방법.

## 1) 우선순위 규칙

설정 우선순위는 아래와 같습니다.

1. project (`./demodev.config.json`)
2. session
3. user
4. plugin (`demokit/demodev.config.json`)

즉, **프로젝트 루트의 `demodev.config.json`이 최우선**입니다.

---

## 2) 최소 권장 커스터마이징

### A. 권한 정책

`demodev.config.json > permissions`에서 팀 정책에 맞게 조정합니다.

예시:
- `git push --force` → `deny`
- `.env` 수정 → `ask`
- `build.gradle` 수정 → `ask`

### B. 모델/에이전트 매핑

`demodev.config.json > agents.modelAssignment`에서 비용/품질 균형을 맞춥니다.

권장:
- 아키텍처/도메인 설계: 고성능 모델 유지
- 반복 템플릿/리포트: 경량 모델

### C. PDCA 임계치

`demodev.config.json > pdca.matchRateThreshold` 조정.

권장 시작값:
- 일반 백오피스: 85~90
- 규제/금융/의료: 90~95

### D. PDCA Do 속도 튜닝 (오케스트레이션)

`demodev.config.json > team.performance`를 사용해 phase별 오케스트레이션 비용을 조절할 수 있습니다.

예시:

```json
{
  "team": {
    "performance": {
      "phaseMemberCap": {
        "do": { "SingleModule": 1, "default": 2 }
      },
      "phasePatternOverride": {
        "do": { "SingleModule": "leader" }
      },
      "phaseMaxParallel": {
        "do": { "SingleModule": 1 }
      }
    }
  }
}
```

권장:
- 데모/빠른 검증: `do`를 1인 + leader
- 품질 우선 개발: `do`를 2인 이상 + swarm

---

## 3) 훅 운영 가이드

파일: `hooks/hooks.json`

권장 원칙:
- 모든 command hook에 `timeout` 지정
- `SessionStart`는 `once: true` 유지
- 공통 검증은 `unified-*` 스크립트에 집중

장시간 훅이 필요하면, 동기 훅 대신 비동기 후처리 스크립트로 분리하세요.

### Snapshot 캐시 (성능)

`context-store/snapshot`은 cross-process 캐시를 사용합니다.

- 캐시 파일: `.demodev/cache/snapshot-static-v1.json`
- 기본 TTL: 30초
- TTL 조정: `DEMOKIT_SNAPSHOT_CACHE_TTL_MS` 환경변수
  - 예: `DEMOKIT_SNAPSHOT_CACHE_TTL_MS=10000` (10초)
  - 예: `DEMOKIT_SNAPSHOT_CACHE_TTL_MS=0` (디스크 캐시 비활성화)

---

## 4) 업데이트 충돌 방지 전략

### 방법 1: 프로젝트 override
- 공통 플러그인은 최대한 건드리지 말고
- 프로젝트 루트 설정으로 덮어쓰기

### 방법 2: 로컬 패치 브랜치
- 플러그인 저장소를 fork
- `custom/*` 브랜치에서 팀 정책 유지
- upstream 변경은 정기적으로 rebase

---

## 5) 추천 검증 루틴

```bash
npm run validate:plugin -- --verbose
npm test -- --runInBand
```

배포 전 체크:
- validator 경고 0
- 테스트 통과
- hooks timeout 누락 없음

---

## 6) 팀 온보딩 체크리스트

- [ ] `/help`로 커맨드 카탈로그 확인
- [ ] `/init`로 프로젝트 분석 완료
- [ ] `demodev.config.json` 팀 정책 반영
- [ ] PDCA 예제 1건 실행 (`/pdca plan -> design -> do`)
