import { describe, expect, it } from 'vitest';
import { formatDiscoveryTable } from '../../src/reporter/discovery-table.js';
import type { DiscoveredProject, DiscoveryResult } from '../../src/types/index.js';

function project(overrides: Partial<DiscoveredProject> = {}): DiscoveredProject {
  return {
    root: '/tmp/demo',
    status: 'new',
    signatures: ['CLAUDE.md'],
    language: 'typescript',
    hasClaudeMd: true,
    claudeMdLines: 42,
    slaminarVersion: null,
    suggestedAction: 'init',
    ...overrides,
  };
}

function result(projects: DiscoveredProject[]): DiscoveryResult {
  return {
    roots: ['/tmp'],
    projects,
    totalCandidatesChecked: 10,
    excludedDirs: 2,
    scannedAt: new Date().toISOString(),
    elapsedMs: 7,
  };
}

// cli-table3 emits ANSI escape codes; these helpers strip them so we can
// assert against plain text without coupling tests to chalk internals.
function stripAnsi(s: string): string {
  return s.replace(/\u001B\[[0-9;]*m/g, '');
}

describe('reporter/discovery-table', () => {
  it('emits a "no projects found" message for empty results', () => {
    const out = stripAnsi(formatDiscoveryTable(result([])));
    expect(out).toMatch(/No Claude Code projects/);
  });

  it('renders all four status labels in the table', () => {
    const out = stripAnsi(
      formatDiscoveryTable(
        result([
          project({ root: '/p/new', status: 'new', suggestedAction: 'init' }),
          project({
            root: '/p/cfg',
            status: 'configured',
            suggestedAction: 'update',
            signatures: ['slaminar-config'],
            slaminarVersion: '0.6.0',
          }),
          project({
            root: '/p/ex',
            status: 'existing',
            suggestedAction: 'init-merge',
          }),
          project({
            root: '/p/un',
            status: 'unsupported',
            suggestedAction: 'skip',
            language: null,
            hasClaudeMd: false,
            claudeMdLines: null,
            signatures: [],
          }),
        ]),
      ),
    );
    expect(out).toMatch(/new/);
    expect(out).toMatch(/configured/);
    expect(out).toMatch(/existing/);
    expect(out).toMatch(/unsupported/);
    expect(out).toMatch(/init\+m/); // truncated label for init-merge
    expect(out).toMatch(/4 project\(s\)/);
  });

  it('includes the scanned / excluded / elapsed footer', () => {
    const out = stripAnsi(formatDiscoveryTable(result([project()])));
    expect(out).toMatch(/scanned 10 dirs/);
    expect(out).toMatch(/excluded 2/);
    expect(out).toMatch(/elapsed 7ms/);
  });
});
