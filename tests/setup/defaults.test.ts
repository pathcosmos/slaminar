import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  builtInDefaults,
  defaultsExist,
  getDefaultsPath,
  loadDefaults,
  resetDefaultsSection,
  saveDefaults,
} from '../../src/setup/defaults.js';

describe('setup/defaults', () => {
  let fakeHome: string;
  let originalHome: string | undefined;
  let originalXdg: string | undefined;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-defaults-test-'));
    originalHome = process.env.HOME;
    originalXdg = process.env.XDG_CONFIG_HOME;
    process.env.HOME = fakeHome;
    process.env.XDG_CONFIG_HOME = join(fakeHome, '.config');
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalXdg;
  });

  it('returns built-in defaults when file does not exist', () => {
    expect(defaultsExist()).toBe(false);
    const d = loadDefaults();
    expect(d.version).toBe(1);
    expect(d.defaults.aiMode).toBe('auto');
    expect(d.catalog.autoRefreshHours).toBe(24);
    expect(d.telemetry.versionCheck).toBe(true);
    expect(d.discovery.excludePatterns).toContain('node_modules');
  });

  it('round-trips save and load', () => {
    const base = builtInDefaults();
    base.defaults.aiMode = 'local';
    base.catalog.url = 'https://tools.example.com/catalog.json';
    base.catalog.mode = 'extend';
    const path = saveDefaults(base);
    expect(existsSync(path)).toBe(true);
    expect(path).toBe(getDefaultsPath());

    const loaded = loadDefaults();
    expect(loaded.defaults.aiMode).toBe('local');
    expect(loaded.catalog.url).toBe('https://tools.example.com/catalog.json');
    expect(loaded.catalog.mode).toBe('extend');
  });

  it('merges partial files with built-in defaults', () => {
    saveDefaults({ ...builtInDefaults(), catalog: { url: 'https://x', mode: 'replace', autoRefreshHours: 6 } });
    // Simulate external tool writing only part of the file
    writeFileSync(getDefaultsPath(), JSON.stringify({ version: 1, catalog: { url: 'https://y' } }), 'utf-8');

    const loaded = loadDefaults();
    expect(loaded.catalog.url).toBe('https://y');
    // Missing fields filled with built-in defaults
    expect(loaded.defaults.aiMode).toBe('auto');
    expect(loaded.telemetry.versionCheck).toBe(true);
  });

  it('falls back gracefully on malformed JSON', () => {
    const configDir = process.env.XDG_CONFIG_HOME + '/slaminar';
    require('node:fs').mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'defaults.json'), '{{{ not json', 'utf-8');
    const d = loadDefaults();
    expect(d.version).toBe(1);
    expect(d.defaults.aiMode).toBe('auto');
  });

  it('updates savedAt on every save', async () => {
    saveDefaults(builtInDefaults());
    const firstStamp = loadDefaults().savedAt;
    await new Promise((resolve) => setTimeout(resolve, 10));
    saveDefaults(builtInDefaults());
    const secondStamp = loadDefaults().savedAt;
    expect(new Date(secondStamp).getTime()).toBeGreaterThan(new Date(firstStamp).getTime());
  });

  it('resets a single section to built-in values', () => {
    saveDefaults({
      ...builtInDefaults(),
      catalog: { url: 'https://x', mode: 'extend', autoRefreshHours: 1 },
      telemetry: { optedIn: true, versionCheck: false },
    });
    const after = resetDefaultsSection('catalog');
    expect(after.catalog.url).toBe('');
    expect(after.catalog.mode).toBe('replace');
    expect(after.catalog.autoRefreshHours).toBe(24);
    // Other sections untouched
    expect(after.telemetry.versionCheck).toBe(false);
    expect(after.telemetry.optedIn).toBe(true);
  });

  it('writes the defaults file with readable JSON', () => {
    saveDefaults(builtInDefaults());
    const raw = readFileSync(getDefaultsPath(), 'utf-8');
    expect(raw).toMatch(/"version": 1/);
    expect(raw.endsWith('\n')).toBe(true);
  });
});
