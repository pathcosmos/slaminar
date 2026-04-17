import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar doctor', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-doctor-');
  });

  afterEach(() => cleanup(tmp));

  it('doctor on a fresh HOME prints a report without crashing', async () => {
    const result = await runCli(['doctor'], { cwd: tmp });

    // Fresh HOME: defaults.json missing + no catalog cache + no auth =>
    // warnings expected. doctorExitCode returns 1 for any warns, 2 for fails.
    // We just assert it's a known non-crash code and the report is printed.
    expect([0, 1, 2]).toContain(result.exitCode);
    expect(result.stdout).toMatch(/slaminar doctor/);
    expect(result.stdout).toMatch(/Summary:/);
    expect(result.stdout).toMatch(/Node\.js/);
  });

  it('doctor after `setup --yes` produces a cleaner report (no hard fails)', async () => {
    const setup = await runCli(['setup', '--yes', '--no-discovery'], { cwd: tmp });
    expect(setup.exitCode).toBe(0);

    const result = await runCli(['doctor'], { cwd: tmp });
    // defaults.json now exists → the "Configuration" check should pass.
    expect(result.stdout).toMatch(/defaults\.json/);
    // No hard-fail category (exit code 2) after a clean setup on a healthy host.
    expect(result.exitCode).not.toBe(2);
  });

  it('doctor --json emits parseable JSON', async () => {
    const result = await runCli(['doctor', '--json'], { cwd: tmp });

    // stdout should be (effectively) JSON — find the first `{` and parse.
    const start = result.stdout.indexOf('{');
    expect(start).toBeGreaterThanOrEqual(0);
    const jsonText = result.stdout.slice(start);

    const parsed = JSON.parse(jsonText);
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(typeof parsed.passCount).toBe('number');
    expect(typeof parsed.warnCount).toBe('number');
    expect(typeof parsed.failCount).toBe('number');
    // At least the Node.js check is always present.
    expect(parsed.checks.some((c: { name: string }) => c.name === 'Node.js')).toBe(true);
  });
});
