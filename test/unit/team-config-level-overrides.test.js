jest.mock('../../lib/core', () => ({
  config: {
    loadConfig: jest.fn(),
  },
}));

jest.mock('../../lib/team/strategy', () => ({
  getPhaseExecutionPattern: jest.fn(),
}));

const { config } = require('../../lib/core');
const { getPhaseExecutionPattern } = require('../../lib/team/strategy');
const teamConfig = require('../../lib/team/team-config');

describe('team-config levelOverrides & delegateMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPhaseExecutionPattern.mockReturnValue('swarm');
  });

  it('applies global delegateMode when enabled', () => {
    config.loadConfig.mockReturnValue({
      team: {
        delegateMode: true,
        maxTeammates: { SingleModule: 3 },
        phaseTeams: {
          do: { lead: 'spring-architect', members: ['service-expert', 'domain-expert'], pattern: 'swarm' },
        },
      },
    });

    const result = teamConfig.getPhaseTeam('do', 'SingleModule');
    expect(result.delegateMode).toBe(true);
    expect(result.pattern).toBe('leader');
    expect(result.lead).toBe('spring-architect');
    expect(result.members).toEqual(['spring-architect']);
    expect(result.maxParallel).toBe(1);
  });

  it('applies levelOverrides delegateMode/maxTeammates for SingleModule', () => {
    config.loadConfig.mockReturnValue({
      team: {
        delegateMode: false,
        maxTeammates: { SingleModule: 3, MSA: 5 },
        levelOverrides: {
          SingleModule: {
            delegateMode: true,
            maxTeammates: 1,
          },
        },
        phaseTeams: {
          do: { lead: null, members: ['service-expert', 'domain-expert'], pattern: 'swarm' },
        },
      },
    });

    const doTeam = teamConfig.getPhaseTeam('do', 'SingleModule');
    expect(doTeam.delegateMode).toBe(true);
    expect(doTeam.members).toEqual(['service-expert']);
    expect(doTeam.maxParallel).toBe(1);

    const msaTeam = teamConfig.getPhaseTeam('do', 'MSA');
    expect(msaTeam.delegateMode).toBe(false);
    expect(msaTeam.members).toEqual(['service-expert', 'domain-expert']);
  });

  it('exposes isDelegateMode(level) with level override priority', () => {
    config.loadConfig.mockReturnValue({
      team: {
        delegateMode: false,
        levelOverrides: {
          SingleModule: { delegateMode: true },
          MSA: { delegateMode: false },
        },
      },
    });

    expect(teamConfig.isDelegateMode('SingleModule')).toBe(true);
    expect(teamConfig.isDelegateMode('MSA')).toBe(false);
    expect(teamConfig.isDelegateMode('MultiModule')).toBe(false);
  });

  it('merges partial phase team override with global phase team', () => {
    getPhaseExecutionPattern.mockReturnValue(undefined);

    config.loadConfig.mockReturnValue({
      team: {
        delegateMode: false,
        maxTeammates: { SingleModule: 3 },
        phaseTeams: {
          do: { lead: null, members: ['service-expert', 'domain-expert'], pattern: 'swarm' },
        },
        levelOverrides: {
          SingleModule: {
            phaseTeams: {
              do: { pattern: 'leader' },
            },
          },
        },
      },
    });

    const result = teamConfig.getPhaseTeam('do', 'SingleModule');
    expect(result.pattern).toBe('leader');
    expect(result.members).toEqual(['service-expert', 'domain-expert']);
  });
});
