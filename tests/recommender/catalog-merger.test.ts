import { describe, it, expect } from 'vitest';
import { mergeCatalogs } from '../../src/recommender/catalog-merger.js';
import type { ResolvedCatalog, CatalogTool, ToolConflict } from '../../src/types/index.js';

function makeTool(name: string, tags: string[] = []): CatalogTool {
  return {
    name,
    repo: `test/${name}`,
    category: 'skill',
    description: `${name} tool`,
    authRequired: false,
    networkRequired: 'none',
    installMethod: 'marketplace',
    installCommands: [],
    prerequisites: [],
    tags,
    maturityFit: ['growing'],
  };
}

function makeResolved(tools: CatalogTool[], relations: ToolConflict[] = [], version = '1.0.0'): ResolvedCatalog {
  return { tools, relations, suggestions: [], source: 'remote', version, stale: false };
}

describe('mergeCatalogs', () => {
  it('merges non-overlapping tools from both catalogs', () => {
    const base = makeResolved([makeTool('a'), makeTool('b')]);
    const custom = makeResolved([makeTool('c'), makeTool('d')]);
    const merged = mergeCatalogs(base, custom);

    expect(merged.tools).toHaveLength(4);
    expect(merged.tools.map(t => t.name)).toEqual(['a', 'b', 'c', 'd']);
    expect(merged.source).toBe('merged');
  });

  it('custom tool overwrites base tool with same name', () => {
    const base = makeResolved([makeTool('shared', ['base-tag'])]);
    const custom = makeResolved([makeTool('shared', ['custom-tag'])]);
    const merged = mergeCatalogs(base, custom);

    expect(merged.tools).toHaveLength(1);
    expect(merged.tools[0].tags).toEqual(['custom-tag']);
  });

  it('returns base tools when custom is empty', () => {
    const base = makeResolved([makeTool('a'), makeTool('b')]);
    const custom = makeResolved([]);
    const merged = mergeCatalogs(base, custom);

    expect(merged.tools).toHaveLength(2);
    expect(merged.tools.map(t => t.name)).toEqual(['a', 'b']);
  });

  it('returns custom tools when base is empty', () => {
    const base = makeResolved([]);
    const custom = makeResolved([makeTool('x')]);
    const merged = mergeCatalogs(base, custom);

    expect(merged.tools).toHaveLength(1);
    expect(merged.tools[0].name).toBe('x');
  });

  it('deduplicates relations by sorted tool pair', () => {
    const rel1: ToolConflict = { tools: ['a', 'b'], relation: 'overlap', resolution: 'base says overlap' };
    const rel2: ToolConflict = { tools: ['b', 'a'], relation: 'conflict', resolution: 'custom says conflict' };
    const base = makeResolved([], [rel1]);
    const custom = makeResolved([], [rel2]);
    const merged = mergeCatalogs(base, custom);

    expect(merged.relations).toHaveLength(1);
    expect(merged.relations[0].resolution).toBe('custom says conflict');
  });

  it('keeps suggestions from base only', () => {
    const base: ResolvedCatalog = {
      ...makeResolved([]),
      suggestions: [{ name: 'suggested', repo: 'x/y', description: 'test', reason: 'r', addedAt: '', matchTags: [], status: 'evaluating' }],
    };
    const custom = makeResolved([]);
    const merged = mergeCatalogs(base, custom);

    expect(merged.suggestions).toHaveLength(1);
    expect(merged.suggestions[0].name).toBe('suggested');
  });

  it('uses base version and stale flag', () => {
    const base: ResolvedCatalog = { ...makeResolved([], [], '2.0.0'), stale: true };
    const custom = makeResolved([], [], '1.0.0');
    const merged = mergeCatalogs(base, custom);

    expect(merged.version).toBe('2.0.0');
    expect(merged.stale).toBe(true);
  });
});
