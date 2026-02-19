const fs = require('fs');
const os = require('os');
const path = require('path');

const { createPhaseStopHandler } = require('../../scripts/pipeline-phase-stop-common');
const { state: pipelineState } = require('../../lib/pipeline');

function createTempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-phase-stop-'));
  fs.writeFileSync(path.join(root, 'build.gradle'), 'plugins {}\n', 'utf8');
  return root;
}

describe('pipeline phase stop scripts', () => {
  it('returns phase hint when current phase matches and completion signal exists', async () => {
    const projectRoot = createTempProject();
    try {
      pipelineState.startPipeline(projectRoot, 'demo-feature', { reset: true });

      const handler = createPhaseStopHandler({ phaseId: 1, phaseName: 'Schema' });
      const result = await handler({
        projectRoot,
        hookData: { task_description: 'schema 완료' },
      });

      expect(result).toBeTruthy();
      expect(result.systemMessage).toContain('[Pipeline][Phase 1] Schema 완료 신호 감지');
      expect(result.systemMessage).toContain('다음 단계: /pipeline next');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('returns empty object when completion signal is missing', async () => {
    const projectRoot = createTempProject();
    try {
      pipelineState.startPipeline(projectRoot, 'demo-feature', { reset: true });

      const handler = createPhaseStopHandler({ phaseId: 1, phaseName: 'Schema' });
      const result = await handler({
        projectRoot,
        hookData: { task_description: 'schema 확인 중' },
      });

      expect(result).toEqual({});
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('does not treat incomplete as completion signal', async () => {
    const projectRoot = createTempProject();
    try {
      pipelineState.startPipeline(projectRoot, 'demo-feature', { reset: true });

      const handler = createPhaseStopHandler({ phaseId: 1, phaseName: 'Schema' });
      const result = await handler({
        projectRoot,
        hookData: { task_description: 'incomplete task' },
      });

      expect(result).toEqual({});
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('does not treat negative-completion phrases as completion signals', async () => {
    const projectRoot = createTempProject();
    try {
      pipelineState.startPipeline(projectRoot, 'demo-feature', { reset: true });

      const handler = createPhaseStopHandler({ phaseId: 1, phaseName: 'Schema' });

      const koreanNegative = await handler({
        projectRoot,
        hookData: { task_description: 'schema 미완료 상태' },
      });
      expect(koreanNegative).toEqual({});

      const englishNegative = await handler({
        projectRoot,
        hookData: { task_description: 'task is not complete yet' },
      });
      expect(englishNegative).toEqual({});
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('returns empty object when phase does not match current pipeline phase', async () => {
    const projectRoot = createTempProject();
    try {
      pipelineState.startPipeline(projectRoot, 'demo-feature', { reset: true });

      const phase2Handler = createPhaseStopHandler({ phaseId: 2, phaseName: 'Convention' });
      const result = await phase2Handler({
        projectRoot,
        hookData: { task_description: 'schema 완료' },
      });

      expect(result).toEqual({});
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
