/**
 * Worktree Manager
 * Git worktree CRUD 유틸리티
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WORKTREE_DIR = '.demodev/worktrees';

function sanitizeBranchName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('branchName must be a non-empty string');
  }
  const sanitized = name
    .replace(/[^a-zA-Z0-9가-힣/_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
  if (!sanitized) {
    throw new Error(`Branch name '${name}' results in empty string after sanitization`);
  }
  return sanitized;
}

function validatePath(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('path must be a non-empty string');
  }
  if (value.includes('"') || value.includes('\0')) {
    throw new Error(`Invalid path containing unsafe characters: ${value}`);
  }
}

function getWorktreeBase(projectRoot) {
  return path.join(projectRoot, WORKTREE_DIR);
}

/**
 * Git worktree 생성
 */
function createWorktree(projectRoot, branchName, baseBranch) {
  const safeBranch = sanitizeBranchName(branchName);
  const worktreePath = path.join(getWorktreeBase(projectRoot), safeBranch);
  const base = baseBranch ? sanitizeBranchName(baseBranch) : 'HEAD';

  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });

  execSync(
    `git worktree add -b "${safeBranch}" "${worktreePath}" ${base}`,
    { cwd: projectRoot, stdio: 'pipe' },
  );

  return { worktreePath, branchName: safeBranch };
}

/**
 * Git worktree 삭제
 */
function removeWorktree(projectRoot, worktreePath) {
  validatePath(worktreePath);
  try {
    execSync(`git worktree remove "${worktreePath}" --force`, {
      cwd: projectRoot,
      stdio: 'pipe',
    });
  } catch (err) {
    const msg = err.stderr ? err.stderr.toString() : err.message;
    // worktree가 이미 삭제된 경우에만 prune으로 정리
    if (msg.includes('not a working tree') || msg.includes('does not exist') || msg.includes('is not a valid')) {
      execSync('git worktree prune', { cwd: projectRoot, stdio: 'pipe' });
    } else {
      throw err;
    }
  }
}

/**
 * Worktree 브랜치를 현재 체크아웃 브랜치에 merge
 */
function mergeWorktree(projectRoot, worktreeBranch, targetBranch) {
  const safeBranch = sanitizeBranchName(worktreeBranch);
  const safeTarget = targetBranch ? sanitizeBranchName(targetBranch) : 'current';
  try {
    execSync(
      `git merge --no-ff "${safeBranch}" -m "merge: wave ${safeBranch} into ${safeTarget}"`,
      { cwd: projectRoot, stdio: 'pipe' },
    );
    return { success: true, conflicts: false, message: `merged ${safeBranch}` };
  } catch (err) {
    const output = err.stderr ? err.stderr.toString() : err.message;
    if (output.includes('CONFLICT') || output.includes('conflict')) {
      try {
        execSync('git merge --abort', { cwd: projectRoot, stdio: 'pipe' });
      } catch { /* abort 실패 무시 */ }
      return { success: false, conflicts: true, message: output };
    }
    return { success: false, conflicts: false, message: output };
  }
}

/**
 * Wave 단위 worktree 일괄 생성 (부분 실패 시 rollback)
 */
function createWaveWorktrees(projectRoot, featureSlug, waveIndex, layerNames) {
  if (!Array.isArray(layerNames) || layerNames.length === 0) {
    return [];
  }
  const results = [];
  const created = [];
  try {
    for (const layer of layerNames) {
      const branchName = `wave-${waveIndex}/${featureSlug}/${layer}`;
      const wt = createWorktree(projectRoot, branchName);
      created.push(wt.worktreePath);
      results.push({ layer, worktreePath: wt.worktreePath, branchName: wt.branchName });
    }
  } catch (err) {
    for (const wtPath of created) {
      try { removeWorktree(projectRoot, wtPath); } catch { /* best-effort rollback */ }
    }
    throw err;
  }
  return results;
}

/**
 * Wave worktree 일괄 merge + 삭제
 */
function mergeAndCleanupWave(projectRoot, worktrees, targetBranch) {
  if (!Array.isArray(worktrees) || worktrees.length === 0) {
    return { mergedCount: 0, conflictCount: 0, results: [] };
  }
  let mergedCount = 0;
  let conflictCount = 0;
  const results = [];

  for (const wt of worktrees) {
    const result = mergeWorktree(projectRoot, wt.branchName, targetBranch);
    results.push({ layer: wt.layer, ...result });
    if (result.success) {
      mergedCount++;
    }
    if (result.conflicts) {
      conflictCount++;
    }
    // 성공 또는 conflict(abort 완료)일 때만 worktree 삭제
    // non-conflict 실패 시 worktree 보존 (디버깅/재시도 가능)
    if (result.success || result.conflicts) {
      try {
        removeWorktree(projectRoot, wt.worktreePath);
      } catch { /* cleanup best-effort */ }
    }
  }

  return { mergedCount, conflictCount, results };
}

module.exports = {
  createWorktree,
  removeWorktree,
  mergeWorktree,
  createWaveWorktrees,
  mergeAndCleanupWave,
};
