# Do: {{featureName}}

> 생성일: {{createdAt}}
> 상태: {{status}}
> Design 참조: `.pdca/{{featureName}}/design.md`

---

## 구현 순서

### 1. Entity
- [ ] `{{EntityName}}.java` 생성
- [ ] BaseEntity 상속
- [ ] `create()` 정적 팩토리
- [ ] `update()` 비즈니스 메서드

### 2. Repository
- [ ] `{{EntityName}}Repository.java` 생성
- [ ] `default getById()` 메서드
- [ ] QueryDSL Custom Repository (필요 시)

### 3. Service
- [ ] `{{EntityName}}Service.java` 생성
- [ ] 메서드 레벨 @Transactional
- [ ] CRUD 메서드 구현

### 4. DTO (record)
- [ ] `Create{{EntityName}}Request.java`
- [ ] `Update{{EntityName}}Request.java`
- [ ] `{{EntityName}}Response.java` + `from()` 정적 팩토리

### 5. Controller
- [ ] `{{EntityName}}Controller.java` 생성
- [ ] POST 201 + Location, DELETE 204

### 6. Exception
- [ ] `{{EntityName}}NotFoundException.java`
- [ ] GlobalExceptionHandler 에 핸들러 추가 (필요 시)

### 7. Test
- [ ] `{{EntityName}}ServiceTest.java` (단위)
- [ ] `{{EntityName}}RepositoryTest.java` (통합)
- [ ] `{{EntityName}}ControllerTest.java` (슬라이스)

---

## 품질 체크리스트

### DRY 패턴 적용
- [ ] BaseEntity 상속 (createdAt/updatedAt)
- [ ] Entity.create() 정적 팩토리
- [ ] Entity.update() 비즈니스 메서드
- [ ] Repository.getById() default 메서드
- [ ] Response.from() 정적 팩토리

### Clean Code / SRP
- [ ] 메서드 15줄 이내
- [ ] 중첩 depth 2단계 이내
- [ ] 매직 넘버/문자열 → 상수/Enum
- [ ] Controller: HTTP 처리만 / Service: 비즈니스 로직만

### Spring Boot 3.5 Best Practices
- [ ] DTO → record
- [ ] 에러 응답 → ProblemDetail (RFC 9457)
- [ ] HTTP 클라이언트 → WebClient
- [ ] @MockitoBean (not @MockBean)
- [ ] @SQLRestriction (not @Where)
- [ ] @Transactional(readOnly = true) 조회 메서드에 적용

---

## 구현 로그

{{#logs}}
### {{timestamp}}
- {{description}}
{{/logs}}

---

## 다음 단계
→ `/pdca analyze {{featureName}}` 으로 설계-구현 Match Rate 분석
