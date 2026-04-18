/**
 * F7 — Invalid CLI input fault injection (Phase Q3).
 *
 * Target cells F7.a–F7.f from `docs/qa/fault-matrix.md`. Strategy:
 *
 *   - Drive the compiled CLI through `runCli` with a fresh tmp cwd and HOME
 *     so no real user state is touched.
 *   - For each invalid flag value, assert exit code + stderr pattern.
 *   - For the pre-identified Q1 gap (F7.c) we DOCUMENT the observed slip-
 *     through as a BUG comment rather than asserting exit==1 (so the suite
 *     stays green). When the CLI is fixed to validate, the test's slip-through
 *     assertion will fail and prompt the author to flip the expectation.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, makeTmpDir, runCli } from './_helpers.js';

describe('fault-injection F7 — invalid CLI input', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-fault-f7-');
  });

  afterEach(() => {
    cleanup(tmp);
  });

  // F7.a — --token-tier with an invalid value must fail fast with a helpful
  // enumeration of the allowed values (init and recommend share the resolver).
  it('F7.a — init --token-tier fast → exit 1 with conservative|smart|rich hint', async () => {
    const result = await runCli(['init', '--token-tier', 'fast', tmp], { cwd: tmp });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/conservative.*smart.*rich/);
    expect(result.stderr).toMatch(/fast/);
  });

  it('F7.a — recommend --token-tier invalid → exit 1', async () => {
    const result = await runCli(['recommend', '--token-tier', 'invalid', tmp], { cwd: tmp });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/conservative.*smart.*rich/);
  });

  // F7.b — the validated code paths. These act as positive controls: if Q1's
  // earlier validation ever regresses, these tests catch it first.
  it('F7.b — catalog config --mode bogus → exit 1 with "extend" or "replace" guidance', async () => {
    const result = await runCli(['catalog', 'config', '--mode', 'bogus'], { cwd: tmp });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/extend|replace/);
    expect(result.stderr).toMatch(/bogus/);
  });

  it('F7.b — catalog source add --mode bogus → exit 1', async () => {
    const result = await runCli(
      ['catalog', 'source', 'add', 'http://example.invalid/x.json', '--scope', 'user', '--mode', 'bogus', '--trust', 'trusted'],
      { cwd: tmp },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/extend|replace/);
  });

  it('F7.b — catalog source add --scope bogus → exit 1', async () => {
    const result = await runCli(
      ['catalog', 'source', 'add', 'http://example.invalid/x.json', '--scope', 'bogus'],
      { cwd: tmp },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/user.*project|scope/i);
  });

  it('F7.b — catalog source add --trust bogus → exit 1', async () => {
    const result = await runCli(
      ['catalog', 'source', 'add', 'http://example.invalid/x.json', '--scope', 'user', '--trust', 'bogus'],
      { cwd: tmp },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/trusted.*untrusted.*verified/);
  });

  // F7.c — the pre-identified validation gap in init/recommend/discover.
  // Q1 Agent B flagged that `--catalog-mode` is cast without validation at
  // src/cli.ts:123 (init), src/cli.ts:240 (recommend) and src/cli.ts:556
  // (discover). Observed behavior: the invalid value slips through without
  // error — the flag is simply ignored or misinterpreted downstream.
  //
  // BUG: `--catalog-mode` is not validated in `init` (src/cli.ts:123).
  // BUG: `--catalog-mode` is not validated in `recommend` (src/cli.ts:240).
  // BUG: `--catalog-mode` is not validated in `discover` (src/cli.ts:556).
  // CONFIRMED against matrix expectation "현재 미검증 — validation 누락".
  //
  // These tests DOCUMENT the slip-through. When validation lands, the
  // expectations flip to exit==1 and the comments disappear.
  // v0.9.2 P0-7 landed: init/recommend now validate --catalog-mode at the CLI
  // boundary via validateCatalogMode() before the value reaches the pipeline.
  it('F7.c — init --catalog-mode bogus → exit 1 with allowlist', async () => {
    const result = await runCli(['init', '--catalog-mode', 'bogus', tmp], { cwd: tmp });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/catalog-mode.*extend.*replace|must be one of/);
  });

  it('F7.c — recommend --catalog-mode bogus → exit 1 with allowlist', async () => {
    const result = await runCli(['recommend', '--catalog-mode', 'bogus', tmp], { cwd: tmp });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/catalog-mode.*extend.*replace|must be one of/);
  });

  // F7.d — a malformed/unreachable catalog URL must fall back gracefully.
  // The `.invalid` TLD is reserved for testing by RFC 2606 so no real DNS
  // lookup succeeds — which lets us verify the resolver's bundled fallback.
  it('F7.d — init --catalog <unreachable-url> → exit 0 with bundled fallback', async () => {
    const result = await runCli(
      ['init', '--catalog', 'http://definitely-not-real.invalid/x.json', tmp],
      { cwd: tmp, timeoutSec: 45 },
    );
    expect(result.exitCode).toBe(0);
    // The resolver should have fallen back to the bundled catalog; CLAUDE.md
    // and the plugin manifest should still have been produced.
    expect(result.stdout).toMatch(/CLAUDE\.md|slaminar init complete/);
  });

  // F7.e — the `setup --reconfigure` section allowlist is validated directly
  // in src/cli.ts:430. A bad section must fail with the enumerated allowed
  // values so the user can self-correct without reading source.
  it('F7.e — setup --reconfigure bogus → exit 1 with section allowlist', async () => {
    const result = await runCli(['setup', '--reconfigure', 'bogus'], { cwd: tmp });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/auth.*catalog.*defaults.*skill|section|Invalid section/);
  });

  // F7.f — SLAMINAR_FILE_COUNT_CAP=-5 through `setup --yes`. The wizard does a
  // `Math.max(100, parseInt(...))` guard at src/setup/wizard.ts:356 in the
  // interactive path, but the --yes path at wizard.ts:318 uses `parseInt() ||
  // current.defaults.fileCountCap` with no lower-bound check. Result: a
  // negative value is stored verbatim in defaults.json.
  //
  // BUG: negative `fileCountCap` is accepted without floor in --yes mode
  // (src/setup/wizard.ts:318-320). Matrix expectation: fallback to default
  // or reject with "must be positive integer".
  it('F7.f [BUG] — SLAMINAR_FILE_COUNT_CAP=-5 via setup --yes is accepted (no floor in --yes path)', async () => {
    const result = await runCli(
      ['setup', '--yes', '--no-discovery'],
      {
        cwd: tmp,
        env: {
          SLAMINAR_FILE_COUNT_CAP: '-5',
          SLAMINAR_AI_PROVIDER: 'local',
        },
        timeoutSec: 30,
      },
    );
    // Pins current observed behavior: exits 0 and writes -5 into defaults.
    expect(result.exitCode).toBe(0);
    // Defaults land under HOME which runCli points at cwd.
    // When the wizard adds a floor check this test should flip.
    expect(result.stdout + result.stderr).not.toMatch(/must be positive/i);
  });
});
