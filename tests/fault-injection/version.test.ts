/**
 * F8 — Version mismatch fault injection (Phase Q3).
 *
 * Target cells F8.a–F8.c from `docs/qa/fault-matrix.md`. Strategy:
 *
 *   - F8.a spins up a local `node:http` stub that serves a catalog claiming
 *     `minSlaminarVersion: "99.0.0"`. We point the CLI at it via the
 *     `--catalog` adhoc source and observe whether slaminar honours the floor.
 *   - F8.b writes a `defaults.json` with `version: 99` under a per-test HOME
 *     and then exercises `doctor` / `init` to make sure the loader degrades
 *     gracefully (merges with built-ins, never crashes).
 *   - F8.c writes a `manifest.json` whose records carry extra/unknown fields
 *     and invokes `uninstall` to verify the reader tolerates schema drift.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { AddressInfo } from 'node:net';
import { cleanup, makeTmpDir, runCli, writeFile } from './_helpers.js';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

async function startStubServer(handler: Handler): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${addr.port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

function futureCatalog(): object {
  return {
    version: '99.0.0',
    minSlaminarVersion: '99.0.0',
    updatedAt: '2026-04-17',
    tools: [],
    suggestions: [],
    relations: [],
  };
}

describe('fault-injection F8 — version mismatch', () => {
  let tmp: string;
  const stubs: Array<{ close: () => Promise<void> }> = [];

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-fault-f8-');
  });

  afterEach(async () => {
    while (stubs.length) {
      const s = stubs.pop();
      if (s) await s.close();
    }
    cleanup(tmp);
  });

  // F8.a — catalog claims it needs slaminar 99.0.0. Current runtime is far
  // below that floor. Matrix expectation: exit 1 OR warn+skip. Observed per
  // Q1 analysis: the field is schema-validated (src/recommender/catalog-
  // remote.ts:91) but never compared to `SLAMINAR_VERSION` anywhere in
  // src/recommender/. The catalog is accepted as-is.
  //
  // BUG: `minSlaminarVersion` is not honoured by the resolver. No comparison
  // exists against src/version.ts:SLAMINAR_VERSION anywhere in the fetch /
  // merge path (src/recommender/catalog-remote.ts:86-94 only validates the
  // field is a string; src/recommender/catalog-resolver.ts never reads it).
  // CONFIRMED vs matrix "★ 미구현 검증 — 현재 이 필드를 honor 하지 않는 듯".
  // v0.9.2 P0-8 landed: resolver now honors `minSlaminarVersion` via
  // `meetsMinSlaminarVersion()` and emits a skip warning when the catalog
  // requires a newer runtime than installed.
  it('F8.a — catalog with minSlaminarVersion=99.0.0 is skipped with a warning', async () => {
    const stub = await startStubServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(futureCatalog()));
    });
    stubs.push(stub);

    const result = await runCli(
      ['catalog', 'update', '--catalog', `${stub.url}/catalog.json`, '--catalog-mode', 'replace'],
      { cwd: tmp, timeoutSec: 30 },
    );
    // The resolver emits the warning on stderr; stdout carries the fallback
    // report. Either way, the combined output must mention the version gate.
    const combined = result.stdout + result.stderr;
    expect(combined).toMatch(/requires slaminar >= 99\.0\.0|npm install -g slaminar/);
  });

  it('F8.a [BUG] — init --catalog <stub-99.0.0> still produces CLAUDE.md', async () => {
    const stub = await startStubServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(futureCatalog()));
    });
    stubs.push(stub);

    const result = await runCli(
      ['init', '--catalog', `${stub.url}/catalog.json`, '--catalog-mode', 'replace', tmp],
      { cwd: tmp, timeoutSec: 30 },
    );
    // Current: exits 0 and happily generates CLAUDE.md despite the catalog's
    // declared floor being far above the installed runtime.
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(tmp, 'CLAUDE.md'))).toBe(true);
  });

  // F8.b — a `defaults.json` declaring `version: 99` must still be read
  // gracefully. `loadDefaults()` (src/setup/defaults.ts:78-89) catches parse
  // errors and merges partial objects with built-ins, so a numeric-version
  // file simply overwrites version with 1 during save. We verify doctor
  // doesn't crash and init still succeeds.
  it('F8.b — defaults.json with version=99 is handled gracefully by doctor', async () => {
    const configDir = join(tmp, '.config', 'slaminar');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'defaults.json'),
      JSON.stringify({
        version: 99,
        savedAt: new Date().toISOString(),
        defaults: { aiMode: 'auto', tokenTier: 'smart' },
      }),
      'utf-8',
    );

    const result = await runCli(['doctor', '--json'], { cwd: tmp, home: tmp });
    // Doctor may exit 0/1/2 depending on environment, but must not crash
    // with an unhandled error. We accept any exit code < 3 and no throw.
    expect(result.exitCode).toBeLessThan(3);
    expect(result.stderr).not.toMatch(/TypeError|SyntaxError|is not a function/);
  });

  it('F8.b — defaults.json with version=99 does not block init', async () => {
    const configDir = join(tmp, '.config', 'slaminar');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'defaults.json'),
      JSON.stringify({ version: 99, defaults: { tokenTier: 'smart' } }),
      'utf-8',
    );
    const projectDir = join(tmp, 'project');
    mkdirSync(projectDir, { recursive: true });
    writeFile(projectDir, 'package.json', JSON.stringify({ name: 'p', version: '0.0.1' }));

    const result = await runCli(['init', projectDir], { cwd: tmp, home: tmp });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toMatch(/TypeError|SyntaxError/);
  });

  // F8.c — manifest.json with unknown fields must not crash `uninstall`.
  // `readManifest()` (src/placer/backup.ts:48-62) accepts any array and
  // wraps parse errors in a silent `[]` return. Extra fields therefore flow
  // through; `restoreFile()` only reads `backupPath`/`originalPath`, so
  // unknown fields are ignored and a missing backup is reported via
  // `missingBackups` rather than crashing.
  it('F8.c — uninstall tolerates manifest.json with unexpected fields', async () => {
    // Seed a fake .slaminar/.bk/manifest.json with extra/unknown fields.
    const bkDir = join(tmp, '.slaminar', '.bk');
    mkdirSync(bkDir, { recursive: true });
    const manifest = [
      {
        originalPath: 'CLAUDE.md',
        backupPath: '.slaminar/.bk/ffffff_1.dat',
        timestamp: 1,
        // Unexpected fields that any future schema addition might introduce:
        schemaVersion: 99,
        checksum: 'sha256:deadbeef',
        encoding: 'utf-8',
      },
    ];
    writeFileSync(join(bkDir, 'manifest.json'), JSON.stringify(manifest), 'utf-8');
    // Seed the corresponding backup blob so restore succeeds (tests path that
    // exercises unknown-field tolerance, not missing-backup path).
    writeFileSync(join(bkDir, 'ffffff_1.dat'), 'original content\n');

    const result = await runCli(['uninstall', tmp], { cwd: tmp });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toMatch(/TypeError|SyntaxError/);
    // Uninstall should have honoured the record despite extra fields.
    expect(result.stdout).toMatch(/CLAUDE\.md|slaminar uninstall complete/);
  });

  // v0.9.2 P0-9 (F3.c) landed: a manifest.json whose root is NOT an array is
  // treated as corrupt. uninstall emits a loud warning and exits 1 because
  // we cannot tell what files were modified by an earlier init. This is a
  // data-safety escalation — prior behavior was silent exit 0.
  it('F8.c — uninstall flags non-array manifest.json as corrupt (exit 1)', async () => {
    const bkDir = join(tmp, '.slaminar', '.bk');
    mkdirSync(bkDir, { recursive: true });
    writeFileSync(
      join(bkDir, 'manifest.json'),
      JSON.stringify({ unexpected: 'object instead of array', version: 99 }),
      'utf-8',
    );

    const result = await runCli(['uninstall', tmp], { cwd: tmp });
    expect(result.exitCode).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/manifest\.json was corrupt|NOT restored/);
    expect(result.stderr).not.toMatch(/TypeError|SyntaxError/);
  });
});
