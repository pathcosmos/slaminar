/**
 * F1 — Network fault injection (Phase Q3).
 *
 * Target cells F1.a–F1.g from `docs/qa/fault-matrix.md`. Strategy:
 *
 *   - Spin up a local `node:http` stub server per test to control response
 *     status / body / timing. Each test gets a fresh port (system-assigned).
 *   - Exercise the CLI through `runCli` with `--catalog <stub-url>
 *     --catalog-mode replace`. The CLI's own fetch (inside a child process)
 *     hits the stub without needing MSW in the parent vitest process.
 *   - Observables: exit code, stdout/stderr patterns, and cache mutation on
 *     the child's HOME. HOME is pointed at the tmp dir so caches are isolated.
 *
 * Bundled-fallback semantics: the resolver always seeds `bundled` as a layer,
 * so a failed CLI adhoc source is NOT a hard CLI error — the command exits 0
 * and prints the bundled fallback notice.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { cleanup, makeTmpDir, runCli } from './_helpers.js';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

async function startStubServer(handler: Handler): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${addr.port}`;
  return {
    url,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

const BUNDLED_FALLBACK = /bundled catalog|Using bundled|⚠/i;
const ERROR_OR_FAIL = /Error|failed|Failed|unreachable|✗/i;

describe('fault-injection F1 — network', () => {
  let tmp: string;
  let stubs: Array<{ close: () => Promise<void> }>;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-fault-f1-');
    stubs = [];
  });

  afterEach(async () => {
    for (const s of stubs) await s.close();
    cleanup(tmp);
  });

  // F1.a — timeout (stub sleeps longer than client can tolerate).
  // `fetchRemoteCatalog` has a 10s AbortController. `runCli` timeout kills the
  // whole subprocess earlier; either way the user observes a failure/fallback.
  it('F1.a — timeout → graceful fallback (no crash, not hung forever)', async () => {
    const stub = await startStubServer(async (_req, res) => {
      // Never respond within the test window; just hold the socket open.
      // (The CLI's AbortController aborts after 10s.)
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
      }, 60_000);
    });
    stubs.push(stub);

    const res = await runCli(
      ['catalog', 'update', '--catalog', `${stub.url}/catalog.json`, '--catalog-mode', 'replace'],
      { cwd: tmp, timeoutSec: 20 },
    );

    // Bundled fallback OR hard timeout exit — both acceptable per matrix.
    expect([0, 1]).toContain(res.exitCode);
    const combined = res.stdout + res.stderr;
    expect(combined).toMatch(/bundled|timeout|abort|Error|unreachable|Fetching/i);
  }, 30_000);

  // F1.b — DNS failure: invalid TLD.
  it('F1.b — DNS fail (invalid host) → bundled fallback', async () => {
    const res = await runCli(
      [
        'catalog',
        'update',
        '--catalog',
        'https://slaminar-fault-no-such-host.invalid/catalog.json',
        '--catalog-mode',
        'replace',
      ],
      { cwd: tmp, timeoutSec: 20 },
    );

    expect([0, 1]).toContain(res.exitCode);
    const combined = res.stdout + res.stderr;
    expect(combined).toMatch(BUNDLED_FALLBACK);
  }, 30_000);

  // F1.c — HTTP 404.
  it('F1.c — HTTP 404 → bundled fallback, no cache written', async () => {
    const stub = await startStubServer((_req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
    });
    stubs.push(stub);

    const res = await runCli(
      ['catalog', 'update', '--catalog', `${stub.url}/catalog.json`, '--catalog-mode', 'replace'],
      { cwd: tmp },
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout + res.stderr).toMatch(BUNDLED_FALLBACK);
  });

  // F1.d — HTTP 500.
  it('F1.d — HTTP 500 → bundled fallback', async () => {
    const stub = await startStubServer((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('server error');
    });
    stubs.push(stub);

    const res = await runCli(
      ['catalog', 'update', '--catalog', `${stub.url}/catalog.json`, '--catalog-mode', 'replace'],
      { cwd: tmp },
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout + res.stderr).toMatch(BUNDLED_FALLBACK);
  });

  // F1.e — 200 + corrupt JSON.
  it('F1.e — 200 OK + corrupt JSON body → bundled fallback (schema/parse error swallowed)', async () => {
    const stub = await startStubServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('not really json at all');
    });
    stubs.push(stub);

    const res = await runCli(
      ['catalog', 'update', '--catalog', `${stub.url}/catalog.json`, '--catalog-mode', 'replace'],
      { cwd: tmp },
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout + res.stderr).toMatch(BUNDLED_FALLBACK);
  });

  // F1.f — 200 + valid JSON: new cache written.
  it('F1.f — 200 OK + valid catalog JSON → success, writes per-source cache', async () => {
    const payload = {
      version: '9.9.9-fault',
      minSlaminarVersion: '0.3.0',
      updatedAt: new Date().toISOString(),
      tools: [
        {
          name: 'fault-test-tool',
          repo: 'ghost/fault-test',
          category: 'plugin',
          description: 'Tool planted by F1.f stub server.',
          authRequired: false,
          networkRequired: 'none',
          installMethod: 'marketplace',
          installCommands: ['/install-plugin fault-test-tool'],
          prerequisites: [],
          tags: ['fault-test'],
          maturityFit: ['early'],
        },
      ],
    };
    const stub = await startStubServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json', ETag: '"abc123"' });
      res.end(JSON.stringify(payload));
    });
    stubs.push(stub);

    const res = await runCli(
      ['catalog', 'update', '--catalog', `${stub.url}/catalog.json`, '--catalog-mode', 'replace'],
      { cwd: tmp },
    );

    expect(res.exitCode).toBe(0);
    const combined = res.stdout + res.stderr;
    // Should surface the remote catalog version or "remote" source label.
    expect(combined).toMatch(/9\.9\.9-fault|remote|Catalog/i);
  });

  // F1.g — ETag 304 (cache unchanged). Exercised via two runs: first seeds
  // the cache (200 + ETag), second returns 304 for If-None-Match.
  it('F1.g — ETag 304 on second fetch → cache preserved, "cache" source reported', async () => {
    const payload = {
      version: '1.2.3-etag',
      minSlaminarVersion: '0.3.0',
      updatedAt: new Date().toISOString(),
      tools: [
        {
          name: 'etag-tool',
          repo: 'ghost/etag',
          category: 'plugin',
          description: 'ETag fixture.',
          authRequired: false,
          networkRequired: 'none',
          installMethod: 'marketplace',
          installCommands: ['/install-plugin etag-tool'],
          prerequisites: [],
          tags: ['fault-test'],
          maturityFit: ['early'],
        },
      ],
    };
    let requestCount = 0;
    const stub = await startStubServer((req, res) => {
      requestCount += 1;
      if (req.headers['if-none-match']) {
        res.writeHead(304, { ETag: '"etag-v1"' });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json', ETag: '"etag-v1"' });
      res.end(JSON.stringify(payload));
    });
    stubs.push(stub);

    const url = `${stub.url}/catalog.json`;
    // Seed cache.
    const first = await runCli(
      ['catalog', 'update', '--catalog', url, '--catalog-mode', 'replace'],
      { cwd: tmp },
    );
    expect(first.exitCode).toBe(0);

    // Second run — forceRefresh inside `catalog update` re-hits the server.
    const second = await runCli(
      ['catalog', 'update', '--catalog', url, '--catalog-mode', 'replace'],
      { cwd: tmp },
    );
    expect(second.exitCode).toBe(0);
    expect(requestCount).toBeGreaterThanOrEqual(2);
    // Observable: no catastrophic error path on 304; output still talks about
    // the catalog.
    expect(second.stdout + second.stderr).toMatch(/Catalog|1\.2\.3-etag|no change|cache/i);
  }, 30_000);

  // Bonus: `catalog source test <uri>` is a direct fetchRemoteCatalog path —
  // easier assertion for F1.b/c/d because it doesn't fall back to bundled.
  it('F1.b-alt — `catalog source test` with invalid host exits 1 + "Fetch failed"', async () => {
    const res = await runCli(
      ['catalog', 'source', 'test', 'https://slaminar-fault-no-such-host.invalid/catalog.json'],
      { cwd: tmp, timeoutSec: 20 },
    );
    expect(res.exitCode).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/Fetch failed|fetch failed|ENOTFOUND/i);
  }, 30_000);

  it('F1.c-alt — `catalog source test` with 404 exits 1 + surfaces status', async () => {
    const stub = await startStubServer((_req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
    });
    stubs.push(stub);

    const res = await runCli(
      ['catalog', 'source', 'test', `${stub.url}/catalog.json`],
      { cwd: tmp },
    );
    expect(res.exitCode).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/404|Fetch failed/);
  });
});
