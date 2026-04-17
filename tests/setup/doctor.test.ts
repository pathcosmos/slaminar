import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runDoctor, doctorExitCode, formatDoctorReport } from '../../src/setup/doctor.js';

describe('setup/doctor', () => {
  let fakeHome: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-doctor-test-'));
    savedEnv = {
      HOME: process.env.HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
      SLAMINAR_AI_PROVIDER: process.env.SLAMINAR_AI_PROVIDER,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    };
    process.env.HOME = fakeHome;
    process.env.XDG_CONFIG_HOME = join(fakeHome, '.config');
    // Disable AI detection via env so we get consistent "not configured" state
    delete process.env.SLAMINAR_AI_PROVIDER;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('returns an array of checks with aggregate counts', () => {
    const result = runDoctor();
    expect(result.checks.length).toBeGreaterThan(4);
    expect(result.passCount + result.warnCount + result.failCount).toBe(result.checks.length);
  });

  it('reports AI provider as warn when nothing is configured', () => {
    const result = runDoctor();
    const aiCheck = result.checks.find((c) => c.name === 'AI provider');
    expect(aiCheck).toBeDefined();
    expect(aiCheck!.status).toBe('warn');
  });

  it('reports defaults.json as warn when not yet created', () => {
    const result = runDoctor();
    const defaultsCheck = result.checks.find((c) => c.name === 'defaults.json');
    expect(defaultsCheck?.status).toBe('warn');
  });

  it('exitCode is 0 when only passes, 1 on warn, 2 on fail', () => {
    expect(doctorExitCode({ checks: [], passCount: 3, warnCount: 0, failCount: 0 })).toBe(0);
    expect(doctorExitCode({ checks: [], passCount: 3, warnCount: 1, failCount: 0 })).toBe(1);
    expect(doctorExitCode({ checks: [], passCount: 3, warnCount: 0, failCount: 1 })).toBe(2);
    expect(doctorExitCode({ checks: [], passCount: 0, warnCount: 1, failCount: 1 })).toBe(2);
  });

  it('formatDoctorReport produces human-readable output', () => {
    const report = formatDoctorReport(runDoctor());
    expect(report).toMatch(/slaminar doctor/);
    expect(report).toMatch(/Summary:/);
  });
});
