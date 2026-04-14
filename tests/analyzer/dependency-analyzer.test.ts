import { describe, it, expect } from 'vitest';
import { analyzeDependencies } from '../../src/analyzer/dependency-analyzer.js';
import type { ProjectSnapshot } from '../../src/types/index.js';

function makeSnapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return { root: '/tmp/test', fileTree: [], fileStats: {}, packages: [], git: null, existingAiFiles: [], configs: [], ci: [], docs: [], scannedAt: '', ...overrides };
}

describe('analyzeDependencies', () => {
  it('identifies notable deps', () => {
    const snap = makeSnapshot({
      packages: [{ manager: 'npm', name: 'test', version: '1.0.0', description: null, scripts: {}, dependencies: ['react', '@anthropic-ai/sdk'], devDependencies: ['vitest', 'typescript'], filePath: 'package.json' }],
    });
    const result = analyzeDependencies(snap);
    expect(result.total).toBe(4);
    expect(result.notable.some(d => d.name === '@anthropic-ai/sdk')).toBe(true);
    expect(result.devTools).toContain('vitest');
  });
  it('returns empty for no packages', () => {
    expect(analyzeDependencies(makeSnapshot({})).total).toBe(0);
  });
});
