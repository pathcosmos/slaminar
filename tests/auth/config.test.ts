import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadAuthConfig, saveAuthConfig, clearAuthConfig, getAuthFilePath, getActiveAuth } from '../../src/auth/config.js';
import type { AuthConfig } from '../../src/auth/config.js';

describe('auth/config', () => {
  let tmpHome: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tmpHome = mkdtempSync(join(tmpdir(), 'slaminar-auth-'));
    originalXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tmpHome;
  });

  afterEach(() => {
    if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalXdg;
    try { rmSync(tmpHome, { recursive: true }); } catch { /* skip */ }
  });

  it('returns null when no config file exists', () => {
    expect(loadAuthConfig()).toBeNull();
  });

  it('saves and loads config roundtrip', () => {
    const config: AuthConfig = {
      version: 1,
      active: 'cloudflare',
      providers: {
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'cfut_test',
          model: '@cf/meta/llama-3.3-70b',
        },
      },
      savedAt: new Date().toISOString(),
    };
    const path = saveAuthConfig(config);
    expect(existsSync(path)).toBe(true);
    const loaded = loadAuthConfig();
    expect(loaded).toEqual(config);
  });

  it('writes file with 0600 permissions on POSIX', () => {
    const config: AuthConfig = {
      version: 1,
      active: null,
      providers: {},
      savedAt: new Date().toISOString(),
    };
    const path = saveAuthConfig(config);
    const stat = statSync(path);
    // On POSIX systems, check permission mode. Windows skips this.
    if (process.platform !== 'win32') {
      const mode = stat.mode & 0o777;
      expect(mode).toBe(0o600);
    }
  });

  it('returns active provider config via getActiveAuth', () => {
    const config: AuthConfig = {
      version: 1,
      active: 'cloudflare',
      providers: {
        cloudflare: { accountId: 'a', apiToken: 't', model: 'm' },
      },
      savedAt: '',
    };
    const active = getActiveAuth(config);
    expect(active).toEqual({ accountId: 'a', apiToken: 't', model: 'm' });
  });

  it('returns null when active is null', () => {
    const config: AuthConfig = {
      version: 1,
      active: null,
      providers: { cloudflare: { accountId: 'a', apiToken: 't', model: 'm' } },
      savedAt: '',
    };
    expect(getActiveAuth(config)).toBeNull();
  });

  it('clearAuthConfig removes file', () => {
    const config: AuthConfig = {
      version: 1, active: null, providers: {}, savedAt: '',
    };
    saveAuthConfig(config);
    expect(existsSync(getAuthFilePath())).toBe(true);
    expect(clearAuthConfig()).toBe(true);
    expect(existsSync(getAuthFilePath())).toBe(false);
  });

  it('clearAuthConfig returns false when no file exists', () => {
    expect(clearAuthConfig()).toBe(false);
  });

  it('uses XDG_CONFIG_HOME when set', () => {
    process.env.XDG_CONFIG_HOME = tmpHome;
    const path = getAuthFilePath();
    expect(path).toContain(tmpHome);
    expect(path).toContain('slaminar');
    expect(path).toContain('auth.json');
  });

  it('handles corrupt JSON gracefully', () => {
    const config: AuthConfig = { version: 1, active: null, providers: {}, savedAt: '' };
    const path = saveAuthConfig(config);
    // Corrupt the file
    const { writeFileSync } = require('node:fs');
    writeFileSync(path, 'not valid json{{{', 'utf-8');
    expect(loadAuthConfig()).toBeNull();
  });
});
