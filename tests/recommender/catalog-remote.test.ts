import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import {
  validateCatalogSchema,
  DEFAULT_CATALOG_URL,
  fetchLocalCatalog,
} from '../../src/recommender/catalog-remote.js';

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

describe('catalog-remote — fetchLocalCatalog (v0.8.5)', () => {
  let tmpDir: string;
  const validCatalog = {
    version: '1.0.0',
    minSlaminarVersion: '0.8.5',
    updatedAt: '2026-04-17',
    tools: [
      {
        name: 'local-test-tool',
        repo: 'me/local-test-tool',
        category: 'skill',
        description: 'Loaded from a local catalog',
        authRequired: false,
        networkRequired: 'none',
        installMethod: 'git-clone',
        installCommands: ['git clone https://github.com/me/local-test-tool'],
        prerequisites: [],
        tags: ['test'],
        maturityFit: ['greenfield'],
      },
    ],
    suggestions: [],
    relations: [],
  };

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'slaminar-local-catalog-'));
  });

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('loads a catalog from an absolute path', async () => {
    const path = join(tmpDir, 'catalog.json');
    writeFileSync(path, JSON.stringify(validCatalog), 'utf-8');

    const result = await fetchLocalCatalog(path);

    expect(result.notModified).toBe(false);
    expect(result.catalog.tools).toHaveLength(1);
    expect(result.catalog.tools[0].name).toBe('local-test-tool');
  });

  it('loads a catalog from a file:// URI', async () => {
    const path = join(tmpDir, 'catalog.json');
    writeFileSync(path, JSON.stringify(validCatalog), 'utf-8');

    const result = await fetchLocalCatalog(`file://${path}`);

    expect(result.catalog.tools[0].name).toBe('local-test-tool');
  });

  it('expands ~/ to the home directory', async () => {
    // Write a file directly under HOME so we can reference it with ~/.
    // Use a uniquely-named file to avoid clobbering anything real.
    const fileName = `.slaminar-test-catalog-${process.pid}-${Date.now()}.json`;
    const absolutePath = join(homedir(), fileName);
    writeFileSync(absolutePath, JSON.stringify(validCatalog), 'utf-8');

    try {
      const result = await fetchLocalCatalog(`~/${fileName}`);
      expect(result.catalog.tools[0].name).toBe('local-test-tool');
    } finally {
      try { rmSync(absolutePath, { force: true }); } catch { /* ignore */ }
    }
  });

  it('throws when the file does not match the catalog schema', async () => {
    const path = join(tmpDir, 'bad.json');
    writeFileSync(path, JSON.stringify({ hello: 'world' }), 'utf-8');

    await expect(fetchLocalCatalog(path)).rejects.toThrow(/does not match expected schema/);
  });
});
