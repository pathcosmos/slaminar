import { describe, it, expect } from 'vitest';
import { checkToolInstalled, installTools } from '../../src/recommender/installer.js';
import type { CatalogTool } from '../../src/types/index.js';

function makeTool(overrides: Partial<CatalogTool> = {}): CatalogTool {
  return {
    name: 'test-tool', repo: 'user/repo', category: 'skill', description: 'test',
    authRequired: false, networkRequired: 'none', installMethod: 'marketplace',
    installCommands: ['echo test-install'], prerequisites: [], tags: [],
    maturityFit: ['growing', 'mature'],
    ...overrides,
  };
}

describe('installer', () => {
  it('checkToolInstalled returns false for unknown tool', () => {
    const tool = makeTool({ name: 'nonexistent-slaminar-tool-xyz' });
    expect(checkToolInstalled(tool)).toBe(false);
  });

  it('installTools handles empty array', () => {
    const results = installTools([]);
    expect(results).toEqual([]);
  });

  it('installTools returns results for each tool', () => {
    // Using echo as a safe command that exists
    const tools = [
      makeTool({ name: 'test1', installCommands: ['echo hello'] }),
      makeTool({ name: 'test2', installCommands: ['echo world'] }),
    ];
    const results = installTools(tools);
    expect(results).toHaveLength(2);
    expect(results[0].tool).toBe('test1');
    expect(results[1].tool).toBe('test2');
  });

  it('handles install failure gracefully', () => {
    const tool = makeTool({
      name: 'fail-tool',
      installCommands: ['nonexistent-binary-xyz --fail'],
    });
    const results = installTools([tool]);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBeTruthy();
  });
});
