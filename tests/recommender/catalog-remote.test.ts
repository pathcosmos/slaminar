import { describe, it, expect } from 'vitest';
import { validateCatalogSchema, DEFAULT_CATALOG_URL } from '../../src/recommender/catalog-remote.js';

describe('catalog-remote', () => {
  it('validates correct schema', () => {
    const valid = { version: '1.0.0', minSlaminarVersion: '0.1.0', updatedAt: '2026-01-01', tools: [], suggestions: [], relations: [] };
    expect(validateCatalogSchema(valid)).toBe(true);
  });

  it('rejects missing version', () => {
    expect(validateCatalogSchema({ tools: [], suggestions: [], relations: [] })).toBe(false);
  });

  it('rejects non-array tools', () => {
    expect(validateCatalogSchema({ version: '1', minSlaminarVersion: '0.1', updatedAt: '', tools: 'nope', suggestions: [], relations: [] })).toBe(false);
  });

  it('rejects null', () => { expect(validateCatalogSchema(null)).toBe(false); });
  it('rejects non-object', () => { expect(validateCatalogSchema('string')).toBe(false); });

  it('DEFAULT_CATALOG_URL points to GitHub raw', () => {
    expect(DEFAULT_CATALOG_URL).toContain('raw.githubusercontent.com');
    expect(DEFAULT_CATALOG_URL).toContain('catalog.json');
  });
});
