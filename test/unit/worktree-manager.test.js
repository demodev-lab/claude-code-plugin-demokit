const { execSync } = require('child_process');
const worktreeManager = require('../../lib/team/worktree-manager');

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
}));

describe('team/worktree-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorktree', () => {
    it('execSync으로 git worktree add 실행', () => {
      execSync.mockReturnValue('');
      const result = worktreeManager.createWorktree('/project', 'feature/test');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git worktree add'),
        expect.objectContaining({ cwd: '/project' }),
      );
      expect(result).toHaveProperty('worktreePath');
      expect(result).toHaveProperty('branchName');
    });

    it('브랜치명 특수문자 정규화', () => {
      execSync.mockReturnValue('');
      const result = worktreeManager.createWorktree('/project', 'wave-1/feature/entity');
      expect(result.branchName).toBe('wave-1/feature/entity');
    });

    it('baseBranch 지정 시 해당 브랜치 기반 생성', () => {
      execSync.mockReturnValue('');
      worktreeManager.createWorktree('/project', 'test-branch', 'main');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('main'),
        expect.any(Object),
      );
    });

    it('빈 branchName일 때 throw', () => {
      expect(() => worktreeManager.createWorktree('/project', '')).toThrow('non-empty string');
    });

    it('특수문자만 있는 branchName일 때 throw', () => {
      expect(() => worktreeManager.createWorktree('/project', '!!!')).toThrow('empty string after sanitization');
    });
  });

  describe('removeWorktree', () => {
    it('git worktree remove 실행', () => {
      execSync.mockReturnValue('');
      worktreeManager.removeWorktree('/project', '/tmp/wt');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git worktree remove'),
        expect.objectContaining({ cwd: '/project' }),
      );
    });

    it('이미 삭제된 worktree면 prune으로 fallback', () => {
      const err = new Error('not a working tree');
      err.stderr = Buffer.from('is not a working tree');
      execSync
        .mockImplementationOnce(() => { throw err; })
        .mockReturnValueOnce('');
      worktreeManager.removeWorktree('/project', '/tmp/wt');
      expect(execSync).toHaveBeenCalledTimes(2);
      expect(execSync).toHaveBeenLastCalledWith(
        'git worktree prune',
        expect.any(Object),
      );
    });

    it('알 수 없는 에러는 re-throw', () => {
      const err = new Error('permission denied');
      err.stderr = Buffer.from('permission denied');
      execSync.mockImplementationOnce(() => { throw err; });
      expect(() => worktreeManager.removeWorktree('/project', '/tmp/wt')).toThrow('permission denied');
    });

    it('경로에 double quote 포함 시 throw', () => {
      expect(() => worktreeManager.removeWorktree('/project', '/tmp/"evil')).toThrow('unsafe characters');
    });

    it('경로에 null byte 포함 시 throw', () => {
      expect(() => worktreeManager.removeWorktree('/project', '/tmp/\0evil')).toThrow('unsafe characters');
    });
  });

  describe('mergeWorktree', () => {
    it('성공 시 success=true 반환', () => {
      execSync.mockReturnValue('');
      const result = worktreeManager.mergeWorktree('/project', 'wave-1/entity', 'main');
      expect(result.success).toBe(true);
      expect(result.conflicts).toBe(false);
    });

    it('conflict 시 conflicts=true 반환 + merge --abort 실행', () => {
      const err = new Error('merge failed');
      err.stderr = Buffer.from('CONFLICT (content): merge conflict');
      execSync
        .mockImplementationOnce(() => { throw err; }) // git merge
        .mockReturnValueOnce(''); // git merge --abort
      const result = worktreeManager.mergeWorktree('/project', 'wave-1/entity', 'main');
      expect(result.success).toBe(false);
      expect(result.conflicts).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        'git merge --abort',
        expect.objectContaining({ cwd: '/project' }),
      );
    });
  });

  describe('listWorktrees', () => {
    it('porcelain 출력 파싱', () => {
      execSync.mockReturnValue(
        'worktree /project\nbranch refs/heads/main\n\nworktree /tmp/wt\nbranch refs/heads/feature\n',
      );
      const result = worktreeManager.listWorktrees('/project');
      expect(result).toHaveLength(2);
      expect(result[1].branch).toBe('feature');
    });

    it('detached HEAD worktree 파싱', () => {
      execSync.mockReturnValue(
        'worktree /project\nbranch refs/heads/main\n\nworktree /tmp/detached\nHEAD abc123\ndetached\n',
      );
      const result = worktreeManager.listWorktrees('/project');
      expect(result).toHaveLength(2);
      expect(result[0].branch).toBe('main');
      expect(result[1].detached).toBe(true);
      expect(result[1].branch).toBeUndefined();
    });

    it('bare worktree 파싱', () => {
      execSync.mockReturnValue('worktree /project\nbare\n');
      const result = worktreeManager.listWorktrees('/project');
      expect(result).toHaveLength(1);
      expect(result[0].bare).toBe(true);
    });

    it('non-heads ref 파싱', () => {
      execSync.mockReturnValue('worktree /tmp/wt\nbranch refs/remotes/origin/main\n');
      const result = worktreeManager.listWorktrees('/project');
      expect(result).toHaveLength(1);
      expect(result[0].branch).toBe('refs/remotes/origin/main');
    });

    it('실패 시 빈 배열', () => {
      execSync.mockImplementation(() => { throw new Error('fail'); });
      expect(worktreeManager.listWorktrees('/project')).toEqual([]);
    });
  });

  describe('createWaveWorktrees', () => {
    it('레이어별 worktree 일괄 생성', () => {
      execSync.mockReturnValue('');
      const results = worktreeManager.createWaveWorktrees('/project', 'test-feat', 1, ['entity', 'dto']);
      expect(results).toHaveLength(2);
      expect(results[0].layer).toBe('entity');
      expect(results[1].layer).toBe('dto');
    });

    it('빈/null layerNames일 때 빈 배열', () => {
      expect(worktreeManager.createWaveWorktrees('/project', 'feat', 1, [])).toEqual([]);
      expect(worktreeManager.createWaveWorktrees('/project', 'feat', 1, null)).toEqual([]);
    });

    it('부분 실패 시 이미 생성된 worktree rollback 후 throw', () => {
      let callCount = 0;
      execSync.mockImplementation(() => {
        callCount++;
        // 첫 번째 worktree add 성공, 두 번째 실패
        if (callCount === 2) throw new Error('git worktree add failed');
        return '';
      });
      expect(() => {
        worktreeManager.createWaveWorktrees('/project', 'test-feat', 1, ['entity', 'dto']);
      }).toThrow('git worktree add failed');
    });
  });

  describe('mergeAndCleanupWave', () => {
    it('null/빈 worktrees일 때 빈 결과', () => {
      expect(worktreeManager.mergeAndCleanupWave('/project', null, 'main'))
        .toEqual({ mergedCount: 0, conflictCount: 0, results: [] });
      expect(worktreeManager.mergeAndCleanupWave('/project', [], 'main'))
        .toEqual({ mergedCount: 0, conflictCount: 0, results: [] });
    });

    it('성공/실패 카운트 집계', () => {
      execSync
        .mockReturnValueOnce('') // merge entity
        .mockReturnValueOnce('') // remove entity
        .mockImplementationOnce(() => { // merge dto fails
          const err = new Error('conflict');
          err.stderr = Buffer.from('CONFLICT');
          throw err;
        })
        .mockReturnValueOnce('') // git merge --abort
        .mockReturnValueOnce(''); // remove dto

      const worktrees = [
        { layer: 'entity', worktreePath: '/tmp/wt1', branchName: 'wave-1/entity' },
        { layer: 'dto', worktreePath: '/tmp/wt2', branchName: 'wave-1/dto' },
      ];
      const result = worktreeManager.mergeAndCleanupWave('/project', worktrees, 'main');
      expect(result.mergedCount).toBe(1);
      expect(result.conflictCount).toBe(1);
      expect(result.results).toHaveLength(2);
    });
  });
});
