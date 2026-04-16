import { describe, it, expect } from 'vitest';
import { diffCatalogs, formatDiff } from '../../src/recommender/catalog-diff.js';
import type { CatalogTool } from '../../src/types/index.js';

function makeTool(name: string, overrides: Partial<CatalogTool> = {}): CatalogTool {
  return { name, repo: `u/${name}`, category: 'skill', description: name, authRequired: false, networkRequired: 'none', installMethod: 'marketplace', installCommands: ['i'], prerequisites: [], tags: ['t'], maturityFit: ['growing'], ...overrides };
}

describe('diffCatalogs', () => {
  it('detects added tools', () => {
    const diff = diffCatalogs([makeTool('a')], [makeTool('a'), makeTool('b')]);
    expect(diff.added).toContain('b');
  });
  it('detects removed tools', () => {
    const diff = diffCatalogs([makeTool('a'), makeTool('b')], [makeTool('a')]);
    expect(diff.removed).toContain('b');
  });
  it('detects deprecated tools', () => {
    const diff = diffCatalogs([makeTool('a')], [makeTool('a', { deprecated: true })]);
    expect(diff.deprecated).toContain('a');
  });
  it('detects updated tools', () => {
    const diff = diffCatalogs([makeTool('a', { description: 'old' })], [makeTool('a', { description: 'new' })]);
    expect(diff.updated).toContain('a');
  });
  it('detects version change', () => {
    const diff = diffCatalogs([], [], '1.0.0', '1.1.0');
    expect(diff.versionChange).toEqual({ old: '1.0.0', new: '1.1.0' });
  });
  it('returns empty diff for identical catalogs', () => {
    const tools = [makeTool('a')];
    const diff = diffCatalogs(tools, tools);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });
});

describe('formatDiff', () => {
  it('returns non-empty for non-empty diff', () => {
    const output = formatDiff({ added: ['x'], removed: [], deprecated: [], updated: [], versionChange: null });
    expect(output.length).toBeGreaterThan(0);
  });
  it('returns empty-ish for empty diff', () => {
    const output = formatDiff({ added: [], removed: [], deprecated: [], updated: [], versionChange: null });
    expect(output).toContain('No changes');
  });
});
