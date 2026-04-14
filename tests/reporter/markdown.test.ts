import { describe, it, expect } from 'vitest';
import { generateReport, saveReport } from '../../src/reporter/markdown.js';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('markdown reporter', () => {
  const mockResult = {
    profile: {
      name: 'test-app', description: 'A test', maturity: 'growing' as const,
      language: { primary: 'typescript', secondary: [], framework: 'react', runtime: 'node', buildTool: 'vite' },
      structure: { pattern: 'spa' as const, entryPoints: [], testPattern: null, srcLayout: 'feature-based' as const },
      conventions: { naming: 'camelCase' as const, testFramework: 'vitest', linter: 'eslint', formatter: null, commitStyle: 'conventional' as const, docLanguage: 'en' },
      dependencies: { total: 10, notable: [], devTools: [] },
      existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    },
    recommendation: {
      recommended: [
        { tool: { name: 'caveman', repo: '', category: 'skill' as const, description: '', authRequired: false, networkRequired: 'none' as const, installMethod: 'marketplace' as const, installCommands: ['install'], prerequisites: [], tags: [], maturityFit: [] }, score: 85, reasons: ['token saving'] },
      ],
      excluded: [
        { tool: { name: 'bad-tool', repo: '', category: 'skill' as const, description: '', authRequired: true, networkRequired: 'none' as const, installMethod: 'marketplace' as const, installCommands: [], prerequisites: [], tags: [], maturityFit: [] }, reason: 'requires auth' },
      ],
      conflicts: [],
      maxTools: 5,
    },
    plan: { targets: [{ path: 'CLAUDE.md', content: '', mode: 'create' as const }], backups: [], toolInstalls: [] },
    writtenFiles: ['CLAUDE.md'],
    backedUpFiles: [],
  };

  it('generates markdown with project name', () => {
    const md = generateReport(mockResult);
    expect(md).toContain('test-app');
  });

  it('includes profile table', () => {
    const md = generateReport(mockResult);
    expect(md).toContain('typescript');
    expect(md).toContain('react');
  });

  it('includes recommended tools', () => {
    const md = generateReport(mockResult);
    expect(md).toContain('caveman');
    expect(md).toContain('85');
  });

  it('includes excluded tools', () => {
    const md = generateReport(mockResult);
    expect(md).toContain('bad-tool');
    expect(md).toContain('requires auth');
  });

  it('saves report to disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-report-'));
    try {
      const path = saveReport(dir, '# Report\ncontent');
      expect(existsSync(join(dir, path))).toBe(true);
      expect(path).toMatch(/\.slaminar\/reports\/\d{4}-\d{2}-\d{2}-init\.md/);
    } finally { rmSync(dir, { recursive: true }); }
  });
});
