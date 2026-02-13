/**
 * Spring Boot 컨벤션 검사
 * 파일 경로, 클래스명, 내용 기반으로 컨벤션 준수 여부 판별
 */

const NAMING_RULES = {
  entity: { suffix: null, annotations: ['@Entity', '@Getter', '@NoArgsConstructor'] },
  repository: { suffix: 'Repository', annotations: [] },
  service: { suffix: 'Service', annotations: ['@Service', '@RequiredArgsConstructor'] },
  controller: { suffix: 'Controller', annotations: ['@RestController', '@RequestMapping', '@RequiredArgsConstructor'] },
  config: { suffix: 'Config', annotations: ['@Configuration'] },
  exception: { suffix: 'Exception', annotations: [] },
};

/**
 * 클래스명 네이밍 검사
 */
function checkNaming(className, layerType) {
  const rule = NAMING_RULES[layerType];
  if (!rule || !rule.suffix) return { valid: true };

  if (!className.endsWith(rule.suffix)) {
    return {
      valid: false,
      message: `${layerType} 클래스는 '${rule.suffix}' 접미사를 권장합니다 (현재: ${className})`,
    };
  }
  return { valid: true };
}

/**
 * 패키지 위치 검사 (도메인 기반)
 */
function checkPackageLocation(filePath, layerType) {
  const normalized = filePath.replace(/\\/g, '/');
  const violations = [];

  const commonLayers = ['config', 'exception', 'security'];
  const domainLayers = ['entity', 'repository', 'service', 'controller', 'dto'];

  if (commonLayers.includes(layerType)) {
    if (!normalized.includes('/common/')) {
      violations.push(`${layerType} 파일은 common/${layerType}/ 패키지에 위치해야 합니다`);
    }
  }

  if (domainLayers.includes(layerType)) {
    if (!normalized.includes('/domain/')) {
      violations.push(`${layerType} 파일은 domain/{도메인명}/${layerType}/ 패키지에 위치해야 합니다`);
    } else if (!normalized.includes(`/${layerType}/`)) {
      violations.push(`${layerType} 파일은 domain/{도메인명}/${layerType}/ 하위에 위치해야 합니다`);
    }
  }

  return violations;
}

/**
 * 금지 패턴 검사
 */
function checkForbiddenPatterns(content, layerType) {
  const violations = [];

  // 전역 금지 패턴
  if (content.includes('@Where')) {
    violations.push('@Where 사용 금지 → @SQLRestriction (Hibernate 6.3+)');
  }
  if (content.includes('new RestTemplate') || content.match(/RestTemplate[^s]/)) {
    violations.push('RestTemplate 사용 금지 → WebClient');
  }
  if (content.includes('RestClient')) {
    violations.push('RestClient 대신 WebClient 권장');
  }
  if (content.includes('@MockBean') && !content.includes('@MockitoBean')) {
    violations.push('@MockBean deprecated → @MockitoBean (Spring Boot 3.4+)');
  }
  if (content.includes('com.querydsl')) {
    violations.push('com.querydsl 사용 금지 → io.github.openfeign.querydsl');
  }

  // Entity 전용
  if (layerType === 'entity') {
    if (content.includes('@Data')) violations.push('Entity에 @Data 사용 금지 → @Getter + @NoArgsConstructor');
    if (content.includes('@Setter')) violations.push('Entity에 @Setter 사용 금지 → 비즈니스 메서드로 상태 변경');
    if ((content.includes('createdAt') || content.includes('updatedAt')) && !content.includes('extends BaseEntity')) {
      violations.push('createdAt/updatedAt 직접 선언 금지 → BaseEntity 상속');
    }
  }

  // DTO 전용
  if (layerType === 'dto') {
    const dtoClassMatch = content.match(/\bclass\s+(\w+(?:Request|Response))\b/);
    if (dtoClassMatch && !content.match(new RegExp(`\\brecord\\s+${dtoClassMatch[1]}\\b`))) {
      violations.push('DTO는 반드시 record로 작성 (class 사용 금지)');
    }
  }

  // QueryDSL deprecated
  if (content.includes('fetchResults()')) {
    violations.push('fetchResults() deprecated → fetch() + 별도 count 쿼리');
  }

  return violations;
}

/**
 * DRY 위반 검사
 */
function checkDryViolations(content, layerType) {
  const violations = [];

  if (layerType === 'service') {
    if (content.match(/findById\s*\([^)]*\)\s*\.\s*orElseThrow/)) {
      violations.push('findById().orElseThrow() 반복 → Repository.getById() default 메서드 사용');
    }
    if (content.match(/new\s+\w+Response\s*\(/)) {
      violations.push('Entity→DTO 인라인 변환 → Response.from(entity) 사용');
    }
  }

  if (layerType === 'controller') {
    if (content.match(/try\s*\{[\s\S]*?catch\s*\(/)) {
      violations.push('Controller try-catch → GlobalExceptionHandler 사용');
    }
  }

  return violations;
}

/**
 * QueryDSL 컨벤션 검사
 */
function checkQueryDslPatterns(content, className, layerType) {
  const violations = [];

  // @QueryProjection DTO에 사용
  if (layerType === 'dto' && content.includes('@QueryProjection')) {
    violations.push('@QueryProjection 대신 Projections.constructor() 사용 권장 (DTO에 QueryDSL 의존성 전파 방지)');
  }

  // BooleanBuilder 남용
  if (content.includes('BooleanBuilder') && (content.match(/builder\.(and|or)/g) || []).length > 3) {
    violations.push('BooleanBuilder 남용 → BooleanExpression 반환 private 메서드로 분리');
  }

  // Custom Repository 구현체 네이밍
  if (layerType === 'repository' && content.match(/class\s+\w+/) && className && !className.endsWith('RepositoryImpl') && content.includes('JPAQueryFactory')) {
    violations.push('Custom Repository 구현체는 반드시 {Name}RepositoryImpl 으로 네이밍');
  }

  return violations;
}

/**
 * 고급 패턴 검사 (N+1, Transaction, Validation, SQL Injection)
 */
function checkAdvancedPatterns(content, layerType) {
  const violations = [];

  // Entity: @OneToMany/@ManyToMany without fetch = FetchType.LAZY
  if (layerType === 'entity') {
    if (content.match(/@(OneToMany|ManyToMany)/) && !content.includes('FetchType.LAZY')) {
      violations.push('@OneToMany/@ManyToMany에 fetch = FetchType.LAZY 명시 필수 (N+1 방지)');
    }
  }

  // Controller: @Transactional 사용 금지
  if (layerType === 'controller') {
    if (content.includes('@Transactional')) {
      violations.push('Controller에 @Transactional 사용 금지 → Service 레이어에서 처리');
    }
  }

  // Controller: @RequestBody without @Valid
  if (layerType === 'controller') {
    if (content.includes('@RequestBody') && !content.includes('@Valid')) {
      violations.push('@RequestBody에 @Valid 누락 → 입력 검증 필수');
    }
  }

  // SQL Injection: Native Query에 문자열 결합
  if (content.match(/nativeQuery\s*=\s*true/) && content.match(/["']\s*\+\s*\w/)) {
    violations.push('Native Query에 문자열 결합 감지 → 파라미터 바인딩 사용 필수 (SQL Injection 방지)');
  }
  if (content.match(/createNativeQuery\s*\(\s*["'].*\+/)) {
    violations.push('createNativeQuery에 문자열 결합 감지 → 파라미터 바인딩 사용 필수');
  }

  return violations;
}

module.exports = {
  checkNaming,
  checkPackageLocation,
  checkForbiddenPatterns,
  checkDryViolations,
  checkQueryDslPatterns,
  checkAdvancedPatterns,
  NAMING_RULES,
};
