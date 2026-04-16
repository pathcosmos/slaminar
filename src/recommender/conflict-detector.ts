import type { CatalogTool, ToolConflict } from '../types/index.js';

const KNOWN_RELATIONS: ToolConflict[] = [
  { tools: ['caveman', 'everything-claude-code'], relation: 'overlap', resolution: 'both provide token optimization — pick one', winner: 'everything-claude-code' },
  { tools: ['planning-with-files', 'get-shit-done'], relation: 'synergy', resolution: 'planning + execution complement each other' },
  { tools: ['graphify', 'cartographer'], relation: 'overlap', resolution: 'both map codebases — graphify for large, cartographer for small', winner: undefined },
  { tools: ['claude-mem', 'everything-claude-code'], relation: 'synergy', resolution: 'memory + performance optimization complement each other' },
];

export function detectConflicts(tools: CatalogTool[], externalRelations?: ToolConflict[]): ToolConflict[] {
  const names = new Set(tools.map(t => t.name));
  const relations = (externalRelations && externalRelations.length > 0) ? externalRelations : KNOWN_RELATIONS;
  return relations.filter(r => names.has(r.tools[0]) && names.has(r.tools[1]));
}
