import { describe, it, expect } from 'vitest';
import { formatInitReport } from '../../src/reporter/terminal.js';

describe('formatInitReport', () => {
  const mockResult = {
    profile: {
      name: 'test-app', description: 'A test', maturity: 'growing' as const,
      language: { primary: 'typescript', secondary: ['css'], framework: 'react', runtime: 'node', buildTool: 'vite' },
      structure: { pattern: 'spa' as const, entryPoints: [], testPattern: null, srcLayout: 'feature-based' as const },
      conventions: { naming: 'camelCase' as const, testFramework: 'vitest', linter: 'eslint', formatter: null, commitStyle: 'conventional' as const, docLanguage: 'ko' },
      dependencies: { total: 10, notable: [], devTools: [] },
      existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    },
    recommendation: {
      recommended: [
        { tool: { name: 'caveman', repo: '', category: 'skill' as const, description: '', authRequired: false, networkRequired: 'none' as const, installMethod: 'marketplace' as const, installCommands: ['install caveman'], prerequisites: [], tags: [], maturityFit: [] }, score: 85, reasons: ['token saving'] },
      ],
      excluded: [],
      conflicts: [],
      maxTools: 5,
    },
    plan: { targets: [], backups: [], toolInstalls: [] },
    writtenFiles: ['CLAUDE.md', '.claude/plugins/slaminar-generated/plugin.json'],
    backedUpFiles: [],
  };

  it('includes project name', () => {
    const output = formatInitReport(mockResult);
    expect(output).toContain('test-app');
  });

  it('includes language info', () => {
    const output = formatInitReport(mockResult);
    expect(output).toContain('typescript');
  });

  it('lists generated files', () => {
    const output = formatInitReport(mockResult);
    expect(output).toContain('CLAUDE.md');
  });

  it('lists recommended tools', () => {
    const output = formatInitReport(mockResult);
    expect(output).toContain('caveman');
  });

  it('returns non-empty string', () => {
    expect(formatInitReport(mockResult).length).toBeGreaterThan(50);
  });
});
