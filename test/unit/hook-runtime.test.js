jest.mock('../../lib/core/config', () => ({
  getConfigValue: jest.fn(),
}));

const config = require('../../lib/core/config');
const hookRuntime = require('../../lib/core/hook-runtime');

describe('hook-runtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses fallback when config value is missing', () => {
    config.getConfigValue.mockReturnValue(undefined);
    expect(hookRuntime.isEventEnabled('TaskCompleted', true)).toBe(true);
    expect(hookRuntime.isScriptEnabled('taskCompleted', false)).toBe(false);
  });

  it('treats false as disabled', () => {
    config.getConfigValue.mockImplementation((key, fallback) => {
      if (key === 'hooks.runtime.events.TaskCompleted') return false;
      return fallback;
    });

    expect(hookRuntime.shouldRun({
      eventName: 'TaskCompleted',
      scriptKey: 'taskCompleted',
      eventFallback: true,
      scriptFallback: true,
    })).toBe(false);
  });

  it('requires both event and script enabled', () => {
    config.getConfigValue.mockImplementation((key, fallback) => {
      if (key === 'hooks.runtime.events.TaskCompleted') return true;
      if (key === 'hooks.runtime.scripts.taskCompleted') return false;
      return fallback;
    });

    expect(hookRuntime.shouldRun({
      eventName: 'TaskCompleted',
      scriptKey: 'taskCompleted',
      eventFallback: true,
      scriptFallback: true,
    })).toBe(false);
  });
});
