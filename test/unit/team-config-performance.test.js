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

describe('team-config performance overrides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies do-phase member cap/pattern/maxParallel overrides for SingleModule', () => {
    config.loadConfig.mockReturnValue({
      team: {
        maxTeammates: { SingleModule: 2 },
        phaseTeams: {
          do: { lead: null, members: ['service-expert', 'domain-expert'], pattern: 'swarm' },
        },
        performance: {
          phaseMemberCap: { do: { SingleModule: 1 } },
          phasePatternOverride: { do: { SingleModule: 'leader' } },
          phaseMaxParallel: { do: { SingleModule: 1 } },
        },
      },
    });
    getPhaseExecutionPattern.mockReturnValue('swarm');

    const result = teamConfig.getPhaseTeam('do', 'SingleModule');
    expect(result.members).toEqual(['service-expert']);
    expect(result.pattern).toBe('leader');
    expect(result.maxParallel).toBe(1);
  });

  it('keeps strategy single as highest priority', () => {
    config.loadConfig.mockReturnValue({
      team: {
        maxTeammates: { SingleModule: 2 },
        phaseTeams: {
          do: { lead: null, members: ['service-expert', 'domain-expert'], pattern: 'swarm' },
        },
        performance: {
          phaseMemberCap: { do: { SingleModule: 1 } },
          phasePatternOverride: { do: { SingleModule: 'leader' } },
          phaseMaxParallel: { do: { SingleModule: 1 } },
        },
      },
    });
    getPhaseExecutionPattern.mockReturnValue('single');

    const result = teamConfig.getPhaseTeam('do', 'SingleModule');
    expect(result.pattern).toBe('single');
    expect(result.members).toEqual([]);
    expect(result.maxParallel).toBe(1);
  });

  it('falls back to phase default when no performance override', () => {
    config.loadConfig.mockReturnValue({
      team: {
        maxTeammates: { SingleModule: 2 },
        phaseTeams: {
          do: { lead: null, members: ['domain-expert', 'service-expert'], pattern: 'swarm' },
        },
      },
    });
    getPhaseExecutionPattern.mockReturnValue('swarm');

    const result = teamConfig.getPhaseTeam('do', 'SingleModule');
    expect(result.members).toEqual(['domain-expert', 'service-expert']);
    expect(result.pattern).toBe('swarm');
    expect(result.maxParallel).toBe(2);
  });
});
