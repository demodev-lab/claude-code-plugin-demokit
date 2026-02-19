const { matchIntent } = require('../../lib/intent/trigger');

describe('trigger - intent conflict between /pdca and /plan-plus', () => {
  it('routes /plan-plus to plan-plus intent', () => {
    expect(matchIntent('/plan-plus')).toMatchObject({ id: 'plan-plus', command: '/plan-plus' });
    expect(matchIntent('/plan-plus user-management')).toMatchObject({ id: 'plan-plus', command: '/plan-plus' });
  });

  it('keeps /pdca plan to pdca intent', () => {
    expect(matchIntent('/pdca plan')).toMatchObject({ id: 'pdca', command: '/pdca' });
  });
});
