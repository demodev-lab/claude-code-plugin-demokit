---
name: erd
description: 이 스킬은 사용자가 "ERD", "다이어그램", "엔티티 관계도", "ER 다이어그램"을 요청할 때 사용합니다. Mermaid 형식으로 ERD를 생성합니다.
---

# /erd - Entity Relationship Diagram

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/erd — Mermaid ERD 생성

사용법:
  /erd [domain]

파라미터:
  domain  대상 도메인 (선택, 기본 전체)

예시:
  /erd              — 전체 Entity ERD
  /erd User         — User 관련 ERD
  /erd all          — 전체 ERD (관계 포함)

관련 명령:
  /entity   — Entity 생성
  /crud     — CRUD 일괄 생성
```

## 실행 절차

1. **Entity 파일 탐색**:
   - `domain` 인자 있으면 해당 도메인의 Entity만
   - 미지정/`all`이면 전체 `**/entity/*.java` 탐색
   - Glob과 Read로 모든 Entity 파일 수집

2. **Entity 분석** (각 Entity 파일에서 추출):
   - 클래스명, 테이블명 (`@Table`)
   - 필드명, 타입, 어노테이션
   - 관계 매핑: `@OneToMany`, `@ManyToOne`, `@OneToOne`, `@ManyToMany`
   - 관계 대상 Entity 클래스
   - `@JoinColumn`, `mappedBy` 속성

3. **Mermaid ERD 생성**:
   ```
   erDiagram
       User {
           Long id PK
           String name
           String email UK
           LocalDateTime createdAt
       }
       Order {
           Long id PK
           Long userId FK
           OrderStatus status
           BigDecimal totalAmount
       }
       User ||--o{ Order : "has"
   ```

4. **관계 표기 규칙**:
   | JPA 어노테이션 | Mermaid 관계 | 설명 |
   |----------------|-------------|------|
   | `@OneToOne` | `\|\|--\|\|` | 1:1 |
   | `@OneToMany` | `\|\|--o{` | 1:N |
   | `@ManyToOne` | `}o--\|\|` | N:1 |
   | `@ManyToMany` | `}o--o{` | N:M |

5. **출력 형식**:
   - Mermaid 코드 블록으로 출력
   - Entity별 PK, FK, UK 표기
   - Enum 타입은 타입명으로 표기
   - BaseEntity 상속 필드 (createdAt, updatedAt) 포함

6. **읽기 전용**: 파일 수정 금지 (Read, Glob, Grep만 사용)
