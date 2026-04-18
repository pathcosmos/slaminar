/**
 * F5 — AI provider fault injection (Phase Q3).
 *
 * Target cells F5.a–F5.e from `docs/qa/fault-matrix.md`.
 *
 * Strategy: exercise `enhanceWithAI()` in-process (the same helper the init
 * pipeline calls) so we can intercept `global.fetch` via `vi.stubGlobal`.
 * The subprocess CLI path wouldn't let us mock Cloudflare's hardcoded
 * `api.cloudflare.com` endpoint without a code change — in-process covers the
 * same control flow (detectProvider → generateWithCloudflare → fallback).
 *
 * Each test:
 *   - isolates `XDG_CONFIG_HOME` to a tmp dir so no real auth.json leaks in.
 *   - clears AI env vars, sets only the ones relevant to the case.
 *   - stubs `fetch` with the desired failure shape.
 *   - asserts the returned string equals the original draft (graceful fallback
 *     is the documented F5 contract for every failure mode).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enhanceWithAI, detectAiProvider } from '../../src/generator/ai-provider.js';
import type { ProjectProfile } from '../../src/types/index.js';
import { cleanup, makeTmpDir } from './_helpers.js';

function makeProfile(): ProjectProfile {
  return {
    name: 'fault-test-app',
    description: 'F5 fixture',
    maturity: 'growing',
    language: {
      primary: 'typescript',
      secondary: [],
      framework: null,
      runtime: 'node',
      buildTool: null,
    },
    structure: { pattern: 'cli', entryPoints: [], testPattern: null, srcLayout: 'flat' },
    conventions: {
      naming: 'camelCase',
      testFramework: null,
      linter: null,
      formatter: null,
      commitStyle: 'freeform',
      docLanguage: 'en',
    },
    dependencies: { total: 0, notable: [], devTools: [] },
    existingAiContext: {
      hasClaudeMd: false,
      claudeMdLines: 0,
      hasClaudeSettings: false,
      hasClaudePlugin: false,
    },
  };
}

const AI_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'SLAMINAR_AI_PROVIDER',
  'SLAMINAR_CF_MODEL',
  'XDG_CONFIG_HOME',
];

describe('fault-injection F5 — AI provider', () => {
  const saved: Record<string, string | undefined> = {};
  let tmpHome: string;
  const draft = '# CLAUDE.md\n\nOriginal draft — untouched on failure.\n';

  beforeEach(() => {
    for (const key of AI_ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    tmpHome = makeTmpDir('slaminar-fault-f5-');
    // Point the auth-config loader at a dir guaranteed to have no auth.json,
    // so `loadAuthConfig()` returns null regardless of the host machine state.
    process.env.XDG_CONFIG_HOME = tmpHome;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    cleanup(tmpHome);
  });

  // F5.a — Cloudflare 401: invalid credentials → local fallback, no throw.
  it('F5.a — HTTP 401 from Cloudflare → returns original draft (graceful fallback)', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'bogus-account';
    process.env.CLOUDFLARE_API_TOKEN = 'bogus-token';
    process.env.SLAMINAR_AI_PROVIDER = 'cloudflare';

    const fetchSpy = vi.fn(async () =>
      new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await enhanceWithAI(draft, makeProfile(), '');
    expect(result).toBe(draft);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const call = fetchSpy.mock.calls[0];
    expect(String(call[0])).toMatch(/api\.cloudflare\.com/);
  });

  // F5.b — 429 rate limit: same graceful fallback, no retry.
  it('F5.b — HTTP 429 rate limit → returns original draft, only ONE fetch attempt', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'bogus-account';
    process.env.CLOUDFLARE_API_TOKEN = 'bogus-token';
    process.env.SLAMINAR_AI_PROVIDER = 'cloudflare';

    const fetchSpy = vi.fn(async () =>
      new Response('Rate limited', { status: 429, statusText: 'Too Many Requests' }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await enhanceWithAI(draft, makeProfile(), '');
    expect(result).toBe(draft);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // F5.c — empty body: 200 OK but `{}` → no `result.response` → throws inside
  // generateWithCloudflare → caught → fallback.
  it('F5.c — 200 OK with empty body {} → draft unchanged (empty-response path)', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'bogus-account';
    process.env.CLOUDFLARE_API_TOKEN = 'bogus-token';
    process.env.SLAMINAR_AI_PROVIDER = 'cloudflare';

    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await enhanceWithAI(draft, makeProfile(), '');
    expect(result).toBe(draft);
  });

  // F5.c-alt — 200 OK but `success:false` with errors array (CF error envelope).
  it('F5.c-alt — 200 OK with success:false envelope → draft unchanged', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'bogus-account';
    process.env.CLOUDFLARE_API_TOKEN = 'bogus-token';
    process.env.SLAMINAR_AI_PROVIDER = 'cloudflare';

    const fetchSpy = vi.fn(async () =>
      new Response(
        JSON.stringify({ success: false, result: null, errors: [{ code: 7003, message: 'bad' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await enhanceWithAI(draft, makeProfile(), '');
    expect(result).toBe(draft);
  });

  // F5.d — fetch rejects (network/timeout error) → fallback.
  // enhanceWithAI has its own try/catch wrapping generateWithCloudflare.
  it('F5.d — fetch throws (simulated timeout/abort) → draft unchanged', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'bogus-account';
    process.env.CLOUDFLARE_API_TOKEN = 'bogus-token';
    process.env.SLAMINAR_AI_PROVIDER = 'cloudflare';

    const fetchSpy = vi.fn(async () => {
      const err = new Error('aborted (timeout)');
      (err as Error & { name: string }).name = 'AbortError';
      throw err;
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await enhanceWithAI(draft, makeProfile(), '');
    expect(result).toBe(draft);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  // F5.e — SLAMINAR_AI_PROVIDER=local → no fetch, draft unchanged.
  it('F5.e — SLAMINAR_AI_PROVIDER=local → zero fetch calls, draft returned verbatim', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'real-account';
    process.env.CLOUDFLARE_API_TOKEN = 'real-token';
    process.env.SLAMINAR_AI_PROVIDER = 'local';

    const fetchSpy = vi.fn(async () =>
      new Response('{"result":{"response":"AI-written draft"}}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await enhanceWithAI(draft, makeProfile(), '');
    expect(result).toBe(draft);
    expect(fetchSpy).not.toHaveBeenCalled();

    const status = detectAiProvider();
    expect(status.mode).toBe('local');
    expect(status.provider).toBe('local');
  });

  // Sanity — when provider resolves AND fetch returns a successful envelope,
  // enhanceWithAI DOES replace the draft. This pins the positive path so the
  // fallback assertions above are not vacuous.
  it('F5-sanity — 200 OK + valid CF envelope → draft IS replaced with AI output', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'ok';
    process.env.CLOUDFLARE_API_TOKEN = 'ok';
    process.env.SLAMINAR_AI_PROVIDER = 'cloudflare';

    const aiText = '# CLAUDE.md\n\nImproved by AI.\n';
    const fetchSpy = vi.fn(async () =>
      new Response(
        JSON.stringify({ success: true, result: { response: aiText }, errors: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await enhanceWithAI(draft, makeProfile(), '');
    expect(result).toBe(aiText);
    expect(result).not.toBe(draft);
  });
});
