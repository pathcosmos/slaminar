import type { ProjectSnapshot, ProjectMaturity } from '../types/index.js';

export function detectMaturity(snapshot: ProjectSnapshot): ProjectMaturity {
  const { git, packages, fileTree, ci } = snapshot;
  const hasGit = git !== null;
  const hasPackages = packages.length > 0;
  const hasFiles = fileTree.length > 0;

  // No git, no packages, no files -> greenfield
  if (!hasGit && !hasPackages && !hasFiles) return 'greenfield';

  const commits = git?.totalCommits ?? 0;
  const contributors = git?.contributors.length ?? 0;
  const hasCi = ci.length > 0;

  // Mature: >= 200 commits or (5+ contributors with CI)
  if (commits >= 200 || (contributors >= 5 && hasCi)) return 'mature';

  // Early: < 10 commits
  if (commits < 10) return 'early';

  // Otherwise growing
  return 'growing';
}
