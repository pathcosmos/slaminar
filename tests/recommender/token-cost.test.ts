import { describe, it, expect } from 'vitest';
import { inferTokenCost, resolveTokenCost, isOverridden } from '../../src/recommender/token-cost.js';
import type { CatalogTool } from '../../src/types/index.js';

function makeTool(overrides: Partial<CatalogTool> = {}): CatalogTool {
  return {
    name: 'sample',
    repo: 'example/sample',
    category: 'skill',
    description: '',
    authRequired: false,
    networkRequired: 'none',
    installMethod: 'npx',
    installCommands: [],
    prerequisites: [],
    tags: [],
    maturityFit: ['greenfield', 'early', 'growing', 'mature'],
    ...overrides,
  };
}

describe('inferTokenCost', () => {
  it('hooks are always low', () => {
    expect(inferTokenCost(makeTool({ category: 'hook' }))).toBe('low');
    expect(inferTokenCost(makeTool({ category: 'hook', tags: ['monitoring'] }))).toBe('high');
    // Note: heavy tags still promote to high — hooks don't escape the 'monitoring'
    // signal. This is intentional: a "monitoring hook" is not a trivial hook.
  });

  it('browser/e2e tags promote to high regardless of category', () => {
    expect(inferTokenCost(makeTool({ category: 'skill', tags: ['frontend', 'browser'] }))).toBe('high');
    expect(inferTokenCost(makeTool({ category: 'workflow', tags: ['e2e', 'playwright'] }))).toBe('high');
  });

  it('orchestration/multi-agent tags promote to high', () => {
    expect(inferTokenCost(makeTool({ category: 'agent', tags: ['orchestration'] }))).toBe('high');
    expect(inferTokenCost(makeTool({ category: 'agent', tags: ['multi-agent'] }))).toBe('high');
    expect(inferTokenCost(makeTool({ category: 'plugin', tags: ['multi-model'] }))).toBe('high');
  });

  it('memory-heavy tags (knowledge-graph, large-codebase, long-running) promote to high', () => {
    expect(inferTokenCost(makeTool({ tags: ['knowledge-graph'] }))).toBe('high');
    expect(inferTokenCost(makeTool({ tags: ['large-codebase'] }))).toBe('high');
    expect(inferTokenCost(makeTool({ tags: ['long-running'] }))).toBe('high');
  });

  it('LSP/static-analysis tags promote to high (persistent attach)', () => {
    expect(inferTokenCost(makeTool({ category: 'plugin', tags: ['lsp'] }))).toBe('high');
    expect(inferTokenCost(makeTool({ tags: ['static-analysis'] }))).toBe('high');
  });

  it('light tags (token-saving, notification, lightweight) demote to low', () => {
    expect(inferTokenCost(makeTool({ category: 'plugin', tags: ['token-saving'] }))).toBe('low');
    expect(inferTokenCost(makeTool({ category: 'plugin', tags: ['notification', 'alerts'] }))).toBe('low');
    expect(inferTokenCost(makeTool({ category: 'skill', tags: ['simplicity'] }))).toBe('low');
  });

  it('plain skill/agent/workflow/plugin default to medium', () => {
    expect(inferTokenCost(makeTool({ category: 'skill', tags: ['backend'] }))).toBe('medium');
    expect(inferTokenCost(makeTool({ category: 'agent', tags: ['universal'] }))).toBe('medium');
    expect(inferTokenCost(makeTool({ category: 'workflow', tags: ['templates'] }))).toBe('medium');
    expect(inferTokenCost(makeTool({ category: 'plugin', tags: ['ui'] }))).toBe('medium');
  });
});

describe('resolveTokenCost', () => {
  it('catalog override wins over heuristic', () => {
    const t = makeTool({ category: 'hook', tokenCost: 'high', tokenCostRationale: 'runs on every keystroke' });
    expect(resolveTokenCost(t)).toBe('high');
    // Without override, same tool would be 'low' (hook).
    expect(inferTokenCost({ ...t, tokenCost: undefined })).toBe('low');
  });

  it('without override, falls back to heuristic', () => {
    const t = makeTool({ category: 'hook' });
    expect(resolveTokenCost(t)).toBe('low');
  });
});

describe('isOverridden', () => {
  it('detects explicit tokenCost field', () => {
    expect(isOverridden(makeTool({ tokenCost: 'low' }))).toBe(true);
    expect(isOverridden(makeTool())).toBe(false);
  });
});
