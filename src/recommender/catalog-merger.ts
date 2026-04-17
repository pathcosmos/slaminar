import type {
  CatalogFetchState,
  CatalogSource,
  CatalogSourceTrace,
  CatalogTool,
  ResolvedCatalog,
  ToolConflict,
} from '../types/index.js';

export function mergeCatalogs(
  base: ResolvedCatalog,
  custom: ResolvedCatalog,
): ResolvedCatalog {
  // Tools: base first, custom overwrites by name
  const toolMap = new Map<string, CatalogTool>();
  for (const tool of base.tools) {
    toolMap.set(tool.name, tool);
  }
  for (const tool of custom.tools) {
    toolMap.set(tool.name, tool);
  }

  // Relations: merge + deduplicate by sorted tool pair
  const relationKey = (r: ToolConflict) => [...r.tools].sort().join('|');
  const relationMap = new Map<string, ToolConflict>();
  for (const r of base.relations) {
    relationMap.set(relationKey(r), r);
  }
  for (const r of custom.relations) {
    relationMap.set(relationKey(r), r);
  }

  return {
    tools: [...toolMap.values()],
    relations: [...relationMap.values()],
    suggestions: base.suggestions,
    source: 'merged',
    version: base.version,
    stale: base.stale,
  };
}

// v0.8 — N-way merge honoring per-source replace semantics. Layers come in
// sorted ascending by priority (lower first). A higher-priority layer in
// `replace` mode shadows every lower layer entirely; all higher layers above
// it continue to apply as `extend` style on top.

export interface MergeLayer {
  source: CatalogSource;
  resolved: ResolvedCatalog | null;
  state: CatalogFetchState;
}

function traceFrom(layer: MergeLayer): CatalogSourceTrace {
  return {
    id: layer.source.id,
    priority: layer.source.priority,
    scope: layer.source.scope,
    mode: layer.source.mode,
    state: layer.state,
    uri: layer.source.uri,
  };
}

export function mergeCatalogStack(layers: MergeLayer[]): ResolvedCatalog {
  const sorted = [...layers].sort((a, b) => a.source.priority - b.source.priority);

  // Every layer (including failed) contributes to the trace.
  const trace: CatalogSourceTrace[] = sorted.map(traceFrom);

  // A replace-mode layer erases everything strictly below it. Bundled (the
  // priority: -1 always-available fallback) is exempt — it's a last-resort
  // floor, not a stacking participant, and replace semantics don't target it.
  const effective = applyReplaceFloor(sorted);

  const successful = effective.filter((l) => l.resolved && l.state !== 'failed');

  // Bundled is a last-resort participant: keep it only when no real source
  // contributed. This preserves the v0.7 shape where cache/remote hits alone
  // are reported as `source: 'cache'` / `'remote'`, not `'multi'`.
  const isBundled = (l: MergeLayer) => l.source.scope === 'bundled';
  const nonBundledSuccess = successful.filter((l) => !isBundled(l));
  const effectiveSuccessful =
    nonBundledSuccess.length > 0 ? nonBundledSuccess : successful;

  if (effectiveSuccessful.length === 0) {
    // Nothing resolved at all — caller guarantees bundled so this is the
    // dev/test edge case where even the bundled layer is missing.
    return {
      tools: [],
      relations: [],
      suggestions: [],
      source: 'bundled',
      version: '0.0.0',
      stale: true,
      sourceTrace: trace,
    };
  }

  let acc = effectiveSuccessful[0]!.resolved!;
  for (let i = 1; i < effectiveSuccessful.length; i++) {
    acc = mergeCatalogs(acc, effectiveSuccessful[i]!.resolved!);
  }

  const onlyOne = effectiveSuccessful.length === 1;
  return {
    ...acc,
    source: onlyOne ? acc.source : 'multi',
    stale: effectiveSuccessful.some((l) => l.resolved?.stale),
    sourceTrace: trace,
  };
}

/**
 * Walk layers top→bottom; the first enabled `replace` layer blocks everything
 * below it from contributing. Returns the trimmed array in original order.
 */
function applyReplaceFloor(sortedAsc: MergeLayer[]): MergeLayer[] {
  let floor = -Infinity;
  for (let i = sortedAsc.length - 1; i >= 0; i--) {
    const layer = sortedAsc[i]!;
    if (!layer.source.enabled) continue;
    if (layer.state === 'failed') continue;
    if (layer.source.mode === 'replace') {
      floor = layer.source.priority;
      break;
    }
  }
  if (floor === -Infinity) return sortedAsc;
  return sortedAsc.filter((l) => l.source.priority >= floor);
}
