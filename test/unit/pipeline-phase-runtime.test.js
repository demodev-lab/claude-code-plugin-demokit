const runtime = require('../../scripts/pipeline-phase-runtime');

describe('pipeline-phase-runtime helpers', () => {
  it('returns default phase script config when missing', () => {
    const coreConfig = {
      getConfigValue: jest.fn().mockReturnValue({}),
    };

    const cfg = runtime.getPhaseScriptConfig(coreConfig);
    expect(cfg.enabled).toBe(true);
    expect(cfg.preEnabled).toBe(false);
    expect(cfg.postEnabled).toBe(false);
    expect(cfg.transitionEnabled).toBe(true);
  });

  it('respects explicit phase script toggles', () => {
    const coreConfig = {
      getConfigValue: jest.fn().mockReturnValue({
        enabled: true,
        preEnabled: true,
        postEnabled: true,
        transitionEnabled: false,
      }),
    };

    const cfg = runtime.getPhaseScriptConfig(coreConfig);
    expect(runtime.isStageEnabled('pre', cfg)).toBe(true);
    expect(runtime.isStageEnabled('post', cfg)).toBe(true);
    expect(runtime.isStageEnabled('transition', cfg)).toBe(false);
  });

  it('returns phase metadata and next phase metadata', () => {
    expect(runtime.getPhaseMeta(1)).toEqual({ name: 'Schema', slug: 'schema' });

    const next = runtime.getNextPhaseMeta(
      {
        phases: [
          { id: 1, name: 'Schema', agent: 'dba-expert' },
          { id: 2, name: 'Convention', agent: 'spring-architect' },
        ],
      },
      1,
    );

    expect(next).toEqual({ id: 2, name: 'Convention', agent: 'spring-architect' });
  });
});
