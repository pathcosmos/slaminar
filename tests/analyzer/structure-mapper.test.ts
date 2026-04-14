import { describe, it, expect } from 'vitest';
import { mapStructure } from '../../src/analyzer/structure-mapper.js';
import type { ProjectSnapshot } from '../../src/types/index.js';

function makeSnapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return {
    root: '/tmp/test', fileTree: [], fileStats: {}, packages: [], git: null,
    existingAiFiles: [], configs: [], ci: [], docs: [], scannedAt: '',
    ...overrides,
  };
}

describe('mapStructure', () => {
  it('detects CLI from commander dep', () => {
    const snap = makeSnapshot({
      packages: [{ manager: 'npm', name: 'x', version: '1.0.0', description: null, scripts: {}, dependencies: ['commander'], devDependencies: [], filePath: 'package.json' }],
      fileStats: { '.ts': 10 },
    });
    expect(mapStructure(snap).pattern).toBe('cli');
  });

  it('detects SPA from React + Vite', () => {
    const snap = makeSnapshot({
      packages: [{ manager: 'npm', name: 'x', version: '1.0.0', description: null, scripts: {}, dependencies: ['react', 'react-dom'], devDependencies: [], filePath: 'package.json' }],
      configs: [{ type: 'vite', path: 'vite.config.ts' }],
      fileStats: { '.tsx': 20 },
    });
    expect(mapStructure(snap).pattern).toBe('spa');
  });

  it('detects test pattern from vitest config', () => {
    const snap = makeSnapshot({
      fileStats: { '.ts': 10 },
      configs: [{ type: 'vitest', path: 'vitest.config.ts' }],
    });
    expect(mapStructure(snap).testPattern).toBeTruthy();
  });

  it('returns unknown for empty', () => {
    expect(mapStructure(makeSnapshot({})).pattern).toBe('unknown');
  });
});
