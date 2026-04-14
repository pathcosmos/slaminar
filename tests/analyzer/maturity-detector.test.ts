import { describe, it, expect } from 'vitest';
import { detectMaturity } from '../../src/analyzer/maturity-detector.js';
import type { ProjectSnapshot } from '../../src/types/index.js';

function makeSnapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return { root: '/tmp/test', fileTree: [], fileStats: {}, packages: [], git: null, existingAiFiles: [], configs: [], ci: [], docs: [], scannedAt: '', ...overrides };
}

describe('detectMaturity', () => {
  it('greenfield', () => { expect(detectMaturity(makeSnapshot({}))).toBe('greenfield'); });
  it('early (< 10 commits)', () => {
    expect(detectMaturity(makeSnapshot({
      git: { totalCommits: 3, recentCommits: [], branches: ['main'], contributors: ['A'], currentBranch: 'main' },
      packages: [{ manager: 'npm', name: 'x', version: '1.0.0', description: null, scripts: {}, dependencies: [], devDependencies: [], filePath: 'package.json' }],
    }))).toBe('early');
  });
  it('growing', () => {
    expect(detectMaturity(makeSnapshot({
      git: { totalCommits: 50, recentCommits: [], branches: ['main'], contributors: ['A', 'B'], currentBranch: 'main' },
      packages: [{ manager: 'npm', name: 'x', version: '1.0.0', description: null, scripts: {}, dependencies: [], devDependencies: [], filePath: 'package.json' }],
    }))).toBe('growing');
  });
  it('mature', () => {
    expect(detectMaturity(makeSnapshot({
      git: { totalCommits: 500, recentCommits: [], branches: ['main', 'dev'], contributors: ['A', 'B', 'C', 'D', 'E'], currentBranch: 'main' },
      ci: [{ platform: 'github-actions', path: '.github/workflows/ci.yml' }],
    }))).toBe('mature');
  });
});
