---
name: entity
description: 이 스킬은 사용자가 "Entity 생성", "엔티티", "entity"를 요청할 때 사용합니다. JPA Entity를 생성합니다.
---

# /entity - JPA Entity 생성

## 실행 절차

1. **Entity 파일 생성**: `domain/{name}/entity/{Name}.java`
2. **필수 어노테이션**: `@Entity`, `@Getter`, `@NoArgsConstructor(access = PROTECTED)`
3. **BaseEntity 상속**: `createdAt`, `updatedAt` 자동 (없으면 생성)
4. **@Builder**: private 생성자에 적용
5. **정적 팩토리**: `create()` 메서드
6. **비즈니스 메서드**: `update()` 메서드
7. **Exception 생성**: `{Name}NotFoundException` (없으면 생성)

## 관련 Agent
- domain-expert

## 관련 템플릿
- `templates/code/entity.template.java`
