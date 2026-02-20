jest.mock('../../lib/context-hierarchy', () => ({
  getContextHierarchy: jest.fn(),
  invalidateCache: jest.fn(),
}));

const fs = require('fs');
const contextHierarchy = require('../../lib/context-hierarchy');
const config = require('../../lib/core/config');

describe('core config', () => {
  const pluginConfig = {
    team: {
      delegateMode: false,
      levelOverrides: {
        SingleModule: {
          delegateMode: false,
          maxTeammates: 3,
        },
      },
      phaseTeams: {
        do: {
          lead: null,
          members: ['service-expert', 'domain-expert'],
          pattern: 'swarm',
        },
      },
    },
    developmentPipeline: {
      enabled: true,
      phaseScripts: {
        enabled: true,
        preEnabled: false,
        postEnabled: false,
        transitionEnabled: true,
      },
      phases: [
        { id: 1, name: 'Schema', agent: 'dba-expert' },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(pluginConfig));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    config.resetConfig();
  });

  it('deep merges team and developmentPipeline overrides', () => {
    contextHierarchy.getContextHierarchy.mockReturnValue({
      levels: [
        { level: 'plugin', data: pluginConfig },
        {
          level: 'user',
          data: {
            team: {
              delegateMode: true,
            },
            developmentPipeline: {
              phaseScripts: {
                preEnabled: true,
              },
            },
          },
        },
      ],
    });

    const finalConfig = config.loadConfig();

    expect(finalConfig.team.delegateMode).toBe(true);
    expect(finalConfig.team.phaseTeams.do).toEqual({
      lead: null,
      members: ['service-expert', 'domain-expert'],
      pattern: 'swarm',
    });
    expect(finalConfig.team.levelOverrides).toEqual({
      SingleModule: {
        delegateMode: false,
        maxTeammates: 3,
      },
    });

    expect(finalConfig.developmentPipeline.phaseScripts).toEqual({
      enabled: true,
      preEnabled: true,
      postEnabled: false,
      transitionEnabled: true,
    });
    expect(finalConfig.developmentPipeline.phases).toEqual([
      { id: 1, name: 'Schema', agent: 'dba-expert' },
    ]);
  });

  it('allows getConfigValue on merged hierarchy data', () => {
    contextHierarchy.getContextHierarchy.mockReturnValue({
      levels: [
        { level: 'plugin', data: pluginConfig },
        {
          level: 'project',
          data: {
            developmentPipeline: {
              phaseScripts: {
                preEnabled: true,
                stopEnabled: false,
              },
            },
          },
        },
      ],
    });

    expect(config.getConfigValue('developmentPipeline.phaseScripts.preEnabled', false)).toBe(true);
    expect(config.getConfigValue('developmentPipeline.phaseScripts.stopEnabled', true)).toBe(false);
    expect(config.getConfigValue('team.delegateMode')).toBe(false);
  });
});
