import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  addSource,
  listAllSources,
  readTeamSources,
  readUserSources,
  removeSource,
  setSourceEnabled,
} from '../../src/recommender/catalog-sources.js';

describe('recommender/catalog-sources — persistence helpers', () => {
  let fakeHome: string;
  let projectRoot: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-cspers-home-'));
    projectRoot = mkdtempSync(join(tmpdir(), 'slaminar-cspers-proj-'));
    mkdirSync(join(projectRoot, '.slaminar'), { recursive: true });
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

  it('addSource persists a user-scope source to defaults.json', () => {
    const src = addSource({
      uri: 'https://tools.example/c.json',
      mode: 'extend',
      scope: 'user',
    });
    expect(src.id.startsWith('user-')).toBe(true);
    const saved = readUserSources();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.uri).toBe('https://tools.example/c.json');
    expect(saved[0]!.priority).toBe(100);
  });

  it('addSource persists a project-scope source to .slaminar/config.json', () => {
    addSource({
      uri: 'https://company.example/c.json',
      mode: 'extend',
      scope: 'project',
      projectRoot,
      id: 'company',
    });
    const saved = readTeamSources(projectRoot);
    expect(saved).toHaveLength(1);
    expect(saved[0]!.id).toBe('company');
    expect(saved[0]!.priority).toBe(200);
  });

  it('re-adding a source with the same uri replaces the earlier entry', () => {
    addSource({ uri: 'https://x.example/c.json', mode: 'extend', scope: 'user', id: 'x-v1' });
    addSource({ uri: 'https://x.example/c.json', mode: 'replace', scope: 'user', id: 'x-v2' });
    const saved = readUserSources();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.id).toBe('x-v2');
    expect(saved[0]!.mode).toBe('replace');
  });

  it('removeSource deletes by id OR uri and returns false on miss', () => {
    addSource({ uri: 'https://a.example/c.json', mode: 'extend', scope: 'user', id: 'a' });
    addSource({ uri: 'https://b.example/c.json', mode: 'extend', scope: 'user', id: 'b' });
    expect(removeSource({ identifier: 'a', scope: 'user' })).toBe(true);
    expect(readUserSources()).toHaveLength(1);
    expect(removeSource({ identifier: 'https://b.example/c.json', scope: 'user' })).toBe(true);
    expect(readUserSources()).toHaveLength(0);
    expect(removeSource({ identifier: 'ghost', scope: 'user' })).toBe(false);
  });

  it('setSourceEnabled toggles enabled flag and reports whether state changed', () => {
    addSource({ uri: 'https://x.example/c.json', mode: 'extend', scope: 'user', id: 'x' });
    // Adding already sets enabled=true — a no-op "enable" returns false.
    expect(setSourceEnabled('x', true, 'user')).toBe(false);
    expect(setSourceEnabled('x', false, 'user')).toBe(true);
    expect(readUserSources()[0]!.enabled).toBe(false);
  });

  it('project scope requires projectRoot and rejects calls without it', () => {
    expect(() =>
      addSource({ uri: 'https://x.example/c.json', mode: 'extend', scope: 'project' }),
    ).toThrow(/projectRoot/);
  });

  it('listAllSources includes bundled + official alongside user/project entries', () => {
    addSource({ uri: 'https://u.example/c.json', mode: 'extend', scope: 'user', id: 'u' });
    addSource({ uri: 'https://p.example/c.json', mode: 'extend', scope: 'project', projectRoot, id: 'p' });
    const all = listAllSources(projectRoot);
    const ids = all.map((s) => s.id);
    expect(ids).toContain('bundled');
    expect(ids).toContain('official');
    expect(ids).toContain('u');
    expect(ids).toContain('p');
    // CLI adhoc is intentionally excluded from list.
    expect(ids).not.toContain('cli-adhoc');
  });
});
