import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runSetupWizard } from '../../src/setup/wizard.js';
import { getDefaultsPath, loadDefaults, saveDefaults, builtInDefaults } from '../../src/setup/defaults.js';
import { getAuthFilePath, loadAuthConfig } from '../../src/auth/config.js';

describe('setup/wizard (non-interactive --yes mode)', () => {
  let fakeHome: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-wiz-test-'));
    savedEnv = {
      HOME: process.env.HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
      SLAMINAR_AI_PROVIDER: process.env.SLAMINAR_AI_PROVIDER,
      SLAMINAR_CF_TOKEN: process.env.SLAMINAR_CF_TOKEN,
      SLAMINAR_CF_ACCOUNT_ID: process.env.SLAMINAR_CF_ACCOUNT_ID,
      SLAMINAR_CF_MODEL: process.env.SLAMINAR_CF_MODEL,
      SLAMINAR_CATALOG_URL: process.env.SLAMINAR_CATALOG_URL,
      SLAMINAR_CATALOG_MODE: process.env.SLAMINAR_CATALOG_MODE,
      SLAMINAR_DEFAULT_AI_MODE: process.env.SLAMINAR_DEFAULT_AI_MODE,
      SLAMINAR_EXCLUDE_AUTH_TOOLS: process.env.SLAMINAR_EXCLUDE_AUTH_TOOLS,
      SLAMINAR_FILE_COUNT_CAP: process.env.SLAMINAR_FILE_COUNT_CAP,
      SLAMINAR_VERSION_CHECK: process.env.SLAMINAR_VERSION_CHECK,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    };
    process.env.HOME = fakeHome;
    process.env.XDG_CONFIG_HOME = join(fakeHome, '.config');
    // Wipe env that might trigger auto-detection
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

  it('creates defaults.json when none exists, using built-in values', async () => {
    const result = await runSetupWizard({ yes: true });
    expect(existsSync(getDefaultsPath())).toBe(true);
    expect(result.defaultsPath).toBe(getDefaultsPath());
    const d = loadDefaults();
    expect(d.version).toBe(1);
    expect(d.defaults.aiMode).toBe('auto');
  });

  it('applies SLAMINAR_* env vars in --yes mode', async () => {
    process.env.SLAMINAR_CATALOG_URL = 'https://tools.example/catalog.json';
    process.env.SLAMINAR_CATALOG_MODE = 'extend';
    process.env.SLAMINAR_DEFAULT_AI_MODE = 'local';
    process.env.SLAMINAR_EXCLUDE_AUTH_TOOLS = 'false';
    process.env.SLAMINAR_FILE_COUNT_CAP = '5000';
    process.env.SLAMINAR_VERSION_CHECK = 'false';

    await runSetupWizard({ yes: true });
    const d = loadDefaults();
    expect(d.catalog.url).toBe('https://tools.example/catalog.json');
    expect(d.catalog.mode).toBe('extend');
    expect(d.defaults.aiMode).toBe('local');
    expect(d.defaults.excludeAuthTools).toBe(false);
    expect(d.defaults.fileCountCap).toBe(5000);
    expect(d.telemetry.versionCheck).toBe(false);
  });

  it('writes auth.json from SLAMINAR_CF_* env vars', async () => {
    process.env.SLAMINAR_AI_PROVIDER = 'cloudflare';
    process.env.SLAMINAR_CF_TOKEN = 'test-token-1234567890';
    process.env.SLAMINAR_CF_ACCOUNT_ID = 'abc123';

    await runSetupWizard({ yes: true });

    expect(existsSync(getAuthFilePath())).toBe(true);
    const cfg = loadAuthConfig();
    expect(cfg?.active).toBe('cloudflare');
    expect(cfg?.providers.cloudflare?.accountId).toBe('abc123');
  });

  it('--reconfigure catalog only touches catalog section', async () => {
    saveDefaults({
      ...builtInDefaults(),
      defaults: { aiMode: 'ai', excludeAuthTools: false, fileCountCap: 999, verbose: true },
      telemetry: { optedIn: true, versionCheck: false },
    });
    process.env.SLAMINAR_CATALOG_URL = 'https://custom/catalog.json';

    await runSetupWizard({ yes: true, reconfigureSection: 'catalog' });

    const d = loadDefaults();
    expect(d.catalog.url).toBe('https://custom/catalog.json');
    // Other sections preserved
    expect(d.defaults.aiMode).toBe('ai');
    expect(d.defaults.fileCountCap).toBe(999);
    expect(d.telemetry.optedIn).toBe(true);
    expect(d.telemetry.versionCheck).toBe(false);
  });

  it('writes a setup log file under ~/.config/slaminar/setup-logs/', async () => {
    const result = await runSetupWizard({ yes: true });
    expect(result.logPath).not.toBeNull();
    expect(existsSync(result.logPath!)).toBe(true);
    const content = readFileSync(result.logPath!, 'utf-8');
    expect(content).toMatch(/slaminar setup/);
  });

  it('skips auth step when no env vars provided in --yes mode', async () => {
    const result = await runSetupWizard({ yes: true });
    expect(result.skipped).toContain('auth');
    expect(existsSync(getAuthFilePath())).toBe(false);
  });
});
