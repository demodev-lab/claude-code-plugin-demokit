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

  const commonLayers = ['config', 'security'];
  const domainLayers = ['entity', 'repository', 'service', 'controller', 'dto'];

  if (commonLayers.includes(layerType)) {
    if (!normalized.includes('/common/')) {
      violations.push(`${layerType} 파일은 common/${layerType}/ 패키지에 위치해야 합니다`);
    }
  }

  if (domainLayers.includes(layerType)) {
    if (!normalized.includes('/domain/')) {
      violations.push(`${layerType} 파일은 domain/{도메인명}/${layerType}/ 패키지에 위치해야 합니다`);
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
    if (content.includes('@Data')) violations.push('Entity에 @Data 사용 금지');
    if (content.includes('@Setter')) violations.push('Entity에 @Setter 사용 금지');
    if ((content.includes('createdAt') || content.includes('updatedAt')) && !content.includes('extends BaseEntity')) {
      violations.push('createdAt/updatedAt → BaseEntity 상속 필수');
    }
  }

  // DTO 전용
  if (layerType === 'dto') {
    if (content.match(/\bclass\s+\w+(Request|Response)\b/) && !content.includes('record')) {
      violations.push('DTO는 반드시 record로 작성');
    }
  }

  // QueryDSL
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

module.exports = { checkNaming, checkPackageLocation, checkForbiddenPatterns, checkDryViolations, NAMING_RULES };
