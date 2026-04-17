import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join, resolve } from 'node:path';
import { cleanup, makeTmpDir, runCli } from './_helpers.js';

/**
 * E2E: `catalog source` federation subcommands.
 *
 * Uses `file://` URIs pointing at the repo's bundled catalog.json so
 * `catalog source test` doesn't hit the network.
 *
 * Each test gets an isolated tmp HOME so user-scoped sources live in a
 * throwaway `~/.config/slaminar/defaults.json`.
 */
const REPO_ROOT = resolve(__dirname, '..', '..');
const BUNDLED_CATALOG = join(REPO_ROOT, 'catalog', 'catalog.json');
const FILE_URI = `file://${BUNDLED_CATALOG}`;

describe('e2e: catalog source subcommands', () => {
  let tmp: string;
  const env = { SLAMINAR_CATALOG_URL: '' };

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-catalog-source-');
  });

  afterEach(() => cleanup(tmp));

  it('add → list → disable → enable → remove round-trip (user scope)', async () => {
    // Add
    const add = await runCli(
      ['catalog', 'source', 'add', FILE_URI, '--scope', 'user', '--mode', 'extend', '--name', 'e2e-src'],
      { cwd: tmp, env },
    );
    expect(add.exitCode).toBe(0);
    expect(add.stdout).toMatch(/Source added/);
    expect(add.stdout).toMatch(/e2e-src/);

    // List — the source should appear
    const list1 = await runCli(['catalog', 'source', 'list'], { cwd: tmp, env });
    expect(list1.exitCode).toBe(0);
    expect(list1.stdout).toMatch(/e2e-src/);

    // Disable
    const dis = await runCli(
      ['catalog', 'source', 'disable', 'e2e-src', '--scope', 'user'],
      { cwd: tmp, env },
    );
    expect(dis.exitCode).toBe(0);
    expect(dis.stdout).toMatch(/Disabled|No change/);

    // Enable
    const en = await runCli(
      ['catalog', 'source', 'enable', 'e2e-src', '--scope', 'user'],
      { cwd: tmp, env },
    );
    expect(en.exitCode).toBe(0);
    expect(en.stdout).toMatch(/Enabled|No change/);

    // Remove
    const rm = await runCli(
      ['catalog', 'source', 'remove', 'e2e-src', '--scope', 'user'],
      { cwd: tmp, env },
    );
    expect(rm.exitCode).toBe(0);
    expect(rm.stdout).toMatch(/Removed/);

    // Final list — e2e-src is gone
    const list2 = await runCli(['catalog', 'source', 'list'], { cwd: tmp, env });
    expect(list2.exitCode).toBe(0);
    expect(list2.stdout).not.toMatch(/\be2e-src\b/);
  });

  it('catalog source test <uri> — runs without crashing (exit 0 or 1 per reachability)', async () => {
    // `source test` calls `fetchRemoteCatalog` directly (fetch-based),
    // so file:// URIs fail the fetch protocol — we only assert graceful
    // behavior. Either the URL resolves (0) or it fails with a Fetch error (1).
    const res = await runCli(['catalog', 'source', 'test', FILE_URI], { cwd: tmp, env });
    expect([0, 1]).toContain(res.exitCode);
    expect(res.stdout + res.stderr).toMatch(/Fetching|Valid|Fetch failed/);
  });

  it('catalog source test <bogus-uri> — exits non-zero with a fetch-failed message', async () => {
    const bogus = 'https://does-not-resolve.invalid.example/bogus.json';
    const res = await runCli(['catalog', 'source', 'test', bogus], { cwd: tmp, env, timeoutSec: 20 });
    expect(res.exitCode).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/Fetch failed|ENOTFOUND|getaddrinfo|network/i);
  });

  it('catalog source add — invalid --mode rejected', async () => {
    const res = await runCli(
      ['catalog', 'source', 'add', FILE_URI, '--mode', 'bogus', '--scope', 'user'],
      { cwd: tmp, env },
    );
    expect(res.exitCode).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/--mode must be/i);
  });

  it('catalog source add — invalid --scope rejected', async () => {
    const res = await runCli(
      ['catalog', 'source', 'add', FILE_URI, '--scope', 'bogus'],
      { cwd: tmp, env },
    );
    expect(res.exitCode).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/--scope must be/i);
  });

  it('catalog source add — invalid --trust rejected', async () => {
    const res = await runCli(
      ['catalog', 'source', 'add', FILE_URI, '--scope', 'user', '--trust', 'sketchy'],
      { cwd: tmp, env },
    );
    expect(res.exitCode).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/--trust must be/i);
  });

  it('catalog source remove — unknown id exits non-zero with notice', async () => {
    const res = await runCli(
      ['catalog', 'source', 'remove', 'never-added', '--scope', 'user'],
      { cwd: tmp, env },
    );
    expect(res.exitCode).not.toBe(0);
    expect(res.stdout).toMatch(/No match/);
  });
});
