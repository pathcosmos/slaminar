import { describe, it, expect } from 'vitest';
import { extractConventions } from '../../src/analyzer/convention-extractor.js';
import type { ProjectSnapshot } from '../../src/types/index.js';

function makeSnapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return { root: '/tmp/test', fileTree: [], fileStats: {}, packages: [], git: null, existingAiFiles: [], configs: [], ci: [], docs: [], scannedAt: '', ...overrides };
}

describe('extractConventions', () => {
  it('detects vitest', () => {
    expect(extractConventions(makeSnapshot({ configs: [{ type: 'vitest', path: 'vitest.config.ts' }] })).testFramework).toBe('vitest');
  });
  it('detects eslint', () => {
    expect(extractConventions(makeSnapshot({ configs: [{ type: 'eslint', path: 'eslint.config.js' }] })).linter).toBe('eslint');
  });
  it('detects conventional commits', () => {
    const snap = makeSnapshot({
      git: { totalCommits: 5, recentCommits: [
        { hash: 'a', message: 'feat: add', author: 'A', date: '' },
        { hash: 'b', message: 'fix: bug', author: 'A', date: '' },
        { hash: 'c', message: 'chore: clean', author: 'A', date: '' },
      ], branches: [], contributors: [], currentBranch: 'main' },
    });
    expect(extractConventions(snap).commitStyle).toBe('conventional');
  });
  it('detects Korean docs', () => {
    expect(extractConventions(makeSnapshot({ docs: [{ type: 'readme', path: 'README.ko.md', lineCount: 100 }] })).docLanguage).toBe('ko');
  });
});
