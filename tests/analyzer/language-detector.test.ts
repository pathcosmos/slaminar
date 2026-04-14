import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../../src/analyzer/language-detector.js';
import type { ProjectSnapshot } from '../../src/types/index.js';

function makeSnapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return {
    root: '/tmp/test', fileTree: [], fileStats: {}, packages: [], git: null,
    existingAiFiles: [], configs: [], ci: [], docs: [], scannedAt: '',
    ...overrides,
  };
}

describe('detectLanguage', () => {
  it('detects TypeScript as primary from file stats', () => {
    const snap = makeSnapshot({ fileStats: { '.ts': 50, '.tsx': 10, '.css': 5 } });
    const result = detectLanguage(snap);
    expect(result.primary).toBe('typescript');
    expect(result.secondary).toContain('css');
  });

  it('detects React framework from deps', () => {
    const snap = makeSnapshot({
      fileStats: { '.tsx': 30, '.ts': 20 },
      packages: [{
        manager: 'npm', name: 'test', version: '1.0.0', description: null,
        scripts: {}, dependencies: ['react', 'react-dom'], devDependencies: [],
        filePath: 'package.json',
      }],
    });
    expect(detectLanguage(snap).framework).toBe('react');
  });

  it('detects Vite build tool from configs', () => {
    const snap = makeSnapshot({
      fileStats: { '.ts': 10 },
      configs: [{ type: 'vite', path: 'vite.config.ts' }],
    });
    expect(detectLanguage(snap).buildTool).toBe('vite');
  });

  it('detects Python', () => {
    const snap = makeSnapshot({ fileStats: { '.py': 30, '.txt': 2 } });
    expect(detectLanguage(snap).primary).toBe('python');
  });

  it('detects Rust from Cargo', () => {
    const snap = makeSnapshot({
      fileStats: { '.rs': 20 },
      packages: [{ manager: 'cargo', name: 'x', version: '0.1.0', description: null, scripts: {}, dependencies: [], devDependencies: [], filePath: 'Cargo.toml' }],
    });
    expect(detectLanguage(snap).primary).toBe('rust');
  });

  it('returns unknown for empty', () => {
    expect(detectLanguage(makeSnapshot({})).primary).toBe('unknown');
  });
});
