---
name: entity
description: JPA Entity 생성
user_invocable: true
arguments:
  - name: name
    description: "Entity명 (PascalCase, 예: User, Order)"
    required: true
  - name: fields
    description: "필드 정의 (예: 'name:String, email:String')"
    required: false
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
