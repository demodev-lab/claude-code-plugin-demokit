# Priority Rules

여러 트리거/훅/스킬이 동시에 맞물릴 때의 우선순위 규칙.

## 1) Hook 실행 우선순위

`hooks/hooks.json` 정의 순서를 기준으로 동작한다.

### PreToolUse

- `Write|Edit` → `scripts/pre-write.js`
- `Bash` → `scripts/unified-bash-pre.js`

### PostToolUse

- `Write|Edit` → `scripts/unified-write-post.js`
- `Bash` → `scripts/post-bash.js`
- `Skill` → `scripts/skill-post.js`

### Stop

- `scripts/unified-stop.js` (skill 단위 정리)
- `scripts/stop-handler.js` (team/context/pdca 정리)

> Stop에서는 위 순서가 중요하다. unified-stop이 먼저 실행되고, 최종 정리는 stop-handler가 담당.

---

## 2) 차단(Block) 우선 규칙

`PreToolUse`에서 `decision: block`이 반환되면 해당 툴 실행은 즉시 중단한다.

- Bash 위험 명령 차단 (예: `rm -rf`, destructive DB 명령)
- 권한 정책(`demodev.config.json > permissions`) 차단 규칙 우선

원칙:
1. 안전 > 편의
2. 차단 사유를 명확한 메시지로 남김
3. 차단 대신 안내가 가능한 경우는 allow + context 사용

---

## 3) 스킬 트리거 우선순위

동시에 여러 스킬 후보가 있을 때:

1. **명시적 명령** (`/pdca`, `/pipeline`) 우선
2. 더 **구체적인 스킬** 우선 (`/entity` > 일반 생성 요청)
3. 문맥 추론 트리거는 명시 명령보다 낮음

즉, 사용자가 슬래시 명령을 직접 준 경우 해당 명령을 최우선으로 처리한다.

---

## 4) Team/PDCA 충돌 시 원칙

- Team은 PDCA phase 기준으로 보조한다.
- phase 전이 판단의 기준은 PDCA 상태/산출물이며, Team 제안은 이를 덮어쓰지 않는다.
- 진행 중 feature가 여러 개인 경우 현재 active feature를 우선한다.

---

## 5) 운영 체크리스트

- 새 hook 추가 시:
  - timeout(ms) 명시
  - 기존 hook과 matcher 충돌 여부 점검
  - `validate:hooks`, `validate:plugin` 통과 확인

- 새 skill 추가 시:
  - trigger 중복 여부 확인
  - 명시 호출(`/skill`) 동작 예시 문서화

---

## 관련 문서

- [[trigger-matrix]]
- [[../testing/test-checklist]]
