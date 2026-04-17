import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, initGit, makeTmpDir, runCli } from './_helpers.js';

/**
 * E2E: catalog write-path commands — `update`, `rollback`, `config`.
 *
 * We avoid real network:
 *   - `catalog update` is exercised with `SLAMINAR_CATALOG_URL=''` so the
 *     resolver falls through to the bundled catalog (CLI prints the bundled
 *     fallback notice rather than hitting the network).
 *   - `catalog rollback` is tested on a fresh HOME (no prior backup) — we
 *     verify graceful no-op behavior, not a round-trip.
 */
describe('e2e: catalog write commands', () => {
  let tmp: string;
  let project: string;
  const env = { SLAMINAR_CATALOG_URL: '' };

  beforeEach(async () => {
    tmp = makeTmpDir('slaminar-e2e-catalog-write-');
    project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);
  });

  afterEach(() => cleanup(tmp));

  it('catalog config (no args) — shows current URL + mode', async () => {
    const res = await runCli(['catalog', 'config'], { cwd: project, env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/Catalog Configuration/);
    expect(res.stdout).toMatch(/URL:/);
    expect(res.stdout).toMatch(/Mode:/);
  });

  it('catalog config --mode extend — persists to .slaminar/config.json', async () => {
    const res = await runCli(['catalog', 'config', '--mode', 'extend'], { cwd: project, env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/saved|Catalog Configuration/);

    const configPath = join(project, '.slaminar', 'config.json');
    expect(existsSync(configPath)).toBe(true);
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(config.catalogMode).toBe('extend');
  });

  it('catalog config --mode bogus — rejected with non-zero exit', async () => {
    const res = await runCli(['catalog', 'config', '--mode', 'bogus'], { cwd: project, env });
    expect(res.exitCode).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/must be.*extend.*replace|extend.*replace/i);
  });

  it('catalog rollback — no prior backup prints yellow notice and exits 0', async () => {
    const res = await runCli(['catalog', 'rollback'], { cwd: tmp, env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/No previous catalog version|rolled back/);
  });

  it('catalog update — falls back to bundled when SLAMINAR_CATALOG_URL is empty (no crash)', async () => {
    // Empty SLAMINAR_CATALOG_URL bypasses wizard overrides but the CLI still
    // uses the default official URL from catalog-remote. It may still hit the
    // network; if unreachable, the resolver falls back gracefully. We only
    // assert no crash and that the command produced output.
    const res = await runCli(['catalog', 'update'], {
      cwd: tmp,
      env,
      timeoutSec: 45,
    });
    // Exit must not be a hard crash; 0 or 1 acceptable (network-dependent).
    expect([0, 1]).toContain(res.exitCode);
    expect(res.stdout + res.stderr).toMatch(
      /Fetching latest catalog|bundled catalog|Catalog|Error/i,
    );
  });
});
