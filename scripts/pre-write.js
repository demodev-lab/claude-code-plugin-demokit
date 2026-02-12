/**
 * PreToolUse Hook (Write/Edit)
 * Java 파일 작성/편집 전 Spring Boot 컨벤션 검증
 *
 * 검증 항목:
 * - 클래스명 네이밍 규약 (Controller, Service, Repository 접미사)
 * - 도메인 기반 패키지 위치 검증 (domain/{name}/entity/ 등)
 * - 공통 모듈은 common/ 패키지에 위치하는지 검증
 * - 필수 어노테이션 힌트
 * - DTO가 record인지 확인
 * - 금지 패턴 감지 (@Data, @Setter on Entity, @Where, RestTemplate)
 */

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const hookData = JSON.parse(input);
  const filePath = hookData.tool_input?.file_path || hookData.tool_input?.filePath || '';

  if (!filePath.endsWith('.java')) {
    console.log(JSON.stringify({}));
    return;
  }

  const { config, file: fileUtil } = require('../lib/core');
  const cfg = config.loadConfig();
  const requiredAnnotations = cfg.spring.requiredAnnotations;

  const className = fileUtil.extractClassName(filePath);
  const layerType = fileUtil.detectLayerType(filePath);

  const hints = [];

  if (layerType) {
    // 네이밍 컨벤션 힌트
    const expectedSuffix = getExpectedSuffix(layerType);
    if (expectedSuffix && !className.endsWith(expectedSuffix) && layerType !== 'entity') {
      hints.push(`[컨벤션] ${layerType} 클래스는 '${expectedSuffix}' 접미사를 권장합니다 (현재: ${className})`);
    }

    // 필수 어노테이션 힌트
    const annotations = requiredAnnotations[layerType];
    if (annotations && annotations.length > 0) {
      hints.push(`[어노테이션] ${layerType} 필수: ${annotations.join(', ')}`);
    }

    // 도메인 기반 패키지 위치 힌트
    const packageHint = getPackageHint(filePath, layerType);
    if (packageHint) {
      hints.push(packageHint);
    }

    // DTO는 record 사용 필수 힌트
    if (layerType === 'dto') {
      hints.push('[모던 패턴] DTO는 반드시 Java record로 작성하세요 (class 사용 금지)');
    }
  }

  // 파일 내용 기반 금지 패턴 감지
  const content = hookData.tool_input?.content || hookData.tool_input?.new_string || '';
  if (content && filePath.endsWith('.java')) {
    // === 금지 패턴 ===
    if (content.includes('@Data') && layerType === 'entity') {
      hints.push('[금지] Entity에 @Data 사용 금지 → @Getter + @NoArgsConstructor 사용');
    }
    if (content.includes('@Setter') && layerType === 'entity') {
      hints.push('[금지] Entity에 @Setter 사용 금지 → 비즈니스 메서드로 상태 변경');
    }
    if (content.includes('@Where')) {
      hints.push('[금지] @Where 사용 금지 → @SQLRestriction 사용 (Hibernate 6.3+)');
    }
    if (content.includes('new RestTemplate') || content.match(/RestTemplate[^s]/)) {
      hints.push('[금지] RestTemplate 신규 사용 금지 → WebClient 사용');
    }
    if (content.includes('RestClient')) {
      hints.push('[권장] RestClient 대신 WebClient 사용을 권장합니다 (비동기/동기 모두 지원)');
    }
    if (content.includes('@MockBean') && !content.includes('@MockitoBean')) {
      hints.push('[금지] @MockBean deprecated → @MockitoBean 사용 (Spring Boot 3.4+)');
    }

    // === DRY 위반 감지 ===
    // Service에서 findById().orElseThrow() 반복 패턴
    if (layerType === 'service' && content.match(/findById\s*\([^)]*\)\s*\.\s*orElseThrow/)) {
      hints.push('[DRY] findById().orElseThrow() 반복 금지 → Repository에 default getById() 메서드를 정의하세요');
    }

    // Entity에서 BaseEntity 없이 createdAt/updatedAt 직접 선언
    if (layerType === 'entity') {
      if ((content.includes('createdAt') || content.includes('updatedAt')) && !content.includes('extends BaseEntity')) {
        hints.push('[DRY] createdAt/updatedAt 직접 선언 금지 → BaseEntity를 상속하세요');
      }
    }

    // Controller에서 try-catch 사용
    if (layerType === 'controller' && content.match(/try\s*\{[\s\S]*?catch\s*\(/)) {
      hints.push('[DRY] Controller에서 try-catch 금지 → GlobalExceptionHandler에서 일괄 처리하세요');
    }

    // Service에서 Entity→DTO 변환 인라인 작성 (new XxxResponse(...) 패턴)
    if (layerType === 'service' && content.match(/new\s+\w+Response\s*\(/)) {
      hints.push('[DRY] Entity→DTO 변환을 Service에서 인라인 작성 금지 → Response.from(entity) 정적 팩토리 사용');
    }

    // DTO를 class로 작성
    if (layerType === 'dto' && content.match(/\bclass\s+\w+(Request|Response)\b/) && !content.includes('record')) {
      hints.push('[금지] DTO는 반드시 record로 작성 → class 사용 금지 (Java 21 Best Practice)');
    }

    // === QueryDSL 컨벤션 ===
    // fetchResults() deprecated 감지
    if (content.includes('fetchResults()')) {
      hints.push('[QueryDSL] fetchResults() deprecated → fetch() + 별도 count 쿼리로 분리하세요');
    }

    // @QueryProjection DTO에 사용 감지
    if (layerType === 'dto' && content.includes('@QueryProjection')) {
      hints.push('[QueryDSL] @QueryProjection 대신 Projections.constructor() 사용 권장 (DTO에 QueryDSL 의존성 전파 방지)');
    }

    // Custom Repository 구현체 네이밍 검사
    if (layerType === 'repository' && content.match(/class\s+\w+/) && !className.endsWith('RepositoryImpl') && content.includes('JPAQueryFactory')) {
      hints.push('[QueryDSL] Custom Repository 구현체는 반드시 {Name}RepositoryImpl 으로 네이밍하세요');
    }

    // BooleanBuilder 남용 감지 (여러 개의 .and()/.or() 체인)
    if (content.includes('BooleanBuilder') && (content.match(/builder\.(and|or)/g) || []).length > 3) {
      hints.push('[QueryDSL] BooleanBuilder 남용 지양 → BooleanExpression 반환 private 메서드로 분리 권장 (DRY, 가독성)');
    }

    // com.querydsl (old fork) 사용 감지 → OpenFeign fork로 전환
    if (content.includes('com.querydsl')) {
      hints.push('[QueryDSL] com.querydsl 사용 금지 → OpenFeign fork 사용 (io.github.openfeign.querydsl:querydsl-jpa:6.12)');
    }
  }

  if (hints.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demodev-be 컨벤션 힌트]\n${hints.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

function getExpectedSuffix(layerType) {
  const mapping = {
    repository: 'Repository',
    service: 'Service',
    controller: 'Controller',
    config: 'Config',
    exception: 'Exception',
  };
  return mapping[layerType] || null;
}

/**
 * 도메인 기반 패키지 위치 검증
 * - 비즈니스 코드: domain/{domainName}/{layer}/ 안에 위치해야 함
 * - 공통 코드: common/{layer}/ 안에 위치해야 함
 */
function getPackageHint(filePath, layerType) {
  const normalized = filePath.replace(/\\/g, '/');

  // config, exception, security → common/ 패키지에 위치해야 함
  const commonLayers = ['config', 'exception', 'security'];
  if (commonLayers.includes(layerType)) {
    if (!normalized.includes('/common/')) {
      return `[패키지] ${layerType} 파일은 'common/${layerType}/' 패키지에 위치하는 것을 권장합니다`;
    }
    return null;
  }

  // entity, repository, service, controller, dto → domain/{name}/{layer}/ 패키지에 위치
  const domainLayers = ['entity', 'repository', 'service', 'controller', 'dto'];
  if (domainLayers.includes(layerType)) {
    if (!normalized.includes('/domain/')) {
      return `[패키지] ${layerType} 파일은 'domain/{도메인명}/${layerType}/' 패키지에 위치하는 것을 권장합니다`;
    }
    if (!normalized.includes(`/${layerType}/`)) {
      return `[패키지] ${layerType} 파일은 'domain/{도메인명}/${layerType}/' 하위에 위치하는 것을 권장합니다`;
    }
    return null;
  }

  return null;
}

main().catch(err => {
  console.error(`[demodev-be] pre-write 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
