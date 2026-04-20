import type { CatalogTool } from '../types/index.js';

// Bundled catalog intentionally empty — the v0.9.6 audit found every prior
// bundled entry was either shadowed by the official catalog (same `name`) or
// pointed to a phantom source (404 on GitHub / npm / PyPI). Offline first-run
// now falls through to the on-disk cache written by the first successful
// official fetch. See catalog-sources.ts priority layering.
const BUNDLED_CATALOG: CatalogTool[] = [];

export function getCatalog(): CatalogTool[] {
  return BUNDLED_CATALOG;
}

export function findToolByName(name: string): CatalogTool | null {
  return BUNDLED_CATALOG.find((t) => t.name === name) ?? null;
}

export function getToolsByTag(tag: string): CatalogTool[] {
  return BUNDLED_CATALOG.filter((t) => t.tags.includes(tag));
}

export { resolveCatalog } from './catalog-resolver.js';
