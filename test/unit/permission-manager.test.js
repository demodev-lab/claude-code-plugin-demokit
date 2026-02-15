const {
  checkPermission, shouldBlock, requiresConfirmation,
  getPermissionLevel, isMoreRestrictive, getAllPermissions,
  PERMISSION_LEVELS, globMatch, parsePermissionKey,
} = require('../../lib/core/permission');

// config mock
jest.mock('../../lib/core/config', () => ({
  loadConfig: () => ({
    permissions: {
      'Bash(rm -rf **)': 'deny',
      'Bash(rm -r **)': 'ask',
      'Bash(git push --force**)': 'deny',
      'Bash(git reset --hard**)': 'ask',
      'Write(**/.env*)': 'deny',
    },
  }),
}));

describe('Permission Manager', () => {
  describe('PERMISSION_LEVELS', () => {
    it('deny=0, ask=1, allow=2', () => {
      expect(PERMISSION_LEVELS.deny).toBe(0);
      expect(PERMISSION_LEVELS.ask).toBe(1);
      expect(PERMISSION_LEVELS.allow).toBe(2);
    });
  });

  describe('shouldBlock', () => {
    it('rm -rf / → blocked:true', () => {
      const result = shouldBlock('Bash', { command: 'rm -rf /' });
      expect(result.blocked).toBe(true);
      expect(result.permission).toBe('deny');
    });

    it('ls → blocked:false', () => {
      const result = shouldBlock('Bash', { command: 'ls -la' });
      expect(result.blocked).toBe(false);
    });

    it('.env 파일 쓰기 → blocked:true', () => {
      const result = shouldBlock('Write', { file_path: '/app/.env.production' });
      expect(result.blocked).toBe(true);
    });
  });

  describe('requiresConfirmation', () => {
    it('rm -r dir → 확인 필요', () => {
      const result = requiresConfirmation('Bash', { command: 'rm -r temp' });
      expect(result.requiresConfirmation).toBe(true);
      expect(result.permission).toBe('ask');
    });

    it('git status → 확인 불필요', () => {
      const result = requiresConfirmation('Bash', { command: 'git status' });
      expect(result.requiresConfirmation).toBe(false);
    });

    it('git reset --hard → 확인 필요', () => {
      const result = requiresConfirmation('Bash', { command: 'git reset --hard HEAD' });
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('getPermissionLevel', () => {
    it('deny → 0', () => expect(getPermissionLevel('deny')).toBe(0));
    it('ask → 1', () => expect(getPermissionLevel('ask')).toBe(1));
    it('allow → 2', () => expect(getPermissionLevel('allow')).toBe(2));
    it('unknown → 2 (allow)', () => expect(getPermissionLevel('unknown')).toBe(2));
  });

  describe('isMoreRestrictive', () => {
    it('deny < allow → true', () => expect(isMoreRestrictive('deny', 'allow')).toBe(true));
    it('allow < deny → false', () => expect(isMoreRestrictive('allow', 'deny')).toBe(false));
    it('ask < allow → true', () => expect(isMoreRestrictive('ask', 'allow')).toBe(true));
    it('deny < ask → true', () => expect(isMoreRestrictive('deny', 'ask')).toBe(true));
  });

  describe('getAllPermissions', () => {
    it('설정된 permissions 반환', () => {
      const perms = getAllPermissions();
      expect(perms).toBeDefined();
      expect(typeof perms).toBe('object');
    });
  });

  describe('globMatch', () => {
    it('** 패턴 매칭 (경로 포함)', () => {
      expect(globMatch('rm -rf **', 'rm -rf /')).toBe(true);
      expect(globMatch('rm -rf **', 'ls -la')).toBe(false);
    });

    it('* 패턴 매칭 (경로 미포함)', () => {
      expect(globMatch('rm -rf*', 'rm -rftemp')).toBe(true);
      expect(globMatch('rm -rf*', 'ls -la')).toBe(false);
    });
  });

  describe('parsePermissionKey', () => {
    it('Bash(pattern) 파싱', () => {
      const result = parsePermissionKey('Bash(rm -rf*)');
      expect(result).toEqual({ tool: 'Bash', pattern: 'rm -rf*' });
    });

    it('Write(pattern) 파싱', () => {
      const result = parsePermissionKey('Write(**/.env*)');
      expect(result).toEqual({ tool: 'Write', pattern: '**/.env*' });
    });

    it('잘못된 키 → null', () => {
      expect(parsePermissionKey('invalid')).toBeNull();
    });
  });
});
