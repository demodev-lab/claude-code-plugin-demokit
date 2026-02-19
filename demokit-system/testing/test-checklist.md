# Test Checklist

릴리즈/공유 전 최소 테스트 체크리스트.

## 기본
- [ ] `npm run validate:plugin -- --verbose` 결과 errors 0
- [ ] `npm run validate:hooks` 결과 errors 0
- [ ] `npm run check:graph-index` 통과 (문서 드리프트 없음)
- [ ] warnings 0 (또는 사유 문서화)
- [ ] `npm test -- --runInBand` 통과

## 기능
- [ ] 핵심 스킬 3종 동작 점검 (`/init`, `/pdca`, `/review`)
- [ ] hooks timeout 누락 없음
- [ ] SessionStart `once: true` 유지

## 문서/메타
- [ ] `plugin.json` 버전과 marketplace/version 정합성
- [ ] 신규 스킬에 `skill.yaml` 존재
- [ ] CHANGELOG 업데이트

## 회귀
- [ ] validator 관련 테스트 유지
- [ ] hooks 관련 테스트 유지
- [ ] PDCA 상태 전이 테스트 유지
