# Migration from bkit

bkit 운영 패턴을 demokit으로 이식할 때 체크리스트.

## 대응 맵

- bkit `Dynamic` -> demokit `SingleModule/MultiModule/Monolith`
- bkit `Enterprise` -> demokit `MSA`

## 팀 전략

- bkit `delegateMode`, `levelOverrides` -> demokit `team.delegateMode`, `team.levelOverrides`
- bkit phase scripts -> demokit `phase-1~9-*` + dispatcher

## 주의점

- bkit은 범용/학습/엔터프라이즈 문맥이 혼합됨
- demokit은 Spring Boot 백엔드 특화이므로 도메인 용어를 맞춰야 함

## 추천 이행 순서

1. level/profile 매핑 정의
2. team/performance 값 이식
3. hooks timeout 정리
4. validate/test 통과 확인
