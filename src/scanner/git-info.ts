import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GitInfo, GitCommit } from '../types/index.js';

function git(args: string[], cwd: string): string | null {
  try {
    return execFileSync('git', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      timeout: 10_000,
    }).trim();
  } catch {
    return null;
  }
}

export function scanGitInfo(root: string): GitInfo | null {
  if (!existsSync(join(root, '.git'))) return null;

  const logRaw = git(['log', '--oneline', '--format=%H|||%s|||%an|||%aI', '-50'], root);
  const recentCommits: GitCommit[] = [];
  if (logRaw) {
    for (const line of logRaw.split('\n')) {
      if (!line.trim()) continue;
      const [hash, message, author, date] = line.split('|||');
      recentCommits.push({ hash, message, author, date });
    }
  }

  const totalRaw = git(['rev-list', '--count', 'HEAD'], root);
  const totalCommits = totalRaw ? parseInt(totalRaw, 10) : 0;

  const branchRaw = git(['branch', '--format=%(refname:short)'], root);
  const branches = branchRaw ? branchRaw.split('\n').filter(Boolean) : [];

  const contributorRaw = git(['log', '--format=%an', '-1000'], root);
  const contributors = contributorRaw
    ? [...new Set(contributorRaw.split('\n').filter(Boolean))]
    : [];

  const currentBranch = git(['branch', '--show-current'], root) ?? 'unknown';

  return { totalCommits, recentCommits, branches, contributors, currentBranch };
}
