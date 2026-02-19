# Trigger Matrix

주요 이벤트와 권장 대응 명령 매트릭스.

| 상황 | 신호 | 우선 명령 | 후속 조치 |
|---|---|---|---|
| 신규 기능 시작 | 요구사항 전달 | `/pdca plan {feature}` | design/do/analyze 순서로 진행 |
| 단순 CRUD 요청 | 도메인 생성 요청 | `/crud {Domain}` | `/test {Domain} all` |
| CI 실패 | 빌드/테스트 실패 알림 | `/qa build` | `/qa test` + `/review` |
| 설계-구현 불일치 | analyze 점수 저하 | `/pdca analyze {feature}` | `/pdca iterate {feature}` |
| 반복 작업 중단 필요 | 루프 과잉 실행 | `/cancel-loop` | recovery-playbook 수행 |
| 컨텍스트 과다 | 세션 장기화 | compaction hook | report 요약 후 계속 |

## 운영 원칙
- 트리거는 짧고 명확하게 유지
- 자동화는 항상 timeout 설정
- 위험 작업은 ask/deny 정책 우선
