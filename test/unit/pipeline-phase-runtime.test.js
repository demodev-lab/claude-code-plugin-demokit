const fs = require('fs');
const os = require('os');
const path = require('path');

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
    expect(cfg.stopEnabled).toBe(true);
    expect(cfg.transitionEnabled).toBe(true);
    expect(cfg.emitOncePerPhase).toBe(true);
  });

  it('respects explicit phase script toggles', () => {
    const coreConfig = {
      getConfigValue: jest.fn().mockReturnValue({
        enabled: true,
        preEnabled: true,
        postEnabled: true,
        stopEnabled: false,
        transitionEnabled: false,
        emitOncePerPhase: false,
      }),
    };

    const cfg = runtime.getPhaseScriptConfig(coreConfig);
    expect(runtime.isStageEnabled('pre', cfg)).toBe(true);
    expect(runtime.isStageEnabled('post', cfg)).toBe(true);
    expect(runtime.isStageEnabled('stop', cfg)).toBe(false);
    expect(runtime.isStageEnabled('transition', cfg)).toBe(false);
    expect(cfg.emitOncePerPhase).toBe(false);
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

  it('exposes stage hook control metadata', () => {
    const pre = runtime.getStageHookControl('pre');
    const stop = runtime.getStageHookControl('stop');

    expect(pre).toEqual(expect.objectContaining({ eventName: 'PreToolUse', scriptKey: 'pipelinePhasePre' }));
    expect(stop).toEqual(expect.objectContaining({ eventName: 'Stop', scriptKey: 'pipelinePhaseStop' }));
  });

  it('returns stage hint by phase/stage', () => {
    expect(runtime.getStageHint({ slug: 'feature' }, 'pre')).toBeTruthy();
    expect(runtime.getStageHint({ slug: 'feature' }, 'unknown')).toBeNull();
  });

  it('resets emit-once markers per pipeline run id', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'demokit-runtime-marker-'));
    try {
      const first = runtime.markStageEmission(projectRoot, 'feature-a', 'run-1', 1, 'pre', true);
      const second = runtime.markStageEmission(projectRoot, 'feature-a', 'run-1', 1, 'pre', true);
      const third = runtime.markStageEmission(projectRoot, 'feature-a', 'run-2', 1, 'pre', true);

      expect(first).toBe(true);
      expect(second).toBe(false);
      expect(third).toBe(true);

      const markerPath = path.join(projectRoot, '.pipeline', '.phase-runtime-markers.json');
      const markers = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
      expect(Object.keys(markers).some(k => k.includes('run-1'))).toBe(false);
      expect(Object.keys(markers).some(k => k.includes('run-2'))).toBe(true);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
