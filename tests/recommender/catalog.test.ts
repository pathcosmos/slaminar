import { describe, it, expect } from 'vitest';
import { getCatalog, findToolByName, getToolsByTag } from '../../src/recommender/catalog.js';

describe('catalog', () => {
  it('returns non-empty catalog', () => {
    expect(getCatalog().length).toBeGreaterThan(5);
  });

  it('all tools have required fields', () => {
    for (const tool of getCatalog()) {
      expect(tool.name).toBeTruthy();
      expect(tool.repo).toBeTruthy();
      expect(tool.installMethod).toBeTruthy();
      expect(tool.installCommands.length).toBeGreaterThan(0);
      expect(typeof tool.authRequired).toBe('boolean');
    }
  });

  it('finds tool by name', () => {
    const tool = findToolByName('caveman');
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('caveman');
  });

  it('returns null for unknown tool', () => {
    expect(findToolByName('nonexistent')).toBeNull();
  });

  it('finds tools by tag', () => {
    const tools = getToolsByTag('frontend');
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every(t => t.tags.includes('frontend'))).toBe(true);
  });

  it('has auth-required tools for exclusion testing', () => {
    const authTools = getCatalog().filter(t => t.authRequired);
    expect(authTools.length).toBeGreaterThan(0);
  });
});
