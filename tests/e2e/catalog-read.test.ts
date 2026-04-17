import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, makeTmpDir, runCli } from './_helpers.js';

/**
 * E2E: read-only catalog commands — `list`, `search`, `check`, `info`, `status`.
 *
 * Each test gets an isolated tmp HOME (helper default). With no cache and no
 * network, `resolveCatalog` falls back to the bundled catalog, which is good
 * enough for structural assertions (known tools, table format, etc.).
 *
 * We force `SLAMINAR_CATALOG_URL=''` to keep the fallback path deterministic.
 */
describe('e2e: catalog read-only commands', () => {
  let tmp: string;
  const env = { SLAMINAR_CATALOG_URL: '' };

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-catalog-read-');
  });

  afterEach(() => cleanup(tmp));

  it('catalog list — exits 0 and renders a tool table containing a known tool', async () => {
    const res = await runCli(['catalog', 'list'], { cwd: tmp, env });
    expect(res.exitCode).toBe(0);
    // Bundled catalog includes `wshobson/agents` and `playwright-skill`.
    expect(res.stdout).toMatch(/wshobson\/agents|playwright-skill/);
    // Standard table headers
    expect(res.stdout).toMatch(/Name/);
    expect(res.stdout).toMatch(/Category/);
  });

  it('catalog search — returns matching tools for a keyword', async () => {
    const res = await runCli(['catalog', 'search', 'playwright'], { cwd: tmp, env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/playwright/i);
  });

  it('catalog search — empty result prints a friendly "no tools matching" message', async () => {
    const res = await runCli(['catalog', 'search', 'zzznonexistenttoolname'], { cwd: tmp, env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/No tools matching/i);
  });

  it('catalog check — exits 0 and prints either a deprecation summary or a clean message', async () => {
    const res = await runCli(['catalog', 'check'], { cwd: tmp, env });
    expect(res.exitCode).toBe(0);
    // Either "No deprecated tools" or a list of N deprecated tool(s).
    expect(res.stdout).toMatch(/No deprecated tools|deprecated tool\(s\)/);
  });

  it('catalog info <known-tool> — multi-line block with Repo / Category / Description', async () => {
    const res = await runCli(['catalog', 'info', 'wshobson/agents'], { cwd: tmp, env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/Repo:/);
    expect(res.stdout).toMatch(/Category:/);
    expect(res.stdout).toMatch(/Description:/);
    expect(res.stdout).toMatch(/Install:/);
  });

  it('catalog info <unknown-tool> — exit 1 with "not found"', async () => {
    const res = await runCli(['catalog', 'info', 'does-not-exist-zzz'], { cwd: tmp, env });
    expect(res.exitCode).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/not found/i);
  });

  it('catalog status — with no cache prints guidance to run catalog update', async () => {
    const res = await runCli(['catalog', 'status'], { cwd: tmp, env });
    expect(res.exitCode).toBe(0);
    // Fresh HOME → no cache.
    expect(res.stdout).toMatch(/No catalog cache|Catalog Cache Status/);
  });
});
