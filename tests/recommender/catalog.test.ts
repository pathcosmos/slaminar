import { describe, it, expect } from 'vitest';
import { getCatalog, findToolByName, getToolsByTag } from '../../src/recommender/catalog.js';

describe('catalog (bundled)', () => {
  it('bundled catalog is intentionally empty since v0.9.6', () => {
    // Every previous bundled entry was either shadowed by the official catalog
    // (same name → official wins on priority) or pointed to a phantom source.
    // Offline first-run falls through to the disk cache instead.
    expect(getCatalog()).toEqual([]);
  });

  it('findToolByName returns null on empty bundled catalog', () => {
    expect(findToolByName('anything')).toBeNull();
    expect(findToolByName('nonexistent')).toBeNull();
  });

  it('getToolsByTag returns empty array on empty bundled catalog', () => {
    expect(getToolsByTag('frontend')).toEqual([]);
    expect(getToolsByTag('any-tag')).toEqual([]);
  });
});
