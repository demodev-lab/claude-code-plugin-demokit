const { matchIntent } = require('../../lib/intent/trigger');

describe('trigger - intent conflict between /pdca and /plan-plus', () => {
  it('routes /plan-plus to plan-plus intent', () => {
    expect(matchIntent('/plan-plus')).toMatchObject({ id: 'plan-plus', command: '/plan-plus' });
    expect(matchIntent('/plan-plus user-management')).toMatchObject({ id: 'plan-plus', command: '/plan-plus' });
  });

  it('keeps /pdca plan to pdca intent', () => {
    expect(matchIntent('/pdca plan')).toMatchObject({ id: 'pdca', command: '/pdca' });
  });

  it('routes /superwork to superwork intent', () => {
    expect(matchIntent('/superwork 회원가입 API 구현')).toMatchObject({ id: 'superwork', command: '/superwork' });
  });

  it('does not route natural language phrase to superwork intent', () => {
    expect(matchIntent('구현 요청은 자동 오케스트레이션으로 처리하고 싶어요')).toBeNull();
  });
});
