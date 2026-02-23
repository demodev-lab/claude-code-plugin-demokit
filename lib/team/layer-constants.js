/**
 * Layer Constants (정본)
 * LAYER_DEPENDENCIES + LAYER_FILE_PATTERNS 단일 소스
 */

// Spring Boot 레이어 의존성 그래프
const LAYER_DEPENDENCIES = {
  entity: [],
  dto: [],
  config: [],
  exception: [],
  repository: ['entity'],
  service: ['entity', 'repository', 'dto'],
  controller: ['service', 'dto', 'exception'],
  test: ['entity', 'repository', 'service', 'controller', 'dto'],
};

// 레이어별 파일 패턴
const LAYER_FILE_PATTERNS = {
  entity: ['src/**/entity/**', 'src/**/domain/**'],
  dto: ['src/**/dto/**', 'src/**/request/**', 'src/**/response/**'],
  config: ['src/**/config/**'],
  exception: ['src/**/exception/**', 'src/**/error/**'],
  repository: ['src/**/repository/**', 'src/**/repo/**'],
  service: ['src/**/service/**'],
  controller: ['src/**/controller/**', 'src/**/api/**'],
  test: ['src/test/**', 'test/**'],
};

module.exports = { LAYER_DEPENDENCIES, LAYER_FILE_PATTERNS };
