import type { ResolvedCatalog, CatalogTool, ToolConflict } from '../types/index.js';

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
