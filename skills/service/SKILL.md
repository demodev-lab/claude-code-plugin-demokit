---
name: service
description: 이 스킬은 사용자가 "Service 생성", "서비스", "service"를 요청할 때 사용합니다. Service 레이어를 생성합니다.
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
