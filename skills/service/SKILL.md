---
name: service
description: 이 스킬은 사용자가 "Service 생성", "서비스", "service"를 요청할 때 사용합니다. Service 레이어를 생성합니다.
---

# /service - Service 레이어 생성

## help
인자가 `help`이면 아래 도움말만 출력하고 실행을 중단한다:
```
/service — Service 레이어 생성

사용법:
  /service {Name}

파라미터:
  Name  PascalCase 도메인명 (필수)

예시:
  /service User
  /service Order

관련 명령:
  /controller — REST Controller 생성
  /crud       — CRUD 일괄 생성
```

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
