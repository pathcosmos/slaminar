import { describe, it, expect } from 'vitest';
import { scanGitInfo } from '../../src/scanner/git-info.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

describe('scanGitInfo', () => {
  function createGitRepo(): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-git-test-'));
    execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir, stdio: 'pipe' });
    return dir;
  }

  it('returns null for non-git directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-nogit-'));
    try {
      expect(scanGitInfo(dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('scans empty repo', () => {
    const dir = createGitRepo();
    try {
      const result = scanGitInfo(dir);
      expect(result).not.toBeNull();
      expect(result!.totalCommits).toBe(0);
      expect(result!.recentCommits).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('scans repo with commits', () => {
    const dir = createGitRepo();
    execFileSync('touch', ['file.txt'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'feat: initial'], { cwd: dir, stdio: 'pipe' });
    execFileSync('touch', ['file2.txt'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'fix: second'], { cwd: dir, stdio: 'pipe' });
    try {
      const result = scanGitInfo(dir);
      expect(result!.totalCommits).toBe(2);
      expect(result!.recentCommits).toHaveLength(2);
      expect(result!.contributors).toContain('Test');
      expect(result!.currentBranch).toBeTruthy();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
