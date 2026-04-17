import { describe, it, expect } from 'vitest';
import { mergeCatalogs, mergeCatalogStack, type MergeLayer } from '../../src/recommender/catalog-merger.js';
import type { CatalogSource, ResolvedCatalog, CatalogTool, ToolConflict } from '../../src/types/index.js';

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

// ─── v0.8 — N-way stack merge ────────────────────────────────

function makeSource(id: string, priority: number, mode: 'extend' | 'replace' = 'extend', scope: CatalogSource['scope'] = 'user'): CatalogSource {
  return {
    id,
    type: 'url',
    uri: `https://${id}.example/c.json`,
    priority,
    mode,
    enabled: true,
    trust: 'trusted',
    addedAt: '1970-01-01T00:00:00.000Z',
    scope,
  };
}

function okLayer(id: string, priority: number, tools: CatalogTool[], mode: 'extend' | 'replace' = 'extend', scope: CatalogSource['scope'] = 'user'): MergeLayer {
  return { source: makeSource(id, priority, mode, scope), resolved: makeResolved(tools), state: 'remote' };
}

function bundledLayer(tools: CatalogTool[]): MergeLayer {
  return {
    source: { ...makeSource('bundled', -1, 'extend'), scope: 'bundled' },
    resolved: { ...makeResolved(tools), source: 'bundled' },
    state: 'bundled',
  };
}

describe('mergeCatalogStack', () => {
  it('collapses to a single-source result when only bundled succeeds', () => {
    const out = mergeCatalogStack([bundledLayer([makeTool('bundled-only')])]);
    expect(out.source).toBe('bundled');
    expect(out.tools.map((t) => t.name)).toEqual(['bundled-only']);
    expect(out.sourceTrace).toHaveLength(1);
  });

  it('treats bundled as last-resort — higher layers eclipse it in the merge', () => {
    const out = mergeCatalogStack([
      bundledLayer([makeTool('fallback')]),
      okLayer('official', 0, [makeTool('official-a'), makeTool('official-b')]),
    ]);
    expect(out.tools.map((t) => t.name).sort()).toEqual(['official-a', 'official-b']);
    // Single non-bundled source means the result keeps that source label.
    expect(out.source).toBe('remote');
  });

  it('stacks ascending priority — higher wins collisions', () => {
    const out = mergeCatalogStack([
      okLayer('official', 0, [makeTool('shared', ['low'])]),
      okLayer('company', 200, [makeTool('shared', ['high']), makeTool('extra')]),
    ]);
    const shared = out.tools.find((t) => t.name === 'shared');
    expect(shared!.tags).toEqual(['high']);
    expect(out.source).toBe('multi');
    expect(out.tools.map((t) => t.name).sort()).toEqual(['extra', 'shared']);
  });

  it('replace floor drops all lower-priority layers', () => {
    const out = mergeCatalogStack([
      okLayer('official', 0, [makeTool('official-only')]),
      okLayer('security', 200, [makeTool('allowed')], 'replace'),
      okLayer('personal', 100, [makeTool('dropped')]),
    ]);
    const names = out.tools.map((t) => t.name).sort();
    expect(names).toEqual(['allowed']);
  });

  it('trace records every input layer, including failed ones', () => {
    const failed: MergeLayer = {
      source: makeSource('env-fail', 500),
      resolved: null,
      state: 'failed',
    };
    const out = mergeCatalogStack([
      bundledLayer([makeTool('b')]),
      okLayer('official', 0, [makeTool('o')]),
      failed,
    ]);
    expect(out.sourceTrace).toHaveLength(3);
    const states = out.sourceTrace!.map((t) => t.state).sort();
    expect(states).toContain('failed');
  });

  it('surfaces stale flag when any contributing layer is stale', () => {
    const staleLayer: MergeLayer = {
      source: makeSource('team', 200),
      resolved: { ...makeResolved([makeTool('t')]), stale: true, source: 'cache' },
      state: 'stale',
    };
    const out = mergeCatalogStack([bundledLayer([]), staleLayer]);
    expect(out.stale).toBe(true);
  });
});
