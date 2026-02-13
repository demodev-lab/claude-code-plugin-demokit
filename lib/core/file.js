/**
 * Java/Spring Boot 파일 관련 유틸리티
 * 도메인 기반 패키지 구조 (domain-based package structure)
 *
 * 구조:
 *   {basePackage}/common/config|exception|security|domain
 *   {basePackage}/domain/{domainName}/entity|repository|service|controller|dto
 */
const path = require('path');

/**
 * Java 클래스명에서 패키지 경로 추출
 * 예: "com.example.demo" → "com/example/demo"
 */
function packageToPath(packageName) {
  return packageName.replace(/\./g, '/');
}

/**
 * 파일 경로에서 패키지명 추출
 * 예: "src/main/java/com/example/demo/domain/user/entity/User.java" → "com.example.demo.domain.user.entity"
 */
function pathToPackage(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/src\/main\/java\/(.+)\//);
  if (!match) return null;
  return match[1].replace(/\//g, '.');
}

/**
 * 파일 경로에서 클래스명 추출
 */
function extractClassName(filePath) {
  return path.basename(filePath, '.java');
}

/**
 * 파일 경로에서 도메인명 추출
 * 예: ".../domain/user/entity/User.java" → "user"
 *     ".../domain/order/service/OrderService.java" → "order"
 */
function extractDomainName(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/\/domain\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Java 파일의 계층 타입 감지 (도메인 기반 구조)
 * @returns {string|null} 'entity'|'repository'|'service'|'controller'|'dto'|'config'|'exception'|'security'|null
 */
function detectLayerType(filePath) {
  const className = extractClassName(filePath);
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();

  // 도메인 기반: /domain/{name}/entity/, /domain/{name}/service/ 등
  if (normalized.includes('/entity/')) return 'entity';
  if (normalized.includes('/repository/')) return 'repository';
  if (normalized.includes('/service/')) return 'service';
  if (normalized.includes('/controller/')) return 'controller';
  if (normalized.includes('/dto/')) return 'dto';

  // common 패키지
  if (normalized.includes('/common/config/')) return 'config';
  if (normalized.includes('/common/exception/')) return 'exception';
  if (normalized.includes('/common/security/')) return 'security';
  if (normalized.includes('/common/domain/')) return 'entity'; // BaseEntity 등

  // 패키지 경로로 판단 불가 시 클래스명으로 판단
  if (className.endsWith('Repository')) return 'repository';
  if (className.endsWith('ServiceImpl') || className.endsWith('Service')) return 'service';
  if (className.endsWith('Controller')) return 'controller';
  if (className.endsWith('Request') || className.endsWith('Response') || className.endsWith('Dto')) return 'dto';
  if (className.endsWith('Config') || className.endsWith('Configuration')) return 'config';
  if (className.endsWith('Exception')) return 'exception';

  return null;
}

/**
 * 파일이 common 패키지에 속하는지 확인
 */
function isCommonPackage(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return normalized.includes('/common/');
}

/**
 * 도메인명 기반 관련 파일 경로 목록 생성 (도메인 기반 구조)
 */
function relatedFiles(domainName, basePackagePath) {
  const base = basePackagePath.replace(/\\/g, '/');
  const lower = domainName.toLowerCase();
  const domainBase = `${base}/domain/${lower}`;
  return {
    entity: `${domainBase}/entity/${domainName}.java`,
    repository: `${domainBase}/repository/${domainName}Repository.java`,
    service: `${domainBase}/service/${domainName}Service.java`,
    controller: `${domainBase}/controller/${domainName}Controller.java`,
    createRequest: `${domainBase}/dto/Create${domainName}Request.java`,
    updateRequest: `${domainBase}/dto/Update${domainName}Request.java`,
    response: `${domainBase}/dto/${domainName}Response.java`,
  };
}

/**
 * common 패키지 파일 경로 생성
 */
function commonFiles(basePackagePath) {
  const base = basePackagePath.replace(/\\/g, '/');
  const commonBase = `${base}/common`;
  return {
    baseEntity: `${commonBase}/domain/BaseEntity.java`,
    globalExceptionHandler: `${commonBase}/exception/GlobalExceptionHandler.java`,
    jpaAuditingConfig: `${commonBase}/config/JpaAuditingConfig.java`,
    webClientConfig: `${commonBase}/config/WebClientConfig.java`,
  };
}

module.exports = {
  packageToPath, pathToPackage, extractClassName, extractDomainName,
  detectLayerType, isCommonPackage, relatedFiles, commonFiles,
};
