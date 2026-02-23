const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const stateWriter = require('../../lib/team/state-writer');

describe('team/state-writer waveExecution', () => {
  function createProjectRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-wave-'));
    fs.mkdirSync(path.join(root, '.demodev'), { recursive: true });
    return root;
  }

  it('defaultState에 waveExecution=null, version=1.2', () => {
    const root = createProjectRoot();
    try {
      const state = stateWriter.loadTeamState(root);
      expect(state.waveExecution).toBeNull();
      expect(state.version).toBe('1.2');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('initWaveExecution으로 상태 저장', () => {
    const root = createProjectRoot();
    try {
      const waveState = { featureSlug: 'test', currentWave: 0, totalWaves: 2, status: 'pending', waves: [] };
      stateWriter.initWaveExecution(root, waveState);
      const state = stateWriter.loadTeamState(root);
      expect(state.waveExecution).toBeTruthy();
      expect(state.waveExecution.featureSlug).toBe('test');
      expect(state.waveExecution.status).toBe('pending');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('updateWaveExecution으로 상태 변경', () => {
    const root = createProjectRoot();
    try {
      const waveState = { featureSlug: 'test', currentWave: 0, totalWaves: 2, status: 'pending', waves: [] };
      stateWriter.initWaveExecution(root, waveState);
      stateWriter.updateWaveExecution(root, (we) => {
        we.status = 'in_progress';
        we.currentWave = 1;
      });
      const state = stateWriter.loadTeamState(root);
      expect(state.waveExecution.status).toBe('in_progress');
      expect(state.waveExecution.currentWave).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('updateWaveExecution이 waveExecution=null이면 저장하지 않음', () => {
    const root = createProjectRoot();
    try {
      // init 없이 바로 update
      const stateBefore = stateWriter.loadTeamState(root);
      const updatedAtBefore = stateBefore.updatedAt;

      stateWriter.updateWaveExecution(root, (we) => {
        we.status = 'in_progress';
      });

      const stateAfter = stateWriter.loadTeamState(root);
      // waveExecution이 null이므로 save가 실행되지 않아 updatedAt이 변경되지 않아야 함
      expect(stateAfter.waveExecution).toBeNull();
      expect(stateAfter.updatedAt).toBe(updatedAtBefore);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('normalizeState가 기존 waveExecution 보존', () => {
    const root = createProjectRoot();
    try {
      stateWriter.initWaveExecution(root, { featureSlug: 'keep-me', status: 'in_progress', waves: [] });
      // 다른 업데이트로 normalizeState 경유
      stateWriter.updateMemberStatus(root, 'agent-x', 'idle', null);
      const state = stateWriter.loadTeamState(root);
      expect(state.waveExecution).toBeTruthy();
      expect(state.waveExecution.featureSlug).toBe('keep-me');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('withTeamLock으로 atomic read-modify-write', () => {
    const root = createProjectRoot();
    try {
      stateWriter.initWaveExecution(root, { featureSlug: 'locked', status: 'pending', waves: [] });
      const result = stateWriter.withTeamLock(root, () => {
        const state = stateWriter.loadTeamState(root);
        state.waveExecution.status = 'in_progress';
        stateWriter.saveTeamState(root, state);
        return state.waveExecution.status;
      });
      expect(result).toBe('in_progress');
      const state = stateWriter.loadTeamState(root);
      expect(state.waveExecution.status).toBe('in_progress');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('normalizeState가 non-object waveExecution을 null로 변환', () => {
    const root = createProjectRoot();
    try {
      // 직접 비정상 값 저장
      const statePath = path.join(root, '.demodev', 'team-state.json');
      const rawState = { version: '1.2', waveExecution: 'invalid-string' };
      fs.writeFileSync(statePath, JSON.stringify(rawState));

      const state = stateWriter.loadTeamState(root);
      expect(state.waveExecution).toBeNull();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
