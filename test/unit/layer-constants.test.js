const { LAYER_DEPENDENCIES, LAYER_FILE_PATTERNS } = require('../../lib/team/layer-constants');

describe('layer-constants', () => {
  it('모든 레이어 키 포함', () => {
    const expected = ['entity', 'dto', 'config', 'exception', 'repository', 'service', 'controller', 'test'];
    for (const key of expected) {
      expect(LAYER_DEPENDENCIES).toHaveProperty(key);
      expect(LAYER_FILE_PATTERNS).toHaveProperty(key);
    }
  });

  it('LAYER_DEPENDENCIES와 LAYER_FILE_PATTERNS 키 일치', () => {
    const depKeys = Object.keys(LAYER_DEPENDENCIES).sort();
    const patKeys = Object.keys(LAYER_FILE_PATTERNS).sort();
    expect(depKeys).toEqual(patKeys);
  });

  it('service → dto 의존성 포함', () => {
    expect(LAYER_DEPENDENCIES.service).toContain('dto');
  });

  it('service → entity, repository 의존성 포함', () => {
    expect(LAYER_DEPENDENCIES.service).toContain('entity');
    expect(LAYER_DEPENDENCIES.service).toContain('repository');
  });

  it('test → exception 의존성 미포함 (coordinator 정본 기준)', () => {
    expect(LAYER_DEPENDENCIES.test).not.toContain('exception');
  });
});
