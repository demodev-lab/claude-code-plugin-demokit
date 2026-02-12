---
name: service
description: Service 레이어 생성
user_invocable: true
arguments:
  - name: name
    description: "도메인명 (PascalCase, 예: User)"
    required: true
---

# /service - Service 레이어 생성

## 실행 절차

1. **Service 파일 생성**: `domain/{name}/service/{Name}Service.java`
2. **@Service + @RequiredArgsConstructor**
3. **메서드 레벨 @Transactional**: readOnly 분리
4. **CRUD 메서드**: create, findById, findAll(Pageable), update, delete
5. **DRY 패턴 적용**:
   - `repository.getById()` 사용
   - `Entity.create()`, `entity.update()` 사용
   - `Response.from(entity)` 사용

## 관련 Agent
- service-expert

## 관련 템플릿
- `templates/code/service.template.java`
