const fs = require('fs');
const path = require('path');

describe('Worker skill bootstrap instructions', () => {
  const skillPath = path.join(__dirname, '..', '..', 'skills', 'worker', 'SKILL.md');

  it('keeps a local worker skill guide required by team worker inbox instructions', () => {
    expect(fs.existsSync(skillPath)).toBe(true);

    const content = fs.readFileSync(skillPath, 'utf-8');
    expect(content).toContain('leader-fixed');
    expect(content).toContain('team_claim_task');
    expect(content).toContain('.omx/state/team/<teamName>/workers/<workerName>/inbox.md');
  });
});
