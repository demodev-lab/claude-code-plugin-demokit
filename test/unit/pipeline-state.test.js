const fs = require('fs');
const os = require('os');
const path = require('path');

const pipelineState = require('../../lib/pipeline/state');

function createTempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-pipeline-'));
  fs.writeFileSync(path.join(root, 'build.gradle'), 'plugins {}\n', 'utf8');
  return root;
}

describe('pipeline state', () => {
  it('startPipeline creates .pipeline/status.json with phase 1 in-progress', () => {
    const projectRoot = createTempProject();
    try {
      const { state, reused } = pipelineState.startPipeline(projectRoot, 'user-management');
      expect(reused).toBe(false);
      expect(state.feature).toBe('user-management');
      expect(state.currentPhase).toBe(1);
      expect(Array.isArray(state.phases)).toBe(true);
      expect(state.phases[0].status).toBe('in-progress');

      const loaded = pipelineState.loadStatus(projectRoot);
      expect(loaded).toBeTruthy();
      expect(loaded.feature).toBe('user-management');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('startPipeline reuses existing active feature state by default', () => {
    const projectRoot = createTempProject();
    try {
      pipelineState.startPipeline(projectRoot, 'orders');
      const second = pipelineState.startPipeline(projectRoot, 'orders');
      expect(second.reused).toBe(true);
      expect(second.state.feature).toBe('orders');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('advancePipeline moves current phase to completed and next phase to in-progress', () => {
    const projectRoot = createTempProject();
    try {
      pipelineState.startPipeline(projectRoot, 'payments');
      const result = pipelineState.advancePipeline(projectRoot);
      expect(result.advanced).toBe(true);
      expect(result.completed).toBe(false);
      expect(result.from.id).toBe(1);
      expect(result.to.id).toBe(2);

      const state = pipelineState.loadStatus(projectRoot);
      const phase1 = state.phases.find(p => p.id === 1);
      const phase2 = state.phases.find(p => p.id === 2);
      expect(phase1.status).toBe('completed');
      expect(phase2.status).toBe('in-progress');
      expect(state.currentPhase).toBe(2);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('advancePipeline completes final phase and marks pipeline completedAt', () => {
    const projectRoot = createTempProject();
    try {
      pipelineState.startPipeline(projectRoot, 'auth');
      // 총 9단계 기준, 마지막 완료까지 9번 next 호출
      for (let i = 0; i < 9; i += 1) {
        pipelineState.advancePipeline(projectRoot);
      }

      const state = pipelineState.loadStatus(projectRoot);
      expect(state.completedAt).toBeTruthy();
      expect(state.phases.every(p => p.status === 'completed')).toBe(true);
      const historyLength = state.history.length;

      const last = pipelineState.advancePipeline(projectRoot);
      expect(last.completed).toBe(true);
      expect(last.advanced).toBe(false);

      const after = pipelineState.loadStatus(projectRoot);
      expect(after.history.length).toBe(historyLength);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
