const levelMapping = require('../../lib/team/level-mapping');

describe('team level mapping', () => {
  it('uses default topology -> profile mapping', () => {
    expect(levelMapping.resolveLevelProfile('SingleModule')).toBe('Dynamic');
    expect(levelMapping.resolveLevelProfile('MSA')).toBe('Enterprise');
    expect(levelMapping.resolveLevelProfile('Unknown')).toBeNull();
  });

  it('uses custom levelProfileMap when provided', () => {
    const cfg = {
      team: {
        levelProfileMap: {
          SingleModule: 'Enterprise',
        },
      },
    };

    expect(levelMapping.resolveLevelProfile('SingleModule', cfg)).toBe('Enterprise');
  });

  it('returns compatible level keys in fallback order', () => {
    const keys = levelMapping.getCompatibleLevelKeys('SingleModule');
    expect(keys).toEqual(['SingleModule', 'Dynamic', 'default']);
  });
});
