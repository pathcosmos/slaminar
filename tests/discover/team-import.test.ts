import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectTeamConfig, importTeamCatalog } from '../../src/discover/team-import.js';
import { loadDefaults, saveDefaults, builtInDefaults } from '../../src/setup/defaults.js';
import { saveTeamConfig } from '../../src/team/config.js';

describe('discover/team-import', () => {
  let fakeHome: string;
  let projectRoot: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-team-import-home-'));
    projectRoot = mkdtempSync(join(tmpdir(), 'slaminar-team-import-proj-'));
    savedEnv = { HOME: process.env.HOME, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
    process.env.HOME = fakeHome;
    process.env.XDG_CONFIG_HOME = join(fakeHome, '.config');
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
    rmSync(projectRoot, { recursive: true, force: true });
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('returns null when the project has no .slaminar/config.json', () => {
    expect(detectTeamConfig(projectRoot)).toBeNull();
  });

  it('returns null when the team config has no custom catalogUrl', () => {
    mkdirSync(join(projectRoot, '.slaminar'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.slaminar', 'config.json'),
      JSON.stringify({ slaminarVersion: '0.6.0', catalogUrl: '', catalogMode: 'replace' }),
      'utf-8',
    );
    expect(detectTeamConfig(projectRoot)).toBeNull();
  });

  it('returns null when the team URL matches the user default', () => {
    saveDefaults({
      ...builtInDefaults(),
      catalog: { url: 'https://tools.team.example/catalog.json', mode: 'extend', autoRefreshHours: 24 },
    });
    saveTeamConfig(projectRoot, {
      slaminarVersion: '0.6.0',
      excludeAuthTools: true,
      fileCountCap: 10000,
      approvedTools: [],
      catalogVersion: '',
      catalogUrl: 'https://tools.team.example/catalog.json',
      catalogMode: 'extend',
    });
    expect(detectTeamConfig(projectRoot)).toBeNull();
  });

  it('flags first-import when user has no catalog URL', () => {
    saveTeamConfig(projectRoot, {
      slaminarVersion: '0.6.0',
      excludeAuthTools: true,
      fileCountCap: 10000,
      approvedTools: [],
      catalogVersion: '',
      catalogUrl: 'https://tools.team.example/catalog.json',
      catalogMode: 'extend',
    });
    const candidate = detectTeamConfig(projectRoot);
    expect(candidate).not.toBeNull();
    expect(candidate!.reason).toBe('first-import');
    expect(candidate!.projectRoot).toBe(projectRoot);
  });

  it('flags different-url when user already has a different default', () => {
    saveDefaults({
      ...builtInDefaults(),
      catalog: { url: 'https://old.example/catalog.json', mode: 'replace', autoRefreshHours: 24 },
    });
    saveTeamConfig(projectRoot, {
      slaminarVersion: '0.6.0',
      excludeAuthTools: true,
      fileCountCap: 10000,
      approvedTools: [],
      catalogVersion: '',
      catalogUrl: 'https://new.example/catalog.json',
      catalogMode: 'replace',
    });
    const candidate = detectTeamConfig(projectRoot);
    expect(candidate!.reason).toBe('different-url');
  });

  it('importTeamCatalog writes the team URL/mode into defaults.json', () => {
    saveTeamConfig(projectRoot, {
      slaminarVersion: '0.6.0',
      excludeAuthTools: true,
      fileCountCap: 10000,
      approvedTools: [],
      catalogVersion: '',
      catalogUrl: 'https://imported.example/catalog.json',
      catalogMode: 'extend',
    });
    const candidate = detectTeamConfig(projectRoot)!;
    const result = importTeamCatalog(candidate);
    expect(result.imported).toBe(true);
    expect(result.newUrl).toBe('https://imported.example/catalog.json');

    const d = loadDefaults();
    expect(d.catalog.url).toBe('https://imported.example/catalog.json');
    expect(d.catalog.mode).toBe('extend');
  });
});
